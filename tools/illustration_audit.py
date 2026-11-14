# -*- coding: utf-8 -*-
"""
学习内容配图需求审查（只读，不改动工作台数据）。

输入：build/domains.json、library/index.json
输出：docs/配图需求统计.md、docs/配图需求清单.csv、docs/配图需求看板.html

评级口径
  P0 必需：形态、颜色、空间位置、动态波形、多节点流程——文字无法替代，不配图容易学错。
  P1 建议：课后任务已明确要求作图/制表，且标准答案有校核价值；建议给「空白模板 + 折叠答案图」。
  P2 可选：文字与表格已够用，配图为锦上添花，主要是可打印模板。
  P3 不宜：训诂、版本校读、写作方法等纯文字思辨，配图无收益甚至干扰。

P0 与 P3 为逐条人工判定（显式清单），其余按课后任务关键词规则归类，全部结果可复现。
"""
import csv
import json
import os
import re
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")

# ---------------------------------------------------------------- P0 人工判定
# id -> (图型, 理由, 母图组)
P0 = {
    "1-1":  ("关系结构图", "整体观念的同心圈：内核五脏气血、外圈四时昼夜地域，层次关系纯文字说不清", "M11"),
    "1-5":  ("关系结构图", "五行生克环与归类表，相生相克的顺序靠箭头才不会混", "M4"),
    "1-6":  ("关系结构图", "相乘相侮、母病及子、子病犯母都是方向问题，必须有传变箭头", "M4"),
    "1-9":  ("流程图", "《经脉别论》饮入于胃→脾→肺→膀胱→三焦，五节点流程用文字极绕", "M3"),
    "1-12": ("流程图", "气生成—分类流水线：肾精/水谷/清气 → 元气/宗气/营气/卫气", "M3"),
    "1-13": ("流程图", "津液输布排泄八节点（胃脾肺三焦肾膀胱肝大肠），与 1-9 同源", "M3"),
    "1-15": ("空间定位图", "十二经脉循行走向、交接与流注次序，是纯空间知识", "M5"),
    "1-16": ("空间定位图", "奇经八脉循行；「十二经如江河、奇经如湖泽」需要图才立得住", "M5"),
    "2-1":  ("形态色卡图谱", "得神/少神/失神/假神是面部神态差异，文字无法替代视觉对照", "M9"),
    "2-2":  ("形态色卡图谱", "五色主病必须彩色色卡，且要把「色」与「泽」分开呈现", "M9"),
    "2-3":  ("形态色卡图谱", "舌质与舌苔图谱（舌色 5 种、苔色 3 种、形质各 4 种），全库最刚需", "M9"),
    "2-8":  ("空间定位图", "寸关尺六部配脏腑 + 浮中沉三候，手腕上的空间定位", "M1"),
    "2-9":  ("波形动态示意", "五脏平脉的菽重深度梯度与指下质地，是深浅手感不是文字", "M1"),
    "2-10": ("波形动态示意", "四时脉弦洪浮沉的波形变化 + 肥瘦体型对照", "M2"),
    "2-11": ("空间定位图", "布指疏密（臂长疏下指）、举按寻三种指力，是手势动作", "M1"),
    "2-12": ("波形动态示意", "浮沉迟数滑涩六脉波形组图，脉学提纲的核心可视化", "M2"),
    "2-13": ("空间定位图", "上病下病、左病右病，需直接标在六部定位图上", "M1"),
    "2-14": ("波形动态示意", "有神/无神、数极迟败而中取无力的脉力对比", "M2"),
    "3-1":  ("坐标矩阵", "八纲 2×2×2 立方：表里 × 寒热 × 虚实，空间结构", "M6"),
    "4-2":  ("坐标矩阵", "归经与升降浮沉的十字坐标，药性趋向是空间隐喻", "M7"),
    "4-14": ("流程图", "利水渗湿的水液代谢图：脾、肺、肾三个关口", "M3"),
    "4-16": ("空间定位图", "胸、胁、脘腹、少腹四段人体横线与理气药定位", "M12"),
    "5-1":  ("关系结构图", "君臣佐使在一首方里的分工结构（以麻黄汤为例）", "M10"),
    "5-22": ("流程图", "胃—脾—肺—膀胱水液路线，四方各对应一站", "M3"),
    "6-1":  ("关系结构图", "宋本、成无己注本、桂林古本、康平本的版本谱系树", "M13"),
    "6-3":  ("层级轴阶梯", "六经提纲与传变层次；图能直观说明「是证不是六个器官」", "M8"),
    "6-36": ("空间定位图", "腰以上汗、腰以下利小便的人体横线图", "M12"),
    "6-38": ("关系结构图", "清阳出上窍、浊阴出下窍等三组升降走向", "M7"),
    "6-40": ("流程图", "饮与食两条并行代谢流程线，需并排才看得出差异", "M3"),
    "6-42": ("层级轴阶梯", "上中下三焦羽、衡、权竖轴与传变次序", "M8"),
    "7-4":  ("坐标矩阵", "有汗—无汗横轴 + 第 63 条「有汗却不用桂枝汤」的例外点", "M6"),
}

