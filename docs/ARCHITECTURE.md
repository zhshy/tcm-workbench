# 项目结构与数据流（v2.4）

## 一、当前结构

```text
tcm-workbench/
├── index.html              当前工作台；CSS / JS / 数据全内嵌，单文件可直接托管（本次构建约 2.2 MB）
├── v1.4.2-168天版.html     上一版存档
├── v1-96天版.html          更早版本存档
├── VERSION / CHANGELOG.md / README.md / package.json
├── manifest.json / service-worker.js / assets/   PWA 与图标
├── assets/illustrations/   17 张藏蓝鎏金配图（13 母图 + 1 另版 + 1 动手区答案 + 2 可选练习纸）
├── build/
│   ├── d1_foundation_a/b/c.json  《中医基础理论》筑基域 25 条（新写，紧凑格式）
│   ├── domain2a/b/c.json   四诊与脉诊 8 讲（新写，含三书校读）
│   ├── new_extra.json      其余域的补充条目
│   ├── domain1.json        v2.0「七日筑基」遗留源数据，当前构建不再读取
│   ├── classic_extra.json  通用经典原文补编语料（按书名分组，每段自带 tr/tip）
│   ├── thin_supplement.json 19 条偏薄条目的定向补编（按条目 id 分组）
│   ├── trans_core.json     两部核心书全本白话译解
│   ├── trans_guides.json   其余 30 部译本/导读
│   ├── old_course.json     从 v1.4.2 index.html 提取的 168 课（中间产物）
│   ├── old_rd.json         提取的原文数据（中间产物）
│   ├── build_domains.py    归并旧 168 课 + 新内容 → domains.json
│   ├── image_prompts.json  13 张母图 + 2 张底纹的提示词与挂靠条目映射
│   ├── enrich.py           补 6+1 / 主题补编 / 匹配状态 / 题目审核 / 配图挂载（幂等）
│   ├── build_translations.py 生成 library/白话/*.txt 并登记 index.json
│   ├── app_template.html   页面模板（条目图解 / 动手模板 / 图谱视图），含 /*__DATA__*/ null
│   ├── build_site.py       把 domains.json 注入模板 → 根目录 index.html
│   ├── add_book.py         生成《诊家枢要》全文与校读附录，登记 index.json
│   └── zjsy_text.txt       《诊家枢要》整理本抓取文本（中间产物）
├── library/                32 部古籍正文 + 白话/（32 部译本）+ index.json + _external/
├── tools/
│   ├── load-data.js        从 index.html 抽出 var DATA（校验与测试共用）
│   ├── user-state.js       v3 备份序列化、旧版本导入与数据白名单校验
│   ├── check-generated.js  检查 domains.json 与 index.html 内嵌数据一致
│   ├── validate-workbench.js  v2.4 数据 / 6+1 / 匹配状态 / 译本 / 配图与答案文字校验
│   ├── visual-check.mjs    Edge CDP 无头浏览器回归（真实点击、图片加载与截图）
│   ├── course-engine.js    v1 评分引擎（历史，v2 不再使用）
│   ├── embed-course-engine.js / push_to_github.py  历史工具
├── tests/
│   ├── domains.test.js     v2.4 课程、溯源与审核元数据测试
│   ├── user-state.test.js  v1/v2/v3 学习备份兼容测试
│   ├── test_push_to_github.py  4 项发布脚本测试
│   └── legacy/             v1 的 course-engine.test.js（归档）
├── shots/                  visual-check 截图（历史截图）
├── docs/                   课程说明、本文件、v2 改版说明、archive/
├── data/ / resources/ / library-page/   v1 历史数据与资料，不是当前数据源
└── .github/workflows/ci.yml  npm run build:all + npm run check:generated + npm run validate + npm test + npm run test:python
```

## 二、数据流

```text
build/d1_foundation_*.json + domain2*.json + new_extra.json + old_course.json
        │  build_domains.py（按主题归并；build_domain1() 把紧凑格式转成 quote/quiz）
        ▼
build/domains.json  { version, domains: [{ id, name, blocks: [{ items: [...] }] }], figures: {...} }
        │  enrich.py  ← classic_extra.json / thin_supplement.json / library/*.txt
        │    · 每条保留 6 道基础客观题 + 1 组综合辨析；生成题标记 draft
        │    · 旧课原文按主题标签/条目上下文补充，逐条补足至少 5 段；补编保留关联标签
        │    · 每段原文算 match_status / match_method / match_text / work_id；exact 仅限整段规范化匹配
        │    · attach_figures()：从 image_prompts.json + assets/illustrations/ 生成 figures 总表，条目挂 figs / ans（88 条直接给答案）
        │    · 断言 6+1、白话、定位状态与引用字段；设 version = 2.4.0
        ▼   （enrich.py 幂等：sup 标记 + ext 配额 + pts 去重，重跑不叠加）
        ├──────────────► build_translations.py ← trans_core/trans_guides.json
        │                  · 生成 library/白话/<书名>.txt（32 部）
        │                  · 写 library/index.json 的 tr / trType / trSections / trQuotes
        ▼
build_site.py（JSON 紧凑化，转义 </ 与 U+2028/2029，替换占位符）
        ▼
index.html 里的  var DATA = {...};   →  运行时 var DOMAINS = DATA.domains
        ▼
首页 → 域卡片 → 块列表 → 条目详情
        · 原文卡片 .qlink → #/b/<file>?q=<词> → 打开原书、检索并高亮
        · 书库卡片 .trbtn → #/b/<file>?tr=1 → 打开白话译本，可切回原文
        · 书库与阅读器走 fetch('./library/index.json') 与 fetch('./library/<file>')
```

