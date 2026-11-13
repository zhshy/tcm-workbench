#!/usr/bin/env python3
"""Push the TCM workbench to GitHub via the Git Data API (git protocol is blocked here).

Usage: GH_TOKEN=... python3 ghpush_tcm.py [repo_name]
"""
import base64
import concurrent.futures
import hashlib
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path("/Users/iptv/WorkBuddy/2026-11-13-13-44-58/tcm-workbench")
REPO = sys.argv[1] if len(sys.argv) > 1 else "tcm-workbench"
TOKEN = os.environ.get("GH_TOKEN", "").strip()
EXCLUDE_DIRS = {"skills", ".git"}
EXCLUDE_NAMES = {".DS_Store"}
API = "https://api.github.com"


def req(method, path, body=None, timeout=180, raw=False):
    url = API + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "workbuddy-tcm-push")
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            payload = resp.read()
            return resp.status, (payload if raw else json.loads(payload or b"{}"))
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            parsed = json.loads(payload or b"{}")
        except Exception:
            parsed = {"raw": payload[:300].decode("utf-8", "replace")}
        return e.code, parsed


def blob_sha(data):
    h = hashlib.sha1()
    h.update(b"blob " + str(len(data)).encode() + b"\0")
    h.update(data)
    return h.hexdigest()


def collect():
    files = {}
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        if p.name in EXCLUDE_NAMES or p.name.endswith(".tar.gz"):
            continue
        files[rel.as_posix()] = p
    return files


