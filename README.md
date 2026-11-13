# 中医学习工作台

一个给自己用的单页学习系统：**按知识块组织，不按天**。

- 8 个域 · 27 个知识块 · 152 条，进度只记「哪条学完了」，没有「第几天」、没有逐日解锁、没有每日上限。
- 四诊（尤其脉诊）排在第二域，第一域只留七日筑基的最小骨架。
- 32 部公版古籍，内置阅读器支持全文分段加载与书内检索；含《诊家枢要》全文及三书节引校读附录。
- 纯静态、无后端、无追踪、无外部依赖。进度存在浏览器 `localStorage`（键 `mozhu-tcm-v2`），可导出备份。

**在线使用**：https://zhshy.github.io/tcm-workbench/

给使用者的改版说明见 [`docs/v2-知识块版说明.md`](docs/v2-知识块版说明.md)，课程结构见 [`docs/课程说明.md`](docs/课程说明.md)。

## v2.0 相对 v1.4.2 的变化

| | v1.4.2 | v2.0 |
| --- | --- | --- |
| 组织方式 | 168 天 × 每天一课，进度由日历决定 | 域 → 块 → 条目，进度由「学完哪条」决定 |
| 每日配额 | 逐日解锁（1.4.1 起虽解锁但仍按天排） | 无「今日课程」、无解锁、无上限，一天看几块随意 |
| 四诊位置 | D40 之后 | 第二域；脉诊 8 讲以《诊家枢要》为骨架 |
| 阴阳五行藏象 | 占主线前 39 天 | 压成「七日筑基」7 讲，只留支撑四诊的最小骨架 |
| 书库 | 31 部 | 32 部，补入《诊家枢要》全文 |
| 答题判分 | 6+1 客观题、10 分制、70% 通过线 | 改为随条自测与「已学完」勾选，不再计分卡进度 |

旧版 168 天实现存档在 `v1.4.2-168天版.html`，旧文档在 `docs/archive/`。

## 仓库结构

```
tcm-workbench/
├── index.html              当前工作台（单文件，CSS/JS/数据全内嵌）
├── v1.4.2-168天版.html      v1.4.2 存档
├── v1-96天版.html           v1 存档
├── VERSION / CHANGELOG.md / manifest.json / service-worker.js
├── library/                32 部古籍正文 + index.json + 诊家枢要.txt
├── build/                  构建链（源数据 JSON → domains.json → index.html）
│   ├── domain*.json        新写的筑基、四诊、脉诊内容
│   ├── build_domains.py    归并旧 168 课 + 新内容 → domains.json
│   ├── app_template.html   页面模板（含 /*__DATA__*/ 占位符）
│   ├── build_site.py       注入数据 → 根目录 index.html
│   └── add_book.py         生成《诊家枢要》书库文件与索引条目
├── tools/                  数据校验、发布脚本、v1 评分引擎（历史）
├── tests/                  v2 结构测试；v1 测试在 tests/legacy/
├── docs/                   课程说明、架构、v2 改版说明、archive/
├── assets/ / data/ / resources/ / library-page/   图标与历史资料
└── .github/workflows/ci.yml  校验 + JS 测试 + Python 测试
```

## 本地构建

改内容后重新生成根目录 `index.html`：

```bash
python build/build_domains.py     # 源数据 → build/domains.json
python build/build_site.py        # 注入模板 → index.html
npm run validate                  # 数据、书库、旧结构残留校验
npm test                          # 8 项结构测试
```

本地预览需起 HTTP 服务（书库用 `fetch` 读同目录文本，直接双击 `file://` 会被浏览器拦截）：

```bash
python -m http.server 8899
# 打开 http://127.0.0.1:8899/index.html
```

## 版权与内容边界

- 收录 32 部公有领域古籍；六部规划教材仍在版权期内，不随公开仓库分发。
- `library/_external/` 下第三方资料只作个人学习与检索，不得商用、不得再分发，详见该目录 README。
- 古籍电子文本可能有 OCR 或传抄讹误，引用前请核对纸本或权威点校本。
- 本项目仅用于中医学习与古籍研读，**不构成诊断、处方、用药或剂量建议**；身体不适请就诊于执业中医师。

许可、发布脚本等历史细节见 [`docs/archive/README-v1.4.2.md`](docs/archive/README-v1.4.2.md)。
