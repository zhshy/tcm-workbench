#!/usr/bin/env python3
"""Safely publish the TCM Workbench through the GitHub Git Data API.
Default mode is read-only dry-run. Pass --apply to create a commit.
Set GH_TOKEN locally; never put tokens in source files or command history.
"""
from __future__ import annotations
import argparse, base64, hashlib, json, os, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("TCM_ROOT", Path(__file__).resolve().parents[1])).resolve()
API = "https://api.github.com"
DEFAULT_REPO = "zhshy/tcm-workbench"
ALLOWED_TOP_LEVEL = {
    ".github", "assets", "data", "docs", "library", "library-page", "tests",
    "resources", "tools", "index.html", "service-worker.js", "package.json",
    "v1-96天版.html", "README.md", "CHANGELOG.md", "VERSION", ".gitignore",
    ".nojekyll", "manifest.json", "TCM-CURRICULUM-IMPROVEMENT.md",
}
EXCLUDED_PARTS = {
    ".git", ".venv", "venv", "__pycache__", ".pytest_cache", "node_modules",
    "skills", ".cache", "coverage", "dist", "build",
}
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db", ".env", ".env.local", ".env.production"}
SENSITIVE_NAMES = {"token.txt", "token.json", ".token", "gh_token", "github_token", "credentials.json"}
SENSITIVE_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".sqlite", ".db", ".log", ".bak"}


