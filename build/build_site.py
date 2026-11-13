#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 build/domains.json 注入 build/app_template.html，生成根目录 index.html。

用法：python build/build_site.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main():
    with open(os.path.join(HERE, "domains.json"), encoding="utf-8") as f:
        data = json.load(f)
    with open(os.path.join(HERE, "app_template.html"), encoding="utf-8") as f:
        tpl = f.read()

    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # 防止提前闭合 script 标签，也避免 U+2028/2029 破坏 JS 字面量
    raw = raw.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

    out = tpl.replace("/*__DATA__*/ null", raw)
    if out == tpl:
        raise SystemExit("数据占位符未找到，注入失败")

    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(out)

    size = len(out.encode("utf-8"))
    print("生成 index.html  %.0f KB" % (size / 1024))
    total = sum(len(b["items"]) for d in data["domains"] for b in d["blocks"])
    print("域 %d / 块 %d / 条目 %d" % (
        len(data["domains"]),
        sum(len(d["blocks"]) for d in data["domains"]),
        total,
    ))


if __name__ == "__main__":
    main()
