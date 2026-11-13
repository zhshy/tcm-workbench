# 项目结构与数据流（v2.0）

## 一、当前结构

```text
tcm-workbench/
├── index.html              当前工作台；CSS / JS / 数据全内嵌，单文件可直接托管
├── v1.4.2-168天版.html     上一版存档
├── v1-96天版.html          更早版本存档
├── VERSION / CHANGELOG.md / README.md
├── manifest.json / service-worker.js / assets/   PWA 与图标
├── build/
│   ├── domain1.json        七日筑基（新写）
│   ├── domain2a.json       四诊：望闻问（新写）
│   ├── domain2b.json       脉诊 8 讲（新写，含校读）
│   ├── domain2c.json       脉诊补充块（新写）
│   ├── new_extra.json      其余域的补充条目
│   ├── old_course.json     从 v1.4.2 index.html 提取的 168 课（中间产物）
│   ├── old_rd.json         提取的原文数据（中间产物）
│   ├── build_domains.py    归并 168 课 + 新内容 → domains.json
│   ├── app_template.html   页面模板，含 /*__DATA__*/ null 占位符
│   ├── build_site.py       把 domains.json 注入模板 → 根目录 index.html
│   ├── add_book.py         生成《诊家枢要》全文与校读附录，登记 index.json
│   └── zjsy_text.txt       《诊家枢要》整理本抓取文本（中间产物）
├── library/                32 部古籍正文 + index.json + _external/
├── tools/
│   ├── load-data.js        从 index.html 抽出 var DATA（校验与测试共用）
│   ├── validate-workbench.js  v2 数据/书库/旧结构残留校验
│   ├── course-engine.js    v1 评分引擎（历史，v2 不再使用）
│   ├── embed-course-engine.js / push_to_github.py  历史工具
├── tests/
│   ├── domains.test.js     v2 结构测试（8 项）
│   ├── test_push_to_github.py
│   └── legacy/             v1 的 course-engine.test.js（归档）
├── docs/                   课程说明、本文件、v2 改版说明、archive/
├── data/ / resources/ / library-page/   v1 历史数据与资料，不是当前数据源
└── .github/workflows/ci.yml  npm run validate + npm test + Python unittest
```

## 二、数据流

```
build/domain*.json + old_course.json
        │  build_domains.py（按主题归并、重写筑基与四诊）
        ▼
build/domains.json   { version, domains: [{ id, name, blocks: [{ items: [...] }] }] }
        │  build_site.py（JSON 紧凑化，转义 </ 与 U+2028/2029，替换占位符）
        ▼
index.html 里的  var DATA = {...};
        │  运行时 var DOMAINS = DATA.domains
        ▼
首页 → 域卡片 → 块列表 → 条目详情；书库走 fetch('./library/index.json')
```

页面不依赖任何构建时生成的服务端逻辑；`index.html` 是完整交付物。`library/*.txt` 通过 `fetch` 按需读取，因此本地须用 HTTP 服务预览（`file://` 会被浏览器拦截）。

## 三、状态

- `localStorage` 键 `mozhu-tcm-v2`；字段含 `done`（条目 id → 布尔）、`last`（最近条目）、笔记与自测作答。
- 与 v1 键分离，旧记录不会被误读。进度按「已完成条目 / 152」统计，无日历、无配额、无解锁。
- 视图切换用 hash 深链：`#/`、`#/d/<域>`、`#/i/<条目>`、`#/shelf`、`#/me`。

## 四、部署

GitHub Pages 从 `main` 根目录发布，`.nojekyll` 避免 Jekyll 处理。推送 `main` 后自动生效；`service-worker.js` 会缓存静态资源，改版后若线上仍是旧页，强制刷新一次即可。

## 五、校验

CI 三条命令（均通过）：

- `npm run validate`：8 域 / 27 块 / 152 条、id 唯一、原文四层、四诊顺序与脉诊 8 讲、书库文件齐备、旧 `var COURSE` / `window.RD` / 开始日逻辑已清除、引文出处正确。
- `npm test`：8 项 v2 结构测试。
- `python -m unittest discover -s tests -p 'test_*.py'`：4 项发布脚本测试。

v1.4.2 的架构说明存档在 [`archive/ARCHITECTURE-v1.4.2.md`](archive/ARCHITECTURE-v1.4.2.md)。