def main():
    if not TOKEN:
        print("ERROR: GH_TOKEN 未设置")
        return 2

    code, me = req("GET", "/user")
    if code != 200:
        print("ERROR: 令牌无效 ->", code, me.get("message"))
        return 2
    owner = me["login"]
    print(f"账号: {owner}")

    code, repo = req("GET", f"/repos/{owner}/{REPO}")
    if code == 404:
        print(f"仓库 {owner}/{REPO} 不存在，创建中…")
        code, repo = req("POST", "/user/repos", {
            "name": REPO,
            "description": "中医学习工作台：六阶段路径、公版古籍资料库、学习卡片与提问模板",
            "private": False, "has_issues": True, "has_wiki": False, "auto_init": False,
        })
        if code not in (200, 201):
            print("ERROR: 建仓库失败 ->", code, repo.get("message"))
            return 2
        print("仓库已创建（空仓库，需要先播种一次提交）")
    elif code != 200:
        print("ERROR: 查询仓库失败 ->", code, repo.get("message"))
        return 2
    else:
        print("仓库已存在，增量推送")

    # 1) 取分支与基点
    branch, base_commit, base_tree, remote_tree = None, None, None, {}
    for b in ("main", "master"):
        c, ref = req("GET", f"/repos/{owner}/{REPO}/git/ref/heads/{b}")
        if c == 200:
            branch = b
            base_commit = ref["object"]["sha"]
            break
    if branch is None:
        # 空仓库：播种一次提交
        c, seed = req("PUT", f"/repos/{owner}/{REPO}/contents/.bootstrap",
                      {"message": "chore: bootstrap", "content": base64.b64encode(b"bootstrap\n").decode()})
        if c not in (200, 201):
            print("ERROR: 播种失败 ->", c, seed.get("message"))
            return 2
        for b in ("main", "master"):
            c, ref = req("GET", f"/repos/{owner}/{REPO}/git/ref/heads/{b}")
            if c == 200:
                branch, base_commit = b, ref["object"]["sha"]
                break
        print(f"已播种首次提交，分支 {branch}")

    if base_commit:
        c, commit = req("GET", f"/repos/{owner}/{REPO}/git/commits/{base_commit}")
        if c == 200:
            base_tree = commit["tree"]["sha"]
            tcode, tdata = req("GET", f"/repos/{owner}/{REPO}/git/trees/{base_tree}?recursive=1")
            if tcode == 200:
                remote_tree = {e["path"]: e["sha"] for e in tdata.get("tree", []) if e["type"] == "blob"}

    # 2) 差分
    files = collect()
    local = {}
    for rel, p in files.items():
        data = p.read_bytes()
        local[rel] = (data, blob_sha(data))
    to_upload = {k: v for k, v in local.items() if remote_tree.get(k) != v[1]}
    print(f"本地 {len(local)} 个文件，需上传 {len(to_upload)} 个（{sum(len(v[0]) for v in to_upload.values())/1024/1024:.1f} MB）")

    # 3) 建 blobs
    shas = {}
    done = [0]

    def upload(item):
        rel, (data, sha) = item
        c, res = req("POST", f"/repos/{owner}/{REPO}/git/blobs",
                     {"content": base64.b64encode(data).decode(), "encoding": "base64"})
        if c not in (200, 201):
            raise RuntimeError(f"{rel}: HTTP {c} {res.get('message')}")
        done[0] += 1
        if done[0] % 8 == 0 or done[0] == len(to_upload):
            print(f"  blob {done[0]}/{len(to_upload)}")
        return rel, res["sha"]

    if to_upload:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for rel, sha in pool.map(upload, to_upload.items()):
                shas[rel] = sha

    # 4) 建 tree（base_tree 保留远端其它文件；空仓库播种文件不保留）
    payload = {"tree": [{"path": k, "mode": "100644", "type": "blob", "sha": v[1]} for k, v in local.items()]}
    if base_tree and (set(remote_tree) - {".bootstrap"}):
        payload["base_tree"] = base_tree
    c, tree = req("POST", f"/repos/{owner}/{REPO}/git/trees", payload)
    if c not in (200, 201):
        print("ERROR: 建 tree 失败 ->", c, tree.get("message"))
        return 2

    # 5) 提交
    body = {"message": "feat: 中医学习工作台（六阶段路径 + 公版古籍库 + 学习卡片）",
            "tree": tree["sha"],
            "author": {"name": "zhshy", "email": "zhshy@users.noreply.github.com"},
            "committer": {"name": "zhshy", "email": "zhshy@users.noreply.github.com"}}
    if base_commit:
        body["parents"] = [base_commit]
    c, commit = req("POST", f"/repos/{owner}/{REPO}/git/commits", body)
    if c not in (200, 201):
        print("ERROR: 建提交失败 ->", c, commit.get("message"))
        return 2
    print("提交:", commit["sha"][:10])

    # 6) 移动分支
    c, ref = req("PATCH", f"/repos/{owner}/{REPO}/git/refs/heads/{branch}", {"sha": commit["sha"], "force": False})
    if c != 200:
        print("ERROR: 更新分支失败 ->", c, ref.get("message"))
        return 2
    print(f"分支 {branch} -> {commit['sha'][:10]}")

    # 7) 开启 Pages
    c, pages = req("POST", f"/repos/{owner}/{REPO}/pages", {"source": {"branch": branch, "path": "/"}})
    if c in (200, 201):
        print("Pages 已启用:", pages.get("html_url"))
    elif c == 409:
        c2, pages2 = req("PUT", f"/repos/{owner}/{REPO}/pages", {"source": {"branch": branch, "path": "/"}})
        print("Pages 已存在，更新源 ->", c2, pages2.get("html_url") or pages2.get("message"))
    else:
        print("WARN: Pages 开启失败 ->", c, pages.get("message"))

    # 8) 回验：重新取远端树逐文件比对
    time.sleep(2)
    c, tdata = req("GET", f"/repos/{owner}/{REPO}/git/trees/{branch}?recursive=1")
    remote_after = {e["path"]: e["sha"] for e in tdata.get("tree", []) if e["type"] == "blob"} if c == 200 else {}
    mismatch = [k for k, (_, sha) in local.items() if remote_after.get(k) != sha]
    extra = [k for k in remote_after if k not in local]
    print(f"回验：远端 {len(remote_after)} 文件，本地 {len(local)}，不一致 {len(mismatch)}，远端多出 {len(extra)}")
    if mismatch:
        print("  不一致:", mismatch[:5])
    if extra:
        print("  多出:", extra[:5])

    url = f"https://{owner}.github.io/{REPO}/"
    print("页面地址（首次构建需 1–3 分钟）:", url)
    print("仓库地址:", f"https://github.com/{owner}/{REPO}")
    return 0 if not mismatch else 1


if __name__ == "__main__":
    sys.exit(main())