# ---------------------------------------------------------------- P3 人工判定
P3 = {
    "6-2": "八栏校读卡是文字记录格式，配图无收益",
    "6-5": "方后注取汗标准是条文字句，用圈点而非插图",
    "6-7": "禁忌清单是条文归纳，配图会弱化「禁用/慎用」的分寸",
    "6-8": "两条条文的字句对照，靠并排抄录而非图像",
    "6-12": "术语卡（消渴、水逆）是训诂辨析",
    "6-21": "少阳提纲三症与禁汗理由属义理阐释",
    "6-24": "「益甚」「四逆辈」「脾家实」字义辨析",
    "6-27": "「急温之」的分寸是时机判断，非空间关系",
    "6-30": "「厥」的定义与字义，属概念辨析",
    "6-32": "「四季脾王」句读与实脾前提，属校读",
    "6-35": "「温药和之」一词两义，属训诂",
    "8-2": "「症」为后起字的书写处理办法，纯文字说明",
    "8-3": "训诂与定义的区别、可操作定义写作",
    "8-4": "五百字词义梳理的段落结构与判断句计数",
    "8-6": "注本比较时该记录什么，属方法约定",
    "8-8": "哲学义与医学定义的中间环节，纯义理",
    "8-10": "异文三类的校记写法",
    "8-11": "待核清单的字段规范",
    "8-12": "校读札记一条一页的写作格式",
    "8-13": "长文四段提纲的写法",
    "8-14": "判断句加括注、遮注法自检",
    "8-15": "知道/不知道两张清单的写作",
}

# ---------------------------------------------------------------- 母图（可复用底图）
MOTHER = {
    "M1": "寸口六部脏腑定位图（含浮中沉三候）",
    "M2": "脉象波形组图（六脉提纲／四时／有神无神）",
    "M3": "水谷水液代谢流程图",
    "M4": "五行生克制化乘侮环",
    "M5": "十二经脉与奇经八脉循行流注图",
    "M6": "八纲与寒热虚实坐标矩阵",
    "M7": "气机升降十字轴",
    "M8": "卫气营血·三焦·六经层级轴",
    "M9": "望神·面色·舌象图谱",
    "M10": "君臣佐使方剂结构图",
    "M11": "整体观念同心圈",
    "M12": "人体分区横线图",
    "M13": "《伤寒论》版本谱系树",
}

# 课后任务里「明确要求作图/制表」的指令。
# 刻意不匹配裸字「表 / 卡 / 线 / 格 / 轴」，否则「表里」「表现」「一条线」会被误算。
MAKE = re.compile(
    # 动作 +（中途允许书名号/引号/量词）+ 产物名词收尾。
    # 收尾匹配保证「表里」「表现」「一条线之外」这类普通词不会被算成制图。
    r"(?:画|做|列|写|默|抄|建|描)[^，。；：!?]{0,24}"
    r"(?:表|卡|图|坐标|轴|格|线|清单|流程|阶梯|矩阵|刻度|路线|链)|"
    r"[一张个条只][表卡图]|"
    r"(?:对照表|对照卡|分布表|归类表|方卡|药卡|术语卡|义项卡|流程图|流程线|"
    r"阶梯图|刻度条|十字轴|竖轴|横轴|纵轴|同心圈|流水线|三岔|分岔)"
)
# 弱可视化线索：出现版面/结构词但未必是明确作图指令
VISUAL = re.compile(
    r"画|描|标出|标上|图示|示意图|流程图|流程线|坐标|横轴|纵轴|竖轴|箭头|阶梯|"
    r"刻度|十字|同心圈|分岔|三岔|路线|流水线|并排|两栏|三栏|四栏|五栏|"
    r"两列|三列|四列|五列|表头|表格|对照表|分布表|归类表|小表|清单|"
    r"卡片|方卡|药卡|术语卡|义项卡|[一张个][表卡图]|"
    r"传变链|推理链|证据链|链：|四角|四周|格：|并排"
)


