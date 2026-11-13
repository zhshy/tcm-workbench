import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("safe_publisher", ROOT / "tools" / "push_to_github.py")
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

class SafePublisherTests(unittest.TestCase):
    def test_collect_uses_allowlist_and_excludes_private_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("README.md", "index.html", "manifest.json", "unlisted.txt", ".env", "token.txt"):
                (root / name).write_text("x", encoding="utf-8")
            (root / "docs").mkdir()
            (root / "docs" / "guide.md").write_text("x", encoding="utf-8")
            (root / "docs" / "token.txt").write_text("x", encoding="utf-8")
            (root / "library" / "_external").mkdir(parents=True)
            (root / "library" / "_external" / "third-party.txt").write_text("x", encoding="utf-8")
            (root / "library").mkdir(exist_ok=True)
            (root / "library" / "public.txt").write_text("x", encoding="utf-8")
            (root / "skills").mkdir()
            (root / "skills" / "private.md").write_text("x", encoding="utf-8")
            (root / "tests").mkdir()
            (root / "tests" / "test_sample.py").write_text("x", encoding="utf-8")
            (root / "service-worker.js").write_text("x", encoding="utf-8")
            (root / "package.json").write_text("{}", encoding="utf-8")
            found = set(publisher.collect(root))
            self.assertEqual(found, {"README.md", "index.html", "manifest.json", "docs/guide.md",
                                     "library/public.txt", "library/_external/third-party.txt", "tests/test_sample.py",
                                     "service-worker.js", "package.json"})
    def test_default_mode_is_read_only(self):
        args = publisher.parse_args([])
        self.assertFalse(args.apply)
        self.assertEqual(args.repo, "zhshy/tcm-workbench")
    def test_apply_requires_explicit_flag(self):
        self.assertTrue(publisher.parse_args(["--apply"]).apply)
    def test_no_absolute_developer_path(self):
        source = (ROOT / "tools" / "push_to_github.py").read_text(encoding="utf-8")
        self.assertNotIn("/Users/iptv/", source)

if __name__ == "__main__":
    unittest.main()
