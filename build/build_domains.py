#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把旧 168 课 + 新写的域1/域2/补充条目，组装成「域 → 块 → 条目」结构。

输出 build/domains.json，供页面构建使用。
不修改任何原始数据文件。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return json.load(f)


OLD = load("old_course.json")
RD = load("old_rd.json")
NEW_EXTRA = load("new_extra.json")

BY_DAY = {c["d"]: c for c in OLD}


def old_item(day, item_id):
    """把旧课转成新条目结构。"""
    c = BY_DAY[day]
    rd = RD.get(str(day)) or []
    # 原文优先用 RD（含白话与提示），旧课 quote 是 [出处, 原文] 两元素数组
    quotes = []
    if rd:
        for seg in rd:
            quotes.append({
                "s": seg.get("s", ""),
                "src": seg.get("src", ""),
                "tr": seg.get("tr", ""),
                "tip": seg.get("tip", ""),
            })
    else:
        q = c.get("quote") or []
        if len(q) >= 2:
            quotes.append({"s": q[1], "src": q[0], "tr": "", "tip": ""})
        elif len(q) == 1:
            quotes.append({"s": q[0], "src": "", "tr": "", "tip": ""})

    quiz = []
    for q in c.get("q", []):
        quiz.append({
            "q": q.get("q", ""),
            "opts": q.get("o", []),
            "a": q.get("a", 0),
            "why": q.get("e", ""),
            "src": "",
        })

    item = {
        "id": item_id,
        "title": c["t"],
        "mins": c.get("min", 50),
        "goal": c.get("goal", ""),
        "quote": quotes,
        "pts": c.get("pts", []),
        "task": c.get("task", ""),
        "quiz": quiz,
        "read": c.get("read", ""),
        "note": c.get("note", ""),
    }
    comp = c.get("composite")
    if comp:
        item["composite"] = comp
    return item


def block(bid, name, note, items):
    return {"id": bid, "name": name, "note": note, "items": items}


def build_domain3():
    d = NEW_EXTRA["d3_new"]
    items = [old_item(day, "3-%d" % (i + 1)) for i, day in enumerate(range(43, 50))]
    return {
        "id": "d3",
        "name": "辨证",
        "sub": "从四诊材料到证名",
        "intro": "四诊给你一堆材料，辨证是把它们收成一个名字。这一域先学八纲——性质；再学脏腑——位置；最后看三套框架怎么分工。证名一旦定错，后面本草方剂全白学，所以这一域宁可慢。",
        "color": "rose",
        "blocks": [
            block("d3-b1", "八纲", "表里、寒热、虚实、阴阳。四对坐标，八个字，是所有辨证的通用底座。", items),
            block("d3-b2", "落到脏腑与框架", "八纲只给性质不给位置。这一块把性质落到具体的脏，并理清三套框架的分工。", d),
        ],
    }


def build_domain4():
    spec = [
        ("d4-b1", "药性总论", "四气五味、升降浮沉、归经、配伍禁忌。这一块是后面所有具体药物的语法。", 50, 53),
        ("d4-b2", "解表 · 清热 · 泻下祛湿", "外感与里热的两条主线，加上攻下与祛湿。药性最讲方向的一组。", 54, 63),
        ("d4-b3", "温里 · 理气 · 活血止血", "寒、气、血三条线。理气与活血是最容易混用的一组，要盯住「气滞」与「血瘀」的区别。", 64, 69),
        ("d4-b4", "化痰安神 · 补益 · 收涩", "痰、神、虚、滑四条线。补益药最容易自学乱吃，这里只学性味功效，不记剂量。", 70, 79),
    ]
    blocks = []
    n = 1
    for bid, name, note, a, b in spec:
        items = [old_item(day, "4-%d" % (n + i)) for i, day in enumerate(range(a, b + 1))]
        n += len(items)
        blocks.append(block(bid, name, note, items))
    return {
        "id": "d4",
        "name": "本草",
        "sub": "药性与配伍",
        "intro": "这一域不背剂量，只学「这味药往哪个方向走、解决什么问题」。药性学到了，看方剂才看得懂君臣佐使；药性没学，方剂只能死记。全程守一条线：只记性味归经与功效，不记用量，不给用药建议。",
        "color": "green",
        "blocks": blocks,
    }


