# 中医学习工作台

一个给自己用的单页学习系统：**按知识块组织，不按天**。

- 8 个域 · 29 个知识块 · 170 条，进度只记「哪条学完了」，没有「第几天」、没有逐日解锁、没有每日上限。
- 第一域「中基筑基」按《中医基础理论》全程展开（5 块 25 条）；第二域直接进四诊，脉诊 8 讲以《诊家枢要》为骨架。
- 每讲 **6 道基础题 + 1 组综合辨析**（含判断/多选混合题型）；当前构建 862 段经典原文，均附白话与校读提示；书库定位分为整段命中、片段命中、篇章定位、库外参读和待核校。
- 32 部古籍（作品公版不等于电子转录文本已获授权），每部标题旁有「译」按钮直达白话译本；阅读器可一键切回原文，支持原文段落深链与书内检索高亮。
- 纯静态、无后端、无追踪、无外部依赖。进度存在浏览器 `localStorage`（键 `mozhu-tcm-v2`），可导出备份。

**在线使用**：https://zhshy.github.io/tcm-workbench/

给使用者的改版说明见 [`docs/v2-知识块版说明.md`](docs/v2-知识块版说明.md)，课程结构见 [`docs/课程说明.md`](docs/课程说明.md)，构建链见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## v2.2 质量升级\n\n- 原文匹配采用 `exact / fragment / chapter / outside / unmatched` 五种状态；只有整段规范化匹配才标为精确命中。\n- 自动补题和综合题标记为未审核草稿，人工编写题标记为待审核；不再把程序补齐误当作质量审核。\n- 补编语料按主题标签和条目上下文排序；书库增加底本、整理者、电子文本状态和授权核验字段。\n- 本机学习记录继续使用 `mozhu-tcm-v2`；备份升级为 v3，并兼容导入旧版备份。\n- CI 先重建课程、译本和单页应用，再执行结构、来源和测试校验。\n\n## v2.1 相对 v2.0 的变化

| | v2.0 | v2.1 |
| --- | --- | --- |
| 习题 | 新写条目只有 3 道单选、无综合题 | 170 条一律 **6+1**；多选题判分修复 |
| 筑基 | 「七日筑基」7 条，不讲中基 | **「中基筑基」25 条 / 5 块**，按《中医基础理论》全程 |
| 原文 | 543 段，要点 3–8 条 | **888 段**，每条 ≥5 段原文、≥8 条要点，白话 100% |
| 原文链接 | 无 | 书库定位改为五种匹配状态，未找到可靠定位的原文不再冒充精确命中 |
| 书库 | 32 部原文 | 32 部原文 + 32 部白话译本（2 全本 / 2 框架节译 / 28 导读），标题旁「译」按钮 |

译本不是逐字全译，《诊家枢要》《濒湖脉学》为全本译解，《脉经》《伤寒论》为框架节译，其余为白话导读；界面按书标注类型，不冒充全译。详见 `library/index.json` 的 `translation_note`。

## v2.0 相对 v1.4.2 的变化

| | v1.4.2 | v2.0 |
| --- | --- | --- |
| 组织方式 | 168 天 × 每天一课，进度由日历决定 | 域 → 块 → 条目，进度由「学完哪条」决定 |
| 每日配额 | 逐日解锁（1.4.1 起虽解锁但仍按天排） | 无「今日课程」、无解锁、无上限，一天看几块随意 |
| 四诊位置 | D40 之后 | 第二域；脉诊 8 讲以《诊家枢要》为骨架 |
| 阴阳五行藏象 | 占主线前 39 天 | 压成「七日筑基」7 讲，只留支撑四诊的最小骨架 |
| 书库 | 31 部 | 32 部，补入《诊家枢要》全文 |
| 答题判分 | 6+1 客观题、10 分制、70% 通过线 | 随条自测、不计分卡进度；v2.1 起 6+1 恢复为每讲标配 |

旧版 168 天实现存档在 `v1.4.2-168天版.html`，旧文档在 `docs/archive/`。

## 仓库结构

```
tcm-workbench/
├── index.html              当前工作台（单文件，CSS/JS/数据全内嵌）
├── v1.4.2-168天版.html      v1.4.2 存档
├── v1-96天版.html           v1 存档
├── VERSION / CHANGELOG.md / manifest.json / service-worker.js
├── library/                32 部古籍正文 + 白话/ 32 部译本 + index.json
├── build/                  构建链（源数据 JSON → domains.json → index.html）
│   ├── d1_foundation_*.json  《中医基础理论》筑基域（新写）
│   ├── domain2*.json        四诊、脉诊内容（新写）
│   ├── classic_extra.json   通用经典原文补编语料
│   ├── thin_supplement.json 偏薄条目的定向补编语料
│   ├── trans_core.json      两部核心书全本译解
│   ├── trans_guides.json    其余 30 部译本/导读
│   ├── build_domains.py     归并旧 168 课 + 新内容 → domains.json
│   ├── enrich.py            补 6+1 / 补原文要点 / 算书库深链（幂等）
│   ├── build_translations.py 生成 library/白话/*.txt 并登记索引
│   ├── app_template.html    页面模板（含 /*__DATA__*/ 占位符）
│   ├── build_site.py        注入数据 → 根目录 index.html
│   └── add_book.py          生成《诊家枢要》书库文件与索引条目
├── tools/                  数据校验、无头浏览器回归、发布脚本、v1 评分引擎（历史）
├── tests/                  v2 结构测试；v1 测试在 tests/legacy/
├── docs/                   课程说明、架构、v2 改版说明、archive/
├── assets/ / data/ / resources/ / library-page/   图标与历史资料
└── .github/workflows/ci.yml  校验 + JS 测试 + Python 测试
```

## 本地构建

改内容后重新生成根目录 `index.html`：

```bash
python build/build_domains.py        # 源数据 → build/domains.json
python build/enrich.py               # 补 6+1 / 补原文要点 / 算书库深链（幂等）
python build/build_translations.py   # 生成 32 部白话译本并更新 library/index.json
python build/build_site.py           # 注入模板 → index.html

npm run validate                     # 数据、6+1、白话/深链、译本覆盖校验
npm test                             # 10 项结构测试
npm run test:python                  # 4 项发布脚本测试
npm run check:visual                 # 可选：本机 Edge 无头浏览器 47 项回归 + 截图
```

本地预览需起 HTTP 服务（书库用 `fetch` 读同目录文本，直接双击 `file://` 会被浏览器拦截）：

```bash
python -m http.server 8899
# 打开 http://127.0.0.1:8899/index.html
```

`check:visual` 依赖本机 Edge，可用 `EDGE_PATH` / `BASE_URL` / `OUT_DIR` / `CDP_PORT` 覆盖；截图落在 `shots/v21-*.png`。

## 版权与内容边界

- 收录 32 部公有领域古籍；六部规划教材仍在版权期内，不随公开仓库分发。
- `library/_external/` 下第三方资料只作个人学习与检索，不得商用、不得再分发，详见该目录 README。
- 古籍电子文本可能有 OCR 或传抄讹误，引用前请核对纸本或权威点校本。
- 本项目仅用于中医学习与古籍研读，**不构成诊断、处方、用药或剂量建议**；身体不适请就诊于执业中医师。

许可、发布脚本等历史细节见 [`docs/archive/README-v1.4.2.md`](docs/archive/README-v1.4.2.md)。
