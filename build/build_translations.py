#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成书库白话译本：library/白话/<书名>.txt，并把 tr/trType 写进 library/index.json。

内容来源：
- trans_core.json：《诊家枢要》《濒湖脉学》全本逐篇／逐脉白话译解；
- trans_guides.json：其余 30 部的导读与框架（《脉经》《伤寒论》为节译框架）；
- build/domains.json：工作台引用到该书的所有原文段落，自动附上「原文—白话—校读」对照。

译本类型如实标注，不把导读冒充全译。
"""
import json
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIB = os.path.join(ROOT, "library")
OUT = os.path.join(LIB, "白话")


def load(p):
    with open(os.path.join(HERE, p), encoding="utf-8") as f:
        return json.load(f)


core = load("trans_core.json")
guides = load("trans_guides.json")
guides.pop("_note", None)
all_tr = dict(guides)
all_tr.update(core)

domains = load("domains.json")["domains"]

# 按书名归集工作台引用段落（去重，保留出处与白话）
quotes = collections.defaultdict(list)
seen = collections.defaultdict(set)
for d in domains:
    for b in d["blocks"]:
        for it in b["items"]:
            for q in it.get("quote", []):
                bk = q.get("book")
                if not bk or not q.get("s") or not q.get("tr"):
                    continue
                key = q["s"][:24]
                if key in seen[bk]:
                    continue
                seen[bk].add(key)
                quotes[bk].append({
                    "src": q.get("src", ""), "s": q["s"], "tr": q["tr"],
                    "tip": q.get("tip", ""), "q": q.get("q", ""),
                    "item": it["id"], "title": it["title"],
                })

with open(os.path.join(LIB, "index.json"), encoding="utf-8") as f:
    index = json.load(f)

os.makedirs(OUT, exist_ok=True)

TYPE_LABEL = {
    "全本逐篇白话译解": "全本逐篇译解",
    "全本逐脉白话译解": "全本逐脉译解",
    "节译本（全书框架＋引用段落对照）": "框架节译",
    "节译本（六经框架＋引用段落对照）": "框架节译",
    "白话导读（附引用段落对照）": "白话导读",
}

missing = []
written = []
for rec in index["items"]:
    title = rec["title"]
    if title not in all_tr:
        missing.append(title)
        continue
    spec = all_tr[title]
    tp = spec["type"]
    lines = []
    lines.append("书名：" + title + " · 白话译本")
    lines.append("译本类型：" + tp)
    lines.append("原著：" + rec.get("era", "") + " · " + rec.get("author", "佚名"))
    lines.append("分类：" + rec.get("cat", ""))
    lines.append("原书：library/" + rec["file"])
    lines.append("")
    lines.append("────────────────────────────────────────")
    lines.append("【译本说明】")
    lines.append(spec["intro"])
    lines.append("")
    lines.append("【全书白话导读 / 逐篇译解】")
    lines.append("")
    for i, sec in enumerate(spec["sections"], 1):
        lines.append("── " + sec["t"] + " ──")
        lines.append("")
        lines.append("白话：" + sec["tr"])
        lines.append("")
        if sec.get("note"):
            lines.append("读法：" + sec["note"])
            lines.append("")
    # 引用段落对照
    qs = quotes.get(title, [])
    lines.append("────────────────────────────────────────")
    lines.append("【工作台引用段落 · 原文／白话对照】")
    lines.append("共 " + str(len(qs)) + " 段。每段均可在原书中检索定位；点击条目页原文卡片上的书库链接即可跳到该段。")
    lines.append("")
    for i, q in enumerate(qs, 1):
        lines.append("〔" + str(i) + "〕" + (q["src"] or "出处未标"))
        lines.append("原文：" + q["s"])
        lines.append("白话：" + q["tr"])
        if q["tip"]:
            lines.append("校读：" + q["tip"])
        lines.append("对应条目：" + q["item"] + " " + q["title"] +
                     ("　｜　原书检索词：" + q["q"] if q["q"] else "　｜　本段未在该版本检出，请回原书按篇名查阅"))
        lines.append("")
    core_note = ("本译本为全本逐篇／逐脉白话译解，覆盖原书全部篇目，"
                 "但以篇旨与关键文句的白话串讲为主，不是逐字对译，不能替代原书。") if tp.startswith("全本") else (
                 "本译本为节译／导读，未覆盖原书逐字全文。")

    lines.append("────────────────────────────────────────")
    lines.append("【使用与边界】")
    lines.append(core_note + "点阅读器顶部的「原文」按钮可切回原书逐句核读；引用宜以原书与所用教材为准。")
    lines.append("本工作台只做知识整理与文本研读，不提供诊断、不开方、不给剂量。")
    lines.append("")

    fn = title + ".txt"
    with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    rec["tr"] = "白话/" + fn
    rec["trType"] = TYPE_LABEL.get(tp, "白话导读")
    rec["trSections"] = len(spec["sections"])
    rec["trQuotes"] = len(qs)
    written.append((title, rec["trType"], len(qs), len("\n".join(lines))))

index["translation_note"] = (
    "白话译本按书标注类型：全本逐篇／逐脉译解（覆盖全书篇目，篇旨串讲，非逐字对译）、"
    "框架节译（卷目框架＋工作台引用段落对照）、白话导读（成书体例与核心概念白话＋引用段落对照）。"
    "核心四部为《诊家枢要》《濒湖脉学》《脉经》《伤寒论》，本轮已交付前两部全本译解与后两部框架节译，"
    "逐字全译待后续补齐。译本不冒充全译。"
)
index["updated"] = "2026-11-14"
with open(os.path.join(LIB, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=1)

print("生成译本 %d 部；缺导读 %d 部：%s" % (len(written), len(missing), missing))
for t, tp, n, size in written:
    print("  %-16s %-12s 引用段 %3d  %6d 字" % (t, tp, n, size))
print("总引用段落", sum(q for _, _, q, _ in written))