def guess_shape(task):
    """按课后任务关键词推断建议图型。"""
    t = str(task)
    rules = [
        (r"流程图|流水线|流程线|环节|节点|路线|并行流程", "流程图"),
        (r"阶梯|层级|刻度|三级|三层|竖轴|羽.{0,3}衡|层次", "层级轴阶梯"),
        (r"十字|坐标|横轴|纵轴|四格|2×2|立方|矩阵|四象限", "坐标矩阵"),
        (r"箭头|传变|先后顺序|时间|路径|三岔|分岔", "时间轴路线图"),
        (r"对照|两列|三列|四列|两栏|三栏|四栏|对比卡|表：|表头|行表|小表|清单", "对照表模板"),
        (r"卡片|方卡|药卡|卡：|术语卡|义项卡|分布表|归类表", "卡片模板"),
        (r"画|图示|示意|标出", "结构示意图"),
    ]
    for pat, name in rules:
        if re.search(pat, t):
            return name
    return "对照表模板"


def quote_visual_stats(rows):
    """统计原文中天然适合配图的形态/颜色/比喻语料。"""
    metaphor = re.compile(
        r"如鸡践地|如循|如按|如弹石|如刀|如葱|如絮|如鱼|如燕|如雨|如弦|如钩|"
        r"如毛|如石|如羹|屋漏|雀啄|解索|转豆|虾游|釜沸|涌泉|如浮|如沉|"
        r"如鸡|如狼|如风|如雾|如沤|如渎|状如|若.{0,4}如|譬如|"
        r"如[一二三四五六七八九十]{0,2}菽|如炙脔|如刀刺|如走水|如水流漓|"
        r"声如|脉.{0,4}如[循刀弦钩毛石豆珠盘绳]"
    )
    sense = re.compile(r"舌|苔|面色|五色|目|唇|皮毛|形体|肥|瘦|脉[象形]|指下|举之|按之|寻之")
    n_meta = n_sense = total = 0
    samples = []
    seen = set()
    for _, _, it in rows:
        for q in it.get("quote", []):
            total += 1
            s = q.get("s", "")
            m = bool(metaphor.search(s))
            v = bool(sense.search(s))
            n_meta += m
            n_sense += v
            # 同一段原文常被多条引用，样例按文本去重
            if m and len(samples) < 8 and len(s) < 60 and s not in seen:
                seen.add(s)
                samples.append((it["id"], q.get("src", ""), s))
    return total, n_meta, n_sense, samples


