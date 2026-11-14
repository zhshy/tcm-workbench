#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""加工 build/domains.json：

1. 全部条目补齐「6 道单选 + 1 道综合辨析」（旧版规定）；
2. 复用旧课的条目加大经典原文与要点：从补编语料按出处补 2 段原文（自带白话），
   并从旧课 note/read 补 3 条要点；
3. 每段原文计算书库跳转参数（book/q），未命中则退到篇名检索；
4. 断言：所有条目 6+1、所有原文有白话。

输出覆盖 build/domains.json。可重复运行（幂等）。
"""
import json
import os
import re
import hashlib
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def load(p):
    with open(os.path.join(HERE, p), encoding="utf-8") as f:
        return json.load(f)


DATA = load("domains.json")
DOMAINS = DATA["domains"]
OLD = {c["d"]: c for c in load("old_course.json")}
EXTRA = load("classic_extra.json")
SUP = load("thin_supplement.json")
LIB = load("../library/index.json")["items"]
BY_TITLE = {x["title"]: x["file"] for x in LIB}
WORK_ID_BY_TITLE = {x["title"]: x.get("work_id", "") for x in LIB}

# 引文原书不在 32 部书库里时，不能假装有「这一段」的深链。
# 改跳到主题相关的库内典籍 + 可命中的检索词，并在前端标注「原书未入书库」。
OUTSIDE = {
    "尚书": ("黄帝内经素问", "五行"),
    "临证验舌法": ("黄帝内经素问", "心主舌"),
    "辨舌指南": ("温热论", "验之于舌"),
    "景岳全书": ("医宗金鉴", "问寒热"),
    "顾氏医镜": ("医学心悟", "大实有羸状"),
    "儒门事亲": ("本草正义", "十八反"),
    "医学源流论": ("医方集解", "方之"),
    "小儿药证直诀": ("医宗金鉴", "地黄丸"),
    "古今医案按": ("医方集解", "医案"),
    "说文解字": ("医宗金鉴", "证候"),
}


ALIAS = {
    "素问": "黄帝内经素问", "内经": "黄帝内经素问", "灵枢": "黄帝内经灵枢",
    "伤寒论": "伤寒论", "伤寒": "伤寒论", "金匮": "金匮要略", "金匮要略": "金匮要略",
    "难经": "难经", "脉经": "脉经", "濒湖脉学": "濒湖脉学", "诊家枢要": "诊家枢要",
    "神农本草经": "神农本草经", "本经": "神农本草经", "温病条辨": "温病条辨",
    "温热论": "温热论", "脾胃论": "脾胃论", "诸病源候论": "诸病源候论",
    "医宗金鉴": "医宗金鉴", "丹溪心法": "丹溪心法", "医林改错": "医林改错",
    "医学心悟": "医学心悟", "汤头歌诀": "汤头歌诀", "温疫论": "温疫论",
    "湿热病篇": "湿热病篇", "温热经纬": "温热经纬", "本草纲目": "本草纲目",
    "本草备要": "本草备要", "医方集解": "医方集解", "针灸大成": "针灸大成",
    "针灸甲乙经": "针灸甲乙经", "甲乙经": "针灸甲乙经", "傅青主女科": "傅青主女科",
    "医学衷中参西录": "医学衷中参西录", "外科正宗": "外科正宗",
    "成方切用": "成方切用", "本草正义": "本草正义", "本草纲目拾遗": "本草纲目拾遗",
}

_TEXT_CACHE = {}


def norm(s):
    return re.sub(r"\s+", "", str(s or ""))


def book_of(src):
    s = str(src or "").replace("《", "").replace("》", "·")
    for part in re.split(r"[·卷第条（(]", s):
        part = part.strip()
        if part in ALIAS:
            return ALIAS[part]
        if part in BY_TITLE:
            return part
    for k, v in ALIAS.items():
        if k in str(src or ""):
            return v
    return None


def lib_text(title):
    if title not in _TEXT_CACHE:
        fn = BY_TITLE.get(title)
        p = os.path.join(ROOT, "library", fn) if fn else ""
        _TEXT_CACHE[title] = norm(open(p, encoding="utf-8", errors="ignore").read()) if fn and os.path.isfile(p) else ""
    return _TEXT_CACHE[title]


def chapter_of(src):
    s = str(src or "")
    m = re.search(r"·([^·》]+)", s)
    if m:
        return m.group(1).strip()
    m = re.search(r"《([^》]+)》", s)
    return m.group(1).strip() if m else ""


def link_for(src, raw):
    """返回书籍、检索词、匹配状态、方法和实际匹配片段。"""
    title = book_of(src)
    if not title:
        return "", "", "unmatched", "no_book_mapping", ""
    txt = lib_text(title)
    clean = norm(raw)
    if not txt or not clean:
        return title, "", "unmatched", "empty_text", ""
    # 只有整段规范化文本连续存在于底本中，才能记为 exact。
    if clean in txt:
        return title, raw.strip()[:40], "exact", "normalized_full_text", raw
    # 前缀命中和内部片段命中一律只能记为 fragment。
    for n in (16, 12, 10, 8, 6, 5, 4):
        if len(clean) >= n and clean[:n] in txt:
            return title, clean[:n], "fragment", "prefix_fragment", clean[:n]
    for n in (12, 10, 8, 6, 4):
        if len(clean) < n:
            continue
        for i in range(0, len(clean) - n + 1, 2):
            frag = clean[i:i + n]
            if frag in txt:
                return title, frag, "fragment", "internal_fragment", frag
    chap = chapter_of(src)
    if chap and norm(chap) in txt:
        return title, chap, "chapter", "chapter_name", chap
    return title, "", "unmatched", "no_reliable_anchor", ""

# ---------- 1. 原文与要点扩写 ----------
all_items = []
ITEM_CONTEXT = {}
for d in DOMAINS:
    for b in d["blocks"]:
        for it in b["items"]:
            all_items.append(it)
            ITEM_CONTEXT[it["id"]] = " ".join([
                d.get("name", ""), b.get("name", ""), it.get("title", ""),
                it.get("goal", ""), " ".join(it.get("topic_tags", [])),
                " ".join(it.get("knowledge_ids", [])),
                " ".join(it.get("pts", [])),
            ])

extra_pool = {}
for bk, arr in EXTRA.items():
    if bk.startswith("_"):
        continue
    extra_pool[bk] = [dict(x, _book=bk) for x in arr]
 
GENERIC_TAGS = {"基础", "总纲", "校读", "理论", "经典", "学习", "辨析", "知识", "方法"}

def topic_score(it, segment, primary_book):
    """按知识标签和条目上下文计算相关性；仅主出处作为低权重兜底。"""
    context = ITEM_CONTEXT.get(it["id"], "")
    item_ids = set(it.get("knowledge_ids", []))
    supporting = set(segment.get("supporting_knowledge_ids", []))
    score = 12 if supporting and item_ids.intersection(supporting) else 0
    matched = []
    for tag in segment.get("tags", []):
        if tag in GENERIC_TAGS or len(tag) < 2:
            continue
        if tag in context:
            matched.append(tag)
    score += min(len(matched), 4) * 2
    if segment.get("_book") == primary_book:
        score += 1
    return score, matched


usage = collections.Counter()
expanded_q = 0
expanded_p = 0

for it in all_items:
    iid = it["id"]
    # 手写条目（四诊/辨证/临证）原先偏薄，按条目定向补足原文与要点。
    # sup 标记 + pts 去重保证重复运行不叠加。
    if iid in SUP and not any(q.get("sup") for q in it.get("quote", [])):
        it["quote"].extend([dict(q, sup=True) for q in SUP[iid]["quote"]])
        cur_pts = list(it.get("pts", []))
        cur_pts += [p for p in SUP[iid]["pts"] if p not in cur_pts]
        it["pts"] = cur_pts
    # 新写的筑基/四诊条目本身已大幅加长，不再灌补编
    is_new = ("read" not in it and "note" not in it)
    if not is_new:
        books = [book_of(q.get("src", "")) for q in it.get("quote", [])]
        books = [b for b in books if b]
        primary = collections.Counter(books).most_common(1)[0][0] if books else None
        existing = {norm(q.get("s", ""))[:12] for q in it.get("quote", [])}
        # 依据知识主题而非书籍遍历顺序选择补编段落。
        ranked = []
        for bk, segments in extra_pool.items():
            for seg in segments:
                score, matched_tags = topic_score(it, seg, primary)
                if score > 0:
                    ranked.append((score, bk, seg, matched_tags))
        ranked.sort(key=lambda row: (-row[0], row[1], row[2].get("s", "")))
        # 幂等：已补过的 ext 段计入配额；同一段全课程最多复用 3 次。
        added = sum(1 for q in it.get("quote", []) if q.get("ext") and not q.get("sup"))
        for score, bk, seg, matched_tags in ranked:
            if added >= 2:
                break
            key = norm(seg["s"])[:12]
            if key in existing or usage[key] >= 3:
                continue
            it["quote"].append({
                "s": seg["s"], "src": seg["src"], "tr": seg["tr"],
                "tip": seg["tip"], "ext": True,
                "topic_score": score, "matched_tags": matched_tags,
                "supporting_knowledge_ids": seg.get("supporting_knowledge_ids", []),
            })
            existing.add(key)
            usage[key] += 1
            added += 1
            expanded_q += 1
        # 要点：从旧课 note / read / 新补原文派生 3 条
        pts = list(it.get("pts", []))
        note = str(it.get("note", "")).strip()
        read = str(it.get("read", "")).strip()
        if note and not any("本讲注" in p for p in pts):
            pts.append("本讲注｜" + note)
        if read and not any("教材对应" in p for p in pts):
            pts.append("教材对应｜" + read + "（参读只作对照，不替代原书。）")
        exts = [q for q in it["quote"] if q.get("ext")]
        if exts and not any("原文互见" in p for p in pts):
            names = "、".join(dict.fromkeys(q["src"] for q in exts))
            pts.append("原文互见｜本讲另附 " + str(len(exts)) + " 段原文（" + names + "），"
                       "读时把它们与本讲要点逐条对上：哪一句支撑哪一条要点，写不出对应关系就先放着。")
        if len(pts) > len(it.get("pts", [])):
            expanded_p += 1
        it["pts"] = pts

    # 要点下限 8 条：不足时补一条可核对的出处清单（按前缀去重，保证幂等）
    pts = list(it.get("pts", []))
    if len(pts) < 8 and not any("出处清单" in p for p in pts):
        srcs = list(dict.fromkeys(
            str(q.get("src", "")).strip() for q in it.get("quote", []) if q.get("src")
        ))
        if srcs:
            pts.append("出处清单｜本讲 " + str(len(it.get("quote", []))) + " 段原文分别出" +
                       "、".join(srcs[:6]) + ("等" if len(srcs) > 6 else "") +
                       "；逐段点开原文卡片下的书库链接回原书核读，别只记白话。")
    it["pts"] = pts

# ---------- 2. 给全部原文加书库跳转 ----------
linked = 0
exact = 0
outside = 0
match_counts = collections.Counter()
for it in all_items:
    for q in it.get("quote", []):
        bk, kw, status, method, matched_text = link_for(q.get("src", ""), q.get("s", ""))
        is_outside = False
        if status == "unmatched":
            src = str(q.get("src", ""))
            for key, (rel, term) in OUTSIDE.items():
                if key in src and rel in BY_TITLE:
                    bk, kw, status, method, matched_text, is_outside = rel, term, "outside", "related_reference", term, True
                    break
        q.pop("outside", None)
        q["match_status"] = status
        q["match_method"] = method
        q["match_text"] = matched_text
        q["hit"] = status == "exact"
        q["book"] = bk or ""
        q["file"] = BY_TITLE.get(bk, "") if status != "unmatched" else ""
        q["work_id"] = WORK_ID_BY_TITLE.get(bk, "") if status != "unmatched" else ""
        q["q"] = kw if status != "unmatched" else ""
        if is_outside:
            q["outside"] = True
        if q["file"]:
            linked += 1
        if status == "exact":
            exact += 1
        if status == "outside":
            outside += 1
        match_counts[status] += 1

# ---------- 3. 补齐 6+1 ----------
def pick(rng_key, arr, n, exclude=()):
    """稳定伪随机取 n 个不重复元素。"""
    out = []
    if not arr:
        return out
    for i in range(len(arr) * 3):
        h = hashlib.md5((rng_key + "#" + str(i)).encode("utf-8")).hexdigest()
        j = int(h[:8], 16) % len(arr)
        v = arr[j]
        if v not in out and v not in exclude and v:
            out.append(v)
        if len(out) >= n:
            break
    return out


ALL_TR = list(dict.fromkeys(
    q["tr"] for it in all_items for q in it.get("quote", []) if q.get("tr") and len(q["tr"]) > 12
))
ALL_PTS = list(dict.fromkeys(
    p for it in all_items for p in it.get("pts", []) if len(p) > 20
))
ALL_SRC = list(dict.fromkeys(
    q["src"] for it in all_items for q in it.get("quote", []) if q.get("src")
))
ALL_TITLE = list(dict.fromkeys(it["title"] for it in all_items))

filled_quiz = 0
filled_comp = 0

for it in all_items:
    iid = it["id"]
    quiz = it.get("quiz") or []
    quotes = [q for q in it.get("quote", []) if q.get("s")]
    pts = [p for p in it.get("pts", []) if len(p) > 15]

    while len(quiz) < 6:
        n = len(quiz)
        key = iid + "-gen" + str(n)
        if n == 3 and quotes:
            q0 = quotes[0]
            stem = "「" + q0["s"][:26] + ("…" if len(q0["s"]) > 26 else "") + "」的白话理解，正确的是："
            right = q0.get("tr") or "（本句白话见条目原文卡片）"
            wrong = pick(key, ALL_TR, 3, exclude=(right,))
            opts = [right] + wrong
            why = "该句出" + (q0.get("src") or "本讲原文") + "，白话附在原文卡片中，可点开对照。"
        elif n == 4 and pts:
            right = pts[0]
            stem = "下列哪一项是本讲明确列出的学习要点？"
            wrong = pick(key, ALL_PTS, 3, exclude=(right,))
            opts = [right] + wrong
            why = "该项直接列于本讲「要点」，其余三项出自其他条目，不能替代本讲的明确表述。"
        elif n == 5 and quotes:
            q1 = quotes[min(1, len(quotes) - 1)]
            stem = "「" + q1["s"][:24] + ("…" if len(q1["s"]) > 24 else "") + "」出自："
            right = q1.get("src") or "本讲原文"
            wrong = pick(key, ALL_SRC, 3, exclude=(right,))
            opts = [right] + wrong
            why = "原文卡片已标出处；点击「在书库中查看此段」可回到原书核读。"
        else:
            right = it.get("goal", "") or it["title"]
            stem = "本讲的学习目标是："
            wrong = pick(key, [x["goal"] for x in all_items if x.get("goal") and x["goal"] != right], 3)
            opts = [right] + wrong
            why = "目标写在条目页顶部，其余三项是其他条目的目标。"

        # 补足 4 个选项（干扰项池不足时用同域其他表述兜底），再稳定地打乱答案位置
        pool = [p for p in ALL_PTS if p != right] or ["以上皆非本讲内容"]
        while len(opts) < 4:
            opts.append(pool[(len(opts) * 7 + len(iid)) % len(pool)])
        opts = opts[:4]
        h = int(hashlib.md5(key.encode("utf-8")).hexdigest()[:8], 16)
        pos = h % 4
        if pos != 0:
            opts[0], opts[pos] = opts[pos], opts[0]
        quiz.append({
            "q": stem, "opts": opts, "a": pos,
            "why": why, "src": "本讲内容", "gen": True,
        })
        filled_quiz += 1

    it["quiz"] = quiz[:6]

    # 记录题目来源与审核状态。机器生成题默认为草稿，人工编写题也不冒充已审核。
    for qi, question in enumerate(it["quiz"], 1):
        question.setdefault("id", "%s-Q%02d" % (iid, qi))
        origin = "generated" if question.get("gen") else "manual"
        question.setdefault("question_origin", origin)
        question.setdefault("review_status", "draft" if origin == "generated" else "pending_review")
        question.setdefault("knowledge_ids", it.get("knowledge_ids") or [iid])
        question.setdefault("source_refs", [question["src"]] if question.get("src") else [])
        question.setdefault("source_status", "needs_manual_source_review" if not question.get("source_refs") else "source_label_not_independently_verified")
        question.setdefault("difficulty", "basic")
        question.setdefault("cognitive_level", "unclassified")

    if not it.get("composite"):
        material = []
        for q in quotes[:2]:
            material.append("【" + (q.get("src") or "本讲原文") + "】\n" + q["s"] +
                            ("\n白话：" + q["tr"] if q.get("tr") else "") +
                            ("\n校读提示：" + q["tip"] if q.get("tip") else ""))
        stim = "\n\n".join(material) if material else it.get("goal", "")
        subs = []
        if pts:
            p0 = pts[0]
            subs.append({
                "q": "结合材料与本讲要点，判断下列表述是否属于本讲明确列出的要点：" + p0[:90],
                "o": ["不属于本讲明确要点", "属于本讲明确要点"], "a": 1,
                "e": "该表述直接列于本讲「要点」，材料亦与之相应。",
            })
            wrongp = pick(iid + "-c", ALL_PTS, 1, exclude=tuple(pts))
            if wrongp:
                subs.append({
                    "q": "下列哪一项并非本讲明确列出的要点，而是从其他条目移来的表述？",
                    "o": [p0[:90], wrongp[0][:90]], "a": 1,
                    "e": "该项出自其他条目；综合题考的是能否把材料与本讲要点对上，而不是泛泛的印象。",
                })
        if quotes:
            q0 = quotes[0]
            subs.append({
                "q": "材料中最早一段原文的正确白话理解是：",
                "o": [q0.get("tr") or "（见原文卡片白话）"] +
                     pick(iid + "-c2", ALL_TR, 1, exclude=(q0.get("tr"),)),
                "a": 0, "e": "白话附在原文卡片中；另一项取自其他条目原文，出处与文义皆不合。",
            })
            subs.append({
                "q": "若要核对材料所引文字，最稳妥的做法是：",
                "o": ["只凭白话转述判定", "点原文卡片上的书库链接，回原书该篇逐字核读"],
                "a": 1, "e": "读选本与节引，先回底本校字再释义；书库链接已按出处定位到该段。",
            })
        for s in subs:
            while len(s["o"]) < 2:
                s["o"].append("以上表述皆不合本讲材料")
        it["composite"] = {
            "id": iid + "-Q07",
            "title": "材料与课程要点综合辨析",
            "stimulus": {"title": "本讲经典材料", "text": stim},
            "items": subs[:4],
            "question_origin": "generated",
            "review_status": "draft",
        }
        filled_comp += 1

    comp = it.get("composite") or {}
    comp.setdefault("id", iid + "-Q07")
    comp.setdefault("question_origin", "generated" if comp.get("review_status") == "draft" else "manual")
    comp.setdefault("review_status", "pending_review")
    for si, sub in enumerate(comp.get("items", []), 1):
        sub.setdefault("id", "%s-Q07-%02d" % (iid, si))
        sub.setdefault("question_origin", comp["question_origin"])
        sub.setdefault("review_status", comp["review_status"])
        sub.setdefault("knowledge_ids", it.get("knowledge_ids") or [iid])
        sub.setdefault("source_refs", [])
        sub.setdefault("source_status", "needs_manual_source_review")
    it["composite"] = comp

# ---------- 4. 断言 ----------
bad_q = [it["id"] for it in all_items if len(it.get("quiz", [])) != 6]
bad_c = [it["id"] for it in all_items if not (it.get("composite") or {}).get("items")]
bad_tr = [(it["id"], i) for it in all_items for i, q in enumerate(it.get("quote", [])) if not q.get("tr")]
bad_link = [(it["id"], i) for it in all_items for i, q in enumerate(it.get("quote", [])) if q.get("match_status") != "unmatched" and not q.get("file")]
bad_match = [(it["id"], i) for it in all_items for i, q in enumerate(it.get("quote", [])) if q.get("match_status") not in {"exact", "fragment", "chapter", "outside", "unmatched"}]
bad_hit = [(it["id"], i) for it in all_items for i, q in enumerate(it.get("quote", [])) if bool(q.get("hit")) != (q.get("match_status") == "exact")]
assert not bad_q, "仍有条目不是 6 道单选：" + str(bad_q[:8])
assert not bad_c, "仍有条目缺综合题：" + str(bad_c[:8])
assert not bad_tr, "仍有原文缺白话：" + str(bad_tr[:8])
assert not bad_link, "仍有需定位的原文缺书库文件：" + str(bad_link[:8])
assert not bad_match, "原文匹配状态无效：" + str(bad_match[:8])
assert not bad_hit, "hit 字段与匹配状态不一致：" + str(bad_hit[:8])

DATA["version"] = "2.2.0"
with open(os.path.join(HERE, "domains.json"), "w", encoding="utf-8") as f:
    json.dump(DATA, f, ensure_ascii=False, separators=(",", ":"))

print("条目 %d；补原文 %d 段，补要点 %d 条" % (
    len(all_items), expanded_q, expanded_p))
print("原文匹配状态：%s；含定位链接 %d 段；精确命中 %d 段；库外参读 %d 段" % (
    dict(match_counts), linked, exact, outside))
print("原文总数 %d" % sum(len(it["quote"]) for it in all_items))
print("补单选 %d 题，补综合题 %d 组；全部条目 6+1，原文白话 100%%" % (filled_quiz, filled_comp))
print("域/块/条目：%d / %d / %d" % (
    len(DOMAINS), sum(len(d["blocks"]) for d in DOMAINS), len(all_items)))
