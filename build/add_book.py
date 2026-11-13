# -*- coding: utf-8 -*-
"""把《诊家枢要》全文 + 节引校读附录写入书库，并登记 index.json。
源文本 build/zjsy_text.txt 来自公开整理本（早稻田藏天顺七年刻本为底本）。
可重复执行：索引条目已存在则不重复插入。
"""
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "build", "zjsy_text.txt")
OUT = os.path.join(BASE, "library", "诊家枢要.txt")
IDX = os.path.join(BASE, "library", "index.json")

APPENDIX = """

附：常见节引校读

坊间选本与教材常把下面三段连抄作《诊家枢要》原文，其实是三书节引合抄，逐句标出于下，便于对着底本核读。

【节引一】时脉谓：春三月，六部中俱带弦，夏带洪，秋带浮，冬带沉。按之，脉和柔相离，如鸡践地，曰平；肥人责浮，瘦人责沉。肥人当沉，今反浮；瘦人当浮，今反沉，故责之。

· 「时脉谓春三月，六部中俱带弦……冬带沉」出《诊家枢要·持脉手法》（通行本题作「诊脉之道」）。原文作「夏三月，俱带洪；秋三月，俱带浮；冬三月，俱带沉」，节引脱「三月」二字，文义不变。

· 「按之，脉和柔相离，如鸡践地，曰平」出《素问·平人气象论》：「平脾脉来，和柔相离，如鸡践地，曰脾平。」这是形容脾之平脉从容不黏的手感，不是滑寿语，也不是承「时脉」而来的一句。

· 「肥人责浮，瘦人责沉。肥人当沉，今反浮；瘦人当浮，今反沉，故责之」出《伤寒论·平脉法》：「师曰：脉，肥人责浮，瘦人责沉，肥人当沉，今反浮，瘦人当浮，今反沉，故责之。」张仲景语，早于滑寿约一千二百年，是这一脉学的上游，不是后世补充。「责」训「求、追究」（方有执注：责，求也）：肥人肌肤厚，脉本当沉，今反浮，就要追问病在何处；不是责怪。

【节引二】诊脉之际，人长则疏下指，臂短则疏密下指。大小、阴阳、强弱同等；男女、左右，强弱相反。四时之脉不相度，男女之相背，皆病脉也。

· 通行本作「诊脉之际，人臂长则疏下指，臂短则密下指」。节引脱一「臂」字，又衍一「疏」字，遂成「疏密下指」；当作「密下指」。臂短则寸关尺相距近，三指须靠紧，才各得其位。

· 通行本作「三部之内，大小浮沉迟数同等，尺寸阴阳高下相符，男女左右强弱相应，四时之脉不相戾，命曰平人。其或一部之内，独大独小，偏迟偏疾，左右强弱之相反，四时男女之相背，皆病脉也」。节引「不相度」当作「不相戾」（戾，违也）。

· 尤须分清：「大小、阴阳、强弱同等」是平人的条件，「男女、左右，强弱相反」是病脉的条件。节引把「平人」与「病脉」两句揉成一句，读时须拆开。

【节引三】凡病之脉，见在上曰上病，见在下曰下病，左曰左病，右曰右病。左脉不和，为病在表，为阳，主四肢；右脉不和，为病在里，为阴，主腹脏。以次推之。

· 此段与《诊家枢要·持脉手法》原文基本一致，可放心作滑寿原文读。唯通行本「见在上曰上病」前无逗，「主腹脏」或作「为腹脏」，皆传抄小异。

读法小结：底本（早稻田藏天顺七年刻本）「持脉手法」一篇的顺序是——先调息定关位，次识时脉、胃脉、脏腑平脉，再论臂长短下指、平人与病脉之别，最后归到病脉定位与六脉提纲。节引打乱了这个次序，且羼入《素问》《伤寒论》两句。读选本时，先回到本篇顺着读一遍，再回看节引，就不至于把三家的意思当成一家。
"""

lines = open(SRC, encoding="utf-8").read().split("\n")
head = [
    "书名：诊家枢要",
    "作者：元·滑寿（字伯仁，晚号撄宁生）",
    "",
    "整理说明",
    "",
    lines[0],
    "",
]
out = "\n".join(head + lines[1:] + [APPENDIX.strip(), ""])
out = re.sub(r"\n{3,}", "\n\n", out)
open(OUT, "w", encoding="utf-8").write(out)
print("written", OUT, "chars", len(out), "bytes", os.path.getsize(OUT))

d = json.load(open(IDX, encoding="utf-8"))
items = d["items"]
if not any(x["file"] == "诊家枢要.txt" for x in items):
    entry = {
        "file": "诊家枢要.txt",
        "title": "诊家枢要",
        "era": "元",
        "author": "滑寿（伯仁）",
        "cat": "诊断",
        "desc": "以浮沉迟数滑涩六脉为提纲统摄诸脉，论持脉手法、时脉胃脉与脉贵有神，脉学由博返约之作；附常见节引校读。",
        "kb": round(os.path.getsize(OUT) / 1024),
    }
    last = max(i for i, x in enumerate(items) if x.get("cat") == "诊断")
    items.insert(last + 1, entry)
    d["updated"] = "2026-11-13"
    json.dump(d, open(IDX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("index inserted at", last + 1, "kb", entry["kb"])
else:
    for x in items:
        if x["file"] == "诊家枢要.txt":
            x["kb"] = round(os.path.getsize(OUT) / 1024)
    json.dump(d, open(IDX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("index entry refreshed")
print("诊断类:", [x["title"] for x in d["items"] if x.get("cat") == "诊断"])