def main():
    with open(os.path.join(ROOT, "build", "domains.json"), encoding="utf-8") as f:
        data = json.load(f)
    with open(os.path.join(ROOT, "library", "index.json"), encoding="utf-8") as f:
        lib = json.load(f)

    rows = []
    for dom in data["domains"]:
        for blk in dom["blocks"]:
            for it in blk["items"]:
                rows.append((dom["name"], blk["name"], it))

    records = []
    for dom_name, blk_name, it in rows:
        iid = it["id"]
        task = str(it.get("task", ""))
        has_visual = bool(VISUAL.search(task + " " + it.get("goal", "")))
        has_make = bool(MAKE.search(task))

        if iid in P0:
            shape, why, mother = P0[iid]
            level, form = "P0 必需", "认知型插图（正文内直接呈现）"
        elif iid in P3:
            shape, why, mother = "不宜配图", P3[iid], ""
            level, form = "P3 不宜", "不配图；保留纯文字任务"
        elif has_make:
            shape, why, mother = guess_shape(task), "课后任务明确要求作图/制表，学生需要空白模板与可校核的标准答案", ""
            level, form = "P1 建议", "空白模板 + 折叠的标准答案图"
        else:
            shape, why, mother = guess_shape(task), "文字已能覆盖，可给可打印表格模板，配图收益有限", ""
            level, form = "P2 可选", "可打印表格模板（可选）"

        # P1/P2 里能通过共享母图解决的，标出复用组
        if not mother:
            t = task + " " + it.get("goal", "") + " " + it["title"]
            if re.search(r"水液|饮入于胃|经脉别论|利水|五苓|水谷|津液", t):
                mother = "M3"
            elif re.search(r"寸口|六部|寸关尺|菽重|举按寻|布指|脉位|寸脉|关脉|尺脉", t):
                mother = "M1"
            elif re.search(r"卫气营血|营分|血分|三焦|六经|传变|羽.{0,3}衡|层级轴|三承气|承气汤", t):
                mother = "M8"
            elif re.search(r"五行|生克|乘侮|肝传脾", t):
                mother = "M4"
            elif re.search(r"八纲|寒热|虚实|表证|里证|寒证|热证|虚证|实证|阴阳总纲|亡阴|亡阳", t):
                mother = "M6"
            elif re.search(r"气机升降|升降浮沉|升降失常|清阳浊阴|升清|降逆", t):
                mother = "M7"
            elif re.search(r"经络|经脉|奇经|流注", t):
                mother = "M5"

        records.append({
            "id": iid, "域": dom_name, "块": blk_name, "标题": it["title"],
            "优先级": level, "建议图型": shape, "母图组": mother,
            "母图名称": MOTHER.get(mother, ""),
            "任务内置作图": "是" if has_make else ("含可视化词" if has_visual else "否"),
            "建议交付形态": form, "判定理由": why,
            "原文段数": len(it.get("quote", [])), "要点条数": len(it.get("pts", [])),
        })

    total = len(records)
    lv = Counter(r["优先级"] for r in records)
    shape_c = Counter(r["建议图型"] for r in records)
    per_dom = defaultdict(Counter)
    for r in records:
        per_dom[r["域"]][r["优先级"]] += 1
        per_dom[r["域"]]["合计"] += 1
    task_c = Counter(r["任务内置作图"] for r in records)
    mother_c = Counter(r["母图组"] for r in records if r["母图组"])
    q_total, q_meta, q_sense, q_samples = quote_visual_stats(rows)

    # ------------------------------------------------------------ CSV
    with open(os.path.join(DOCS, "配图需求清单.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        w.writeheader()
        w.writerows(records)

    # ------------------------------------------------------------ Markdown 报告
    order = ["P0 必需", "P1 建议", "P2 可选", "P3 不宜"]
    L = []
    L.append("# 学习内容配图需求统计")
    L.append("")
    L.append("> 审查对象：`build/domains.json`（v%s，8 域 / 29 块 / %d 条 / %d 段原文）；"
             "书库 %d 部。审查日期：2026-11-14。" %
             (data.get("version", ""), total, q_total, len(lib["items"])))
    L.append("> 本文为只读审查，未改动工作台任何页面或数据。逐条判定由 `tools/illustration_audit.py` 生成，可复现。")
    L.append("")
    L.append("## 一、一句话结论")
    L.append("")
    L.append("**%d 条学习内容里，%d 条（%.1f%%）的课后任务有明确作图/制表指令（「画一张」「做一张表」「列四行」「画流程线」等），"
             "另有 %d 条含可视化线索，合计 %d 条（%.1f%%）；而工作台目前教学插图为 0 张。**" %
             (total, task_c["是"], 100.0 * task_c["是"] / total,
              task_c["含可视化词"], sum(1 for r in records if r["任务内置作图"] != "否"),
              100.0 * sum(1 for r in records if r["任务内置作图"] != "否") / total))
    L.append("统计口径：只认明确指名图/表/卡/坐标/流程的指令，不把「表里」「表现」这类含「表」字的普通词算进来。")
    L.append("")
    L.append("这不是「可以加点图锦上添花」，而是课程设计里已经把绘图当成了主要学习方法，却没有提供任何底图、模板或答案图。"
             "最需要补的是**脉诊与望诊的形态/空间图**，以及一批可复用的母图。")
    L.append("")
    L.append("## 二、当前配图现状")
    L.append("")
    L.append("| 项 | 现状 |")
    L.append("|---|---|")
    L.append("| 页面内联 `<svg>` | 3 处，全部是 16–24px 的 UI 图标，与教学内容无关 |")
    L.append("| 教学插图 / 示意图 / 图谱 / 表格模板 | **0** |")
    L.append("| `assets/` | 仅 3 个 PWA 图标（apple-touch-icon、icon-192、icon-512） |")
    L.append("| `library/_external/` | 178 MB 外部针灸资料包（3206 个文件，含大量 webp 截图），**页面未引用**，不能算课程配图 |")
    L.append("")
    L.append("外部素材包可作为后续素材来源，但需先确认版权与内容相关性，不建议直接拿来当教学图。")
    L.append("")
    L.append("## 三、评级口径")
    L.append("")
    L.append("| 级别 | 定义 | 建议交付 |")
    L.append("|---|---|---|")
    L.append("| **P0 必需** | 形态、颜色、空间位置、动态波形、多节点流程——文字无法替代，不配图容易学错 | 认知型插图，正文内直接呈现 |")
    L.append("| **P1 建议** | 课后任务已明确要求作图/制表，标准答案有校核价值 | 空白模板 + **折叠**的标准答案图 |")
    L.append("| **P2 可选** | 文字与表格已够用，配图收益有限 | 可打印表格模板（可选） |")
    L.append("| **P3 不宜** | 训诂、版本校读、写作方法等纯文字思辨 | 不配图 |")
    L.append("")
    L.append("**一个重要判断：不能把学员要自己画的图全部提前画好。** 这套课的课后任务刻意用「闭卷默画 / 自己列表」做主动回忆，"
             "直接把成品图摆在正文里会破坏这个设计。P1 的正确做法是给空白模板（可打印/可交互填写）+ 折叠的答案图，"
             "学员做完再展开对照；P0 才是应该在正文里直接给的认知型插图。")
    L.append("")
    L.append("## 四、总体分布")
    L.append("")
    L.append("| 优先级 | 条目数 | 占比 |")
    L.append("|---|---:|---:|")
    for k in order:
        L.append("| %s | %d | %.1f%% |" % (k, lv[k], 100.0 * lv[k] / total))
    L.append("| **合计** | **%d** | **100%%** |" % total)
    L.append("")
    L.append("按域交叉：")
    L.append("")
    L.append("| 域 | 条目 | P0 必需 | P1 建议 | P2 可选 | P3 不宜 | 配图需求率(P0+P1) |")
    L.append("|---|---:|---:|---:|---:|---:|---:|")
    for dom in data["domains"]:
        c = per_dom[dom["name"]]
        need = c["P0 必需"] + c["P1 建议"]
        L.append("| %s | %d | %d | %d | %d | %d | %.0f%% |" %
                 (dom["name"], c["合计"], c["P0 必需"], c["P1 建议"], c["P2 可选"],
                  c["P3 不宜"], 100.0 * need / c["合计"]))
    L.append("")
    L.append("按建议图型：")
    L.append("")
    L.append("| 图型 | 条目数 |")
    L.append("|---|---:|")
    for k, v in shape_c.most_common():
        L.append("| %s | %d |" % (k, v))
    L.append("")
    L.append("课后任务可视化程度：")
    L.append("")
    L.append("| 任务文本 | 条目数 |")
    L.append("|---|---:|")
    for k in ("是", "含可视化词", "否"):
        L.append("| %s | %d |" % (k, task_c[k]))
    L.append("")
    hidden = [r for r in records if r["优先级"] == "P0 必需" and r["任务内置作图"] == "否"]
    L.append("**容易被漏掉的隐性缺口**：P0 里有 **%d 条内容本身必须配图，但课后任务并没有要求学员画任何东西**"
             "（%s）。这些条目不会从「任务要画图」的线索里被发现，只能靠内容审读挑出来，"
             "恰恰多是脉诊的手感、波形与定位——学员正在读《诊家枢要》，这一段最容易卡住。" %
             (len(hidden), "、".join("`" + r["id"] + "`" for r in hidden)))
    L.append("")
    L.append("## 五、P0 必配清单（%d 条）" % lv["P0 必需"])
    L.append("")
    L.append("| 条目 | 标题 | 建议图型 | 为什么必须配 | 母图 |")
    L.append("|---|---|---|---|---|")
    for r in records:
        if r["优先级"] == "P0 必需":
            L.append("| `%s` | %s | %s | %s | %s |" %
                     (r["id"], r["标题"], r["建议图型"], r["判定理由"], r["母图组"]))
    L.append("")
    L.append("## 六、母图复用：不用做 %d 张图" % lv["P0 必需"])
    L.append("")
    L.append("P0 的 %d 条需求可收敛到 **%d 张母图**；把 P1/P2 里复用同一底图的条目算进来，"
             "共 %d 条可挂靠母图，平均一张母图服务 %.1f 条。" %
             (lv["P0 必需"], len(MOTHER), sum(mother_c.values()),
              sum(mother_c.values()) / max(1, len(mother_c))))
    L.append("")
    L.append("| 母图 | 名称 | 挂靠条目数 | 主要服务条目 |")
    L.append("|---|---|---:|---|")
    for mid, name in MOTHER.items():
        ids = [r["id"] for r in records if r["母图组"] == mid]
        L.append("| %s | %s | %d | %s |" % (mid, name, len(ids), "、".join(ids[:10]) + ("…" if len(ids) > 10 else "")))
    L.append("")
    top3 = mother_c.most_common(3)
    L.append("复用率最高的三张：" + "、".join("**%s**（%d 条）" % (MOTHER[m], n) for m, n in top3) +
             "。先做这三张，能覆盖辨证、本草方剂、经典三个域里反复出现的坐标、流程与层级。")
    L.append("")
    L.append("## 七、原文里天然适合配图的语料")
    L.append("")
    L.append("%d 段原文中，**%d 段（%.1f%%）含具象比喻**（如「和柔相离，如鸡践地」「上焦如雾，中焦如沤，下焦如渎」"
             "「如三菽之重」一类脉形与气化描写），"
             "**%d 段（%.1f%%）直接描述可观察的形态/颜色/指下手感**（舌、苔、面色、肥瘦、举按寻）。"
             "这些段落是配图最自然的锚点，图片可以直接挂在对应原文卡片旁边。" %
             (q_total, q_meta, 100.0 * q_meta / q_total, q_sense, 100.0 * q_sense / q_total))
    L.append("")
    L.append("样例：")
    L.append("")
    for iid, src, s in q_samples:
        L.append("- `%s` %s：%s" % (iid, src, s))
    L.append("")
    L.append("## 八、建议的分批落地顺序")
    L.append("")
    L.append("| 批次 | 内容 | 覆盖 | 理由 |")
    L.append("|---|---|---|---|")
    L.append("| 第一批 | 寸口六部图、脉象波形组图、布指指力示意、舌象图谱、面色/望神色卡 | 四诊域 P0 全 10 条 | 学员当前正在读《诊家枢要》，这一段最依赖视觉；也是全库唯一「不配图会学错」的密集区 |")
    L.append("| 第二批 | 五行生克环、水液代谢流程、十二经循行、八纲立方、气机升降轴 | 筑基 + 辨证 P0 | 复用率高，一张图服务多域 |")
    L.append("| 第三批 | 层级轴（卫气营血/三焦/六经）、版本树、君臣佐使结构、人体分区线 | 方剂 + 经典 P0 | 结构化关系图，SVG 成本低 |")
    L.append("| 第四批 | P1 空白模板 + 折叠答案图（按母图合并，约 %d 套） | 约 %d 条 | 保留「学员自己画」的训练设计 |" %
             (len(MOTHER), lv["P1 建议"]))
    L.append("")
    L.append("## 九、技术与安全约束")
    L.append("")
    L.append("- **优先内联 SVG**，与现有「纯静态、无外部依赖」一致；避免新增图片请求与 CDN。")
    L.append("- **不要用真实舌象/面色照片**：涉及患者肖像与版权，且个体差异常被误当成标准。用标准化彩绘示意 + 明确标注「示意，非诊断依据」。")
    L.append("- **脉象波形是概念示意，不是真实脉搏波**：图上要写「示意」，避免学员把示意图当作波形诊断标准。")
    L.append("- 药材饮片照片本轮**不建议**补：这套课教的是药性与方证，不是中药鉴定，配饮片图会跑偏（本草域 30 条因此多数只判 P1/P2）。")
    L.append("- 每张图加 `alt` 文本与「图源/自绘」标注；折叠答案图默认收起，不破坏闭卷默画。")
    L.append("- 外部 178 MB 素材包须先做版权与相关性核查，不直接引用。")
    L.append("")
    L.append("---")
    L.append("")
    L.append("明细（170 行，含每条的优先级、图型、母图组、任务是否内置作图、判定理由）见 "
             "[`配图需求清单.csv`](配图需求清单.csv)；可视化看板见 [`配图需求看板.html`](配图需求看板.html)。")
    L.append("")
    with open(os.path.join(DOCS, "配图需求统计.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))

    # ------------------------------------------------------------ HTML 看板
    palette = {"P0 必需": "#c0392b", "P1 建议": "#d98324", "P2 可选": "#4a7fb5", "P3 不宜": "#9aa4ae"}
    H = []
    H.append("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">")
    H.append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
    H.append("<title>学习内容配图需求统计 · 中医学习工作台</title>")
    H.append("<style>")
    H.append(""":root{--bg:#f7f8fa;--card:#fff;--ink:#1f2430;--sub:#5c6472;--line:#e3e7ed;--accent:#2f6f5e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1000px;margin:0 auto;padding:36px 22px 64px}h1{font-size:27px;margin:0 0 6px;letter-spacing:.3px}
.lead{color:var(--sub);margin:0 0 26px;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:26px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
.stat b{display:block;font-size:30px;line-height:1.2;color:var(--accent)}.stat span{color:var(--sub);font-size:12.5px}
.stat.warn b{color:#c0392b}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:18px}
h2{font-size:17px;margin:0 0 4px}h2 small{font-weight:400;color:var(--sub);font-size:12.5px;margin-left:8px}
.note{color:var(--sub);font-size:13px;margin:0 0 16px}
.bar{display:flex;height:16px;border-radius:5px;overflow:hidden;background:#eef0f3;margin:8px 0 4px}
.bar i{display:block;height:100%}
.row{display:grid;grid-template-columns:150px 1fr 92px;align-items:center;gap:12px;margin:9px 0;font-size:13px}
.row .nm{color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .pc{text-align:right;color:var(--sub);font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 9px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--sub);font-weight:600;font-size:12.5px;background:#fafbfc}td.id{font-family:ui-monospace,Consolas,monospace;color:var(--accent);white-space:nowrap}
.tag{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11.5px;color:#fff;white-space:nowrap}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--sub);margin-top:12px}
.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}
.scroll{max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:8px}
.scroll table th{position:sticky;top:0;z-index:1}
.foot{color:var(--sub);font-size:12.5px;margin-top:22px}
@media(max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}.row{grid-template-columns:110px 1fr 74px}}
""")
    H.append("</style></head><body><div class=\"wrap\">")
    H.append("<h1>学习内容配图需求统计</h1>")
    H.append("<p class=\"lead\">中医学习工作台 v%s · 8 域 / 29 块 / %d 条 / %d 段原文 · 只读审查，2026-11-14</p>" %
             (data.get("version", ""), total, q_total))
    H.append("<div class=\"stats\">")
    for label, val, warn in [
        ("审查条目", str(total), False),
        ("任务已内置作图", str(sum(1 for r in records if r["任务内置作图"] != "否")), False),
        ("P0 必需配图", str(lv["P0 必需"]), False),
        ("现有教学插图", "0", True),
    ]:
        H.append("<div class=\"stat%s\"><b>%s</b><span>%s</span></div>" % (" warn" if warn else "", val, label))
    H.append("</div>")

    H.append("<section><h2>各域需求分布<small>按条目数堆叠</small></h2>")
    H.append("<p class=\"note\">P0 为不配图容易学错；P1 为任务已要求作图、建议给空白模板 + 折叠答案。</p>")
    for dom in data["domains"]:
        c = per_dom[dom["name"]]
        segs = []
        for k in order:
            pct = 100.0 * c[k] / c["合计"]
            if pct > 0:
                segs.append("<i style=\"width:%.2f%%;background:%s\" title=\"%s %d 条\"></i>" %
                            (pct, palette[k], k, c[k]))
        H.append("<div class=\"row\"><div class=\"nm\">%s（%d）</div><div class=\"bar\">%s</div>" %
                 (dom["name"], c["合计"], "".join(segs)))
        H.append("<div class=\"pc\">P0 %d · P1 %d</div></div>" % (c["P0 必需"], c["P1 建议"]))
    H.append("<div class=\"legend\">")
    for k in order:
        H.append("<span><i style=\"background:%s\"></i>%s %d 条</span>" % (palette[k], k, lv[k]))
    H.append("</div></section>")

    H.append("<section><h2>建议图型分布</h2><table><tr><th>图型</th><th>条目数</th><th>占比</th></tr>")
    for k, v in shape_c.most_common():
        H.append("<tr><td>%s</td><td>%d</td><td>%.1f%%</td></tr>" % (k, v, 100.0 * v / total))
    H.append("</table></section>")

    H.append("<section><h2>母图复用<small>%d 张母图覆盖 %d 条需求</small></h2>" %
             (len(MOTHER), sum(mother_c.values())))
    H.append("<table><tr><th>组</th><th>母图名称</th><th>挂靠条目</th><th>主要条目</th></tr>")
    for mid, name in sorted(MOTHER.items(), key=lambda kv: -mother_c[kv[0]]):
        ids = [r["id"] for r in records if r["母图组"] == mid]
        H.append("<tr><td class=\"id\">%s</td><td>%s</td><td>%d</td><td>%s</td></tr>" %
                 (mid, name, len(ids), "、".join(ids[:8]) + ("…" if len(ids) > 8 else "")))
    H.append("</table></section>")

    H.append("<section><h2>P0 必配清单<small>%d 条</small></h2>" % lv["P0 必需"])
    H.append("<div class=\"scroll\"><table><tr><th>条目</th><th>标题</th><th>图型</th><th>理由</th><th>母图</th></tr>")
    for r in records:
        if r["优先级"] == "P0 必需":
            H.append("<tr><td class=\"id\">%s</td><td>%s</td><td>%s</td><td>%s</td><td class=\"id\">%s</td></tr>" %
                     (r["id"], r["标题"], r["建议图型"], r["判定理由"], r["母图组"]))
    H.append("</table></div></section>")

    hidden_ids = [r["id"] for r in records
                  if r["优先级"] == "P0 必需" and r["任务内置作图"] == "否"]
    H.append("<section><h2>判断与边界</h2><p class=\"note\" style=\"margin:0\">")
    H.append("隐性缺口：P0 中有 <b>%d 条</b>（%s）内容必须配图，但课后任务完全没要求作图，"
             "只能靠内容审读挑出来，多是脉诊手感与波形。<br><br>" %
             (len(hidden_ids), "、".join(hidden_ids)))
    H.append("课后任务刻意用「自己默画 / 自己列表」做主动回忆，不能把成品图全部提前摆进正文。"
             "P0 才在正文直接给认知型插图；P1 给空白模板 + 默认折叠的答案图。"
             "舌象、面色用标准化彩绘示意而非真实照片，脉象波形须标注「示意，非真实脉搏波」。"
             "本草域教的是药性与方证，不是中药鉴定，饮片照片本轮不建议补。")
    H.append("</p></section>")
    H.append("<p class=\"foot\">明细见 <code>docs/配图需求清单.csv</code>，完整报告见 "
             "<code>docs/配图需求统计.md</code>，生成脚本 <code>tools/illustration_audit.py</code>。</p>")
    H.append("</div></body></html>")
    with open(os.path.join(DOCS, "配图需求看板.html"), "w", encoding="utf-8") as f:
        f.write("\n".join(H))

    # ------------------------------------------------------------ 控制台摘要
    print("条目 %d；优先级 %s" % (total, dict(lv)))
    print("任务内置作图：明确 %d，含可视化词 %d，无 %d" %
          (task_c["是"], task_c["含可视化词"], task_c["否"]))
    print("图型分布：%s" % dict(shape_c.most_common()))
    print("母图 %d 张，覆盖 %d 条；复用前三 %s" %
          (len(MOTHER), sum(mother_c.values()), mother_c.most_common(3)))
    print("原文 %d 段，具象比喻 %d 段，形态/指下描写 %d 段" % (q_total, q_meta, q_sense))
    print("隐性缺口（P0 但任务无作图）：%s" %
          "、".join(r["id"] for r in records if r["优先级"] == "P0 必需" and r["任务内置作图"] == "否"))
    print("--- 明确作图指令抽样（核对正则是否误判）---")
    shown = 0
    for dom_name, blk_name, it in rows:
        if MAKE.search(str(it.get("task", ""))) and shown < 6:
            print("  %s | %s" % (it["id"], str(it.get("task", ""))[:52]))
            shown += 1
    print("--- 判为无可视化线索的条目 ---")
    print("  " + "、".join(r["id"] for r in records if r["任务内置作图"] == "否"))
    print("已生成：docs/配图需求统计.md、docs/配图需求清单.csv、docs/配图需求看板.html")


if __name__ == "__main__":
    main()