页面不依赖任何构建时生成的服务端逻辑；`index.html` 是完整交付物，`library/*.txt` 通过 `fetch` 按需读取，因此本地须用 HTTP 服务预览（`file://` 会被浏览器拦截）。

### 条目与原文的数据结构

```js
item = {
  id, title, goal, pts: [≥8 条], quote: [≥5 段], task, read,
  quiz: [6 题],         // 单选 a:number / 判断 2 选项 / 多选 a:number[]
  composite: { title, stimulus: { text }, items: [4 个子判断] }
}
quote = {
  s, src, tr, tip,        // 原文 / 出处 / 白话 / 校读
  book, file, q, work_id, // 文献标识和阅读器定位参数
  match_status, match_method, match_text, hit, // 分级匹配；hit 仅在 exact 时为 true
  ext?, sup?, outside?, topic_score?, matched_tags? // 补编与主题关联
}
```

`link_for(src, raw)` 只把整段规范化文本的连续命中标为 `exact`；前缀/内部片段标为 `fragment`，篇名标为 `chapter`。库外原书使用 `outside`，找不到可靠锚点则标为 `unmatched`，不提供伪精确跳转。

### 阅读器状态

`RDMODE = "raw" | "tr"`，`rdUrl(mode, file)` 决定取 `library/<file>` 还是 `library/白话/<file>`；`renderRdBar()` 管标题、译本类型标签与切换按钮；`RD_PREV_HASH` 在 `openBook()` 调用时（而非 loadLib 回调里）记录来源页，避免异步竞态导致关闭后 hash 与视图不一致。`setHash()` 用 `history.replaceState`，不触发 hashchange，因此不会重复加载。

## 三、状态

- `localStorage` 键保持 `mozhu-tcm-v2`；备份格式 v3，可导入旧版 v1/v2；字段含 `done`（条目 id → 布尔）、`last`（最近条目）、笔记与自测作答。v2.0 → v2.1 沿用同键。
- 进度按「已完成条目 / 170」统计，无日历、无配额、无解锁。自测判分只用于自查，不卡进度。
- 深链：`#/`、`#/d/<域>`、`#/i/<条目>`、`#/shelf`、`#/me`、`#/b/<file>?q=<词>&tr=1`。

## 四、部署

GitHub Pages 从 `main` 根目录发布，`.nojekyll` 避免 Jekyll 处理。主分支 CI 完整构建并测试后，会只提交生成的页面、课程 JSON、书目索引和白话译本；该 bot 提交触发 Pages 更新。Service Worker v3 对书库索引采用 Network First、古籍正文采用 Stale While Revalidate，并保留离线缓存。

## 五、校验

CI 在 Linux + Node.js 22 + Python 3.12 环境执行：

1. `npm run build:all`：从课程源数据重建 domains、译本和单页 `index.html`。
2. `npm run check:generated`：验证 `build/domains.json` 与页面内嵌 DATA 完全一致，并检查书目元数据与 PWA 缓存策略。
3. `npm run validate`：校验 8 域 / 29 块 / 170 条、6+1、题目审核状态、引文匹配状态、32 部书目与译本。
4. `npm test`：课程结构、文献元数据和本机备份兼容测试。
5. `npm run test:python`：发布脚本安全测试。

当前构建的原文匹配统计为 862 段：`exact` 422、`fragment` 417、`chapter` 10、`outside` 12、`unmatched` 1。只有 `exact` 表示整段规范化文本连续匹配；它仍不替代版本校勘和语义核验。

主分支全部测试通过后，CI 只提交 `index.html`、`build/domains.json`、`library/index.json` 和 `library/白话/` 等生成产物，随后由 GitHub Pages 部署。第三方资料目录 `library/_external/` 不在自动提交清单中。
v1.4.2 的架构说明存档在 [`archive/ARCHITECTURE-v1.4.2.md`](archive/ARCHITECTURE-v1.4.2.md)。