def collect(root: Path = ROOT) -> dict[str, Path]:
    root = Path(root).resolve()
    if not root.is_dir() or not (root / "README.md").is_file() or not (root / "index.html").is_file():
        raise RuntimeError(f"不是有效的 TCM Workbench 仓库根目录：{root}")
    files: dict[str, Path] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        parts = rel.parts
        if not parts or parts[0] not in ALLOWED_TOP_LEVEL:
            continue
        if any(part in EXCLUDED_PARTS for part in parts):
            continue
        name = path.name.lower()
        if name in EXCLUDED_NAMES or name.startswith(".env.") or name in SENSITIVE_NAMES:
            continue
        if path.suffix.lower() in SENSITIVE_SUFFIXES:
            continue
        if any(marker in name for marker in ("secret", "credential", "access-token", "github-token")):
            continue
        files[rel.as_posix()] = path
    return files


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def request(token: str, method: str, path: str, body: dict | None = None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "tcm-workbench-safe-publisher")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            raw = response.read()
            return response.status, json.loads(raw or b"{}")
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            payload = json.loads(raw or b"{}")
        except Exception:
            payload = {"message": raw[:300].decode("utf-8", "replace")}
        return error.code, payload


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="TCM Workbench 安全发布工具（默认 dry-run）")
    parser.add_argument("--repo", default=os.environ.get("GH_REPO", DEFAULT_REPO), help="owner/repo")
    parser.add_argument("--message", default="chore: publish TCM Workbench")
    parser.add_argument("--apply", action="store_true", help="确认执行远端写入；不传时只 dry-run")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    if "/" not in args.repo or args.repo.count("/") != 1:
        print("ERROR: --repo 必须是 owner/repo")
        return 2
    try:
        files = collect(ROOT)
    except RuntimeError as error:
        print(f"ERROR: {error}")
        return 2
    local, total_bytes = {}, 0
    for rel, path in files.items():
        data = path.read_bytes()
        local[rel] = (data, blob_sha(data))
        total_bytes += len(data)
    print(f"仓库目录：{ROOT}")
    print(f"目标仓库：{args.repo}")
    print(f"发布清单：{len(local)} 个文件，{total_bytes / 1024 / 1024:.2f} MiB")
    for rel in local:
        print(f"  {rel}")
    print("安全排除：本地技能目录、依赖目录、环境变量文件和密钥/数据库文件")
    print("同步语义：仅新增/更新白名单文件；不删除远端多余文件，不自动创建仓库或更改 Pages 设置。")
    if not args.apply:
        print("DRY-RUN：本模式仅检查本地白名单清单，不读取或写入远端。")
        return 0
    token = os.environ.get("GH_TOKEN", "").strip()
    if not token:
        print("ERROR: --apply 需要在本机环境变量中设置 GH_TOKEN。")
        return 2
    owner, repo_name = args.repo.split("/", 1)
    code, repo_info = request(token, "GET", f"/repos/{owner}/{repo_name}")
    if code != 200 or repo_info.get("full_name", "").lower() != args.repo.lower():
        print(f"ERROR: 目标仓库不可访问或不匹配（HTTP {code}）：{repo_info.get('message', '')}")
        return 2
    branch, base_commit = None, None
    for candidate in ("main", "master"):
        code, ref = request(token, "GET", f"/repos/{owner}/{repo_name}/git/ref/heads/{candidate}")
        if code == 200:
            branch, base_commit = candidate, ref["object"]["sha"]
            break
    if not branch:
        print("ERROR: 找不到 main/master 分支；不会自动创建分支或仓库。")
        return 2
    code, commit = request(token, "GET", f"/repos/{owner}/{repo_name}/git/commits/{base_commit}")
    if code != 200:
        print("ERROR: 无法读取当前提交。")
        return 2
    base_tree = commit["tree"]["sha"]
    code, tree_data = request(token, "GET", f"/repos/{owner}/{repo_name}/git/trees/{base_tree}?recursive=1")
    if code != 200 or tree_data.get("truncated"):
        print("ERROR: 远端文件树读取失败或被截断，停止发布。")
        return 2
    remote = {entry["path"]: entry["sha"] for entry in tree_data.get("tree", []) if entry.get("type") == "blob"}
    changed = {name: item for name, item in local.items() if remote.get(name) != item[1]}
    print(f"远端差异：{len(changed)} 个文件需要新增/更新。")
    if not changed:
        print("远端已与本地白名单文件一致，无需提交。")
        return 0
    tree_entries = []
    for name, (data, _) in changed.items():
        code, blob = request(token, "POST", f"/repos/{owner}/{repo_name}/git/blobs", {
            "content": base64.b64encode(data).decode("ascii"), "encoding": "base64",
        })
        if code not in (200, 201):
            print(f"ERROR: 上传 {name} 失败（HTTP {code}）：{blob.get('message', '')}")
            return 2
        tree_entries.append({"path": name, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    code, tree = request(token, "POST", f"/repos/{owner}/{repo_name}/git/trees", {
        "base_tree": base_tree, "tree": tree_entries,
    })
    if code not in (200, 201):
        print(f"ERROR: 创建 tree 失败：{tree.get('message', '')}")
        return 2
    code, new_commit = request(token, "POST", f"/repos/{owner}/{repo_name}/git/commits", {
        "message": args.message, "tree": tree["sha"], "parents": [base_commit],
    })
    if code not in (200, 201):
        print(f"ERROR: 创建提交失败：{new_commit.get('message', '')}")
        return 2
    code, latest_ref = request(token, "GET", f"/repos/{owner}/{repo_name}/git/ref/heads/{branch}")
    if code != 200 or latest_ref["object"]["sha"] != base_commit:
        print("ERROR: 上传期间远端分支已变化；提交对象已创建但未移动分支，请检查后重试。")
        return 2
    code, updated = request(token, "PATCH", f"/repos/{owner}/{repo_name}/git/refs/heads/{branch}", {
        "sha": new_commit["sha"], "force": False,
    })
    if code != 200:
        print(f"ERROR: 更新分支失败：{updated.get('message', '')}")
        return 2
    code, after = request(token, "GET", f"/repos/{owner}/{repo_name}/git/trees/{new_commit['sha']}?recursive=1")
    if code != 200 or after.get("truncated"):
        print("WARN: 已提交，但回验读取失败；请在 GitHub 检查提交。")
        return 1
    after_map = {entry["path"]: entry["sha"] for entry in after.get("tree", []) if entry.get("type") == "blob"}
    mismatches = [name for name, (_, sha) in local.items() if after_map.get(name) != sha]
    if mismatches:
        print("ERROR: 提交后回验不一致：" + ", ".join(mismatches[:10]))
        return 1
    print(f"发布成功：{new_commit['sha']}")
    print(f"GitHub Pages（若仓库已启用 Pages）将在 main 更新后自动构建：https://{owner}.github.io/{repo_name}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