def build_domain5():
    spec = [
        ("d5-b1", "方剂总论", "君臣佐使、七情和合、剂型服法。方剂的语法在这，不在具体方子里。", 80, 84),
        ("d5-b2", "解表和解 · 清热泻下", "四类最常用的方。重点看「和解」为什么是半表半里的唯一出路。", 85, 92),
        ("d5-b3", "温里补益 · 理气理血 · 祛湿祛痰", "内伤杂病的主战场。这一块方多，按「证的寒热虚实」分组记，不要按方名首字记。", 93, 102),
        ("d5-b4", "治风治燥消食驱虫 · 闭卷复盘", "收尾三小类，加一次闭卷方解复盘。复盘比新学重要。", 103, 105),
    ]
    blocks = []
    n = 1
    for bid, name, note, a, b in spec:
        items = [old_item(day, "5-%d" % (n + i)) for i, day in enumerate(range(a, b + 1))]
        n += len(items)
        blocks.append(block(bid, name, note, items))
    return {
        "id": "d5",
        "name": "方剂",
        "sub": "方证与方义",
        "intro": "学方剂只有一个原则：方随证立。记方名不记证，等于没学。这一域按「证」把方归堆，不按方名首字归堆。剂量一律不记，用法不给建议。",
        "color": "blue",
        "blocks": blocks,
    }


def build_domain6():
    spec = [
        ("d6-b1", "伤寒论导读与太阳病", "校读方法 + 太阳病上中下三篇。全书最重的一块，占十六讲。", 106, 121),
        ("d6-b2", "阳明 · 少阳 · 太阴", "三经。阳明看「里实热」，少阳看「半表半里」，太阴看「里虚寒」，三者的分界是这一块的主线。", 122, 130),
        ("d6-b3", "少阴 · 厥阴 · 金匮选篇", "少阴的寒化热化是全书最难处，厥阴看寒热错杂。接《金匮》从外感转入杂病。", 131, 141),
        ("d6-b4", "内经选篇 · 温病条辨", "从《伤寒》转《内经》的理论源头，再转温病的另一套坐标系。", 142, 147),
    ]
    blocks = []
    n = 1
    for bid, name, note, a, b in spec:
        items = [old_item(day, "6-%d" % (n + i)) for i, day in enumerate(range(a, b + 1))]
        n += len(items)
        blocks.append(block(bid, name, note, items))
    return {
        "id": "d6",
        "name": "经典",
        "sub": "条文与医家",
        "intro": "这一域读原书，不读二手概括。方法是：一条一条读，先校字，再释义，最后问「这条在全书里解决什么问题」。四十二讲看着多，但每一讲只处理一小段，比通读快。",
        "color": "violet",
        "blocks": blocks,
    }


def build_domain7():
    items = [old_item(day, "7-%d" % (i + 1)) for i, day in enumerate(range(148, 153))]
    return {
        "id": "d7",
        "name": "临证",
        "sub": "条文互见与医案",
        "intro": "前六域都是拆开学的，这一域把它们合起来。先看同一方在不同条文里的用法差异，再学怎么读一则医案。这里不给诊疗建议，只练「看懂别人怎么判断」。",
        "color": "teal",
        "blocks": [
            block("d7-b1", "方证辨析", "同一方在不同条文下治不同的证。差异处就是立方本意。", items),
            block("d7-b2", "医案读法", "四步拆解法 + 一个方三处用法的实例。读案不是抄方。", NEW_EXTRA["d7_new"]),
        ],
    }


def build_domain8():
    spec = [
        ("d8-b1", "词义与概念辨析", "「证/症/候」「阳气」这些词在不同注本里意思不同。词义不清，读什么都是糊的。", 153, 160),
        ("d8-b2", "版本与校读", "宋本与桂林古本的异文。这一块教的是「不轻信单一版本」的习惯。", 161, 164),
        ("d8-b3", "成文与自检", "把学过的东西写成一篇能站住的文字，再用标准自查一遍。", 165, 168),
    ]
    blocks = []
    n = 1
    for bid, name, note, a, b in spec:
        items = [old_item(day, "8-%d" % (n + i)) for i, day in enumerate(range(a, b + 1))]
        n += len(items)
        blocks.append(block(bid, name, note, items))
    return {
        "id": "d8",
        "name": "专题与输出",
        "sub": "词义、版本、成文",
        "intro": "最后一域不是新知识，是把前面七个域串起来的三件事：把词义抠清、把版本核对、把想法写成文字。写不出来，说明前面还有没通的地方。",
        "color": "amber",
        "blocks": blocks,
    }


def main():
    d1 = load("domain1.json")
    d2 = load("domain2a.json")
    # domain2b / domain2c 是单块结构（含 id/name/note/items），直接当块用
    d2["blocks"].append(load("domain2b.json"))
    d2["blocks"].append(load("domain2c.json"))

    domains = [d1, d2, build_domain3(), build_domain4(), build_domain5(),
               build_domain6(), build_domain7(), build_domain8()]

    total = sum(len(b["items"]) for d in domains for b in d["blocks"])
    for d in domains:
        n = sum(len(b["items"]) for b in d["blocks"])
        print("%-16s %2d 块 %3d 条" % (d["name"], len(d["blocks"]), n))
    print("合计 %d 条" % total)

    out = {"version": "2.0.0", "domains": domains}
    with open(os.path.join(HERE, "domains.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("写入 build/domains.json")


if __name__ == "__main__":
    main()
