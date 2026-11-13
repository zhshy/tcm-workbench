# 项目结构与数据流

## 一、当前仓库结构

```text
tcm-workbench/
├── index.html              当前 168 天工作台；课程数据与页面逻辑内嵌
├── v1-96天版.html           旧版 96 天课程存档
├── manifest.json           PWA 清单
├── service-worker.js       HTTPS 下的静态资源缓存与离线回退
├── assets/                 PWA 图标
├── data/
│   ├── plan.json           旧版 96 天课程数据，不是当前 168 天课程数据源
│   └── assessments/        综合题 Schema 与逐题来源核验盘点
├── library/
│   ├── index.json          古籍索引
│   ├── *.txt               古籍正文
│   └── _external/          第三方资料，权利状态见其 README
├── library-page/
│   └── index.html          资料库在线版存档
├── resources/
│   └── learning-path.md    当前 168 天课程现状与目标六阶段知识架构
├── docs/
│   ├── 课程说明.md         当前 168 天课程实现说明
│   └── ARCHITECTURE.md     本文件
├── TCM-CURRICULUM-IMPROVEMENT.md
│                            课程体系改进实施方案（仓库根目录）
├── tools/
│   ├── course-engine.js    客观题/综合题评分与学习记录纯函数
│   ├── embed-course-engine.js  将引擎同步嵌入单文件 HTML
│   ├── validate-workbench.js   课程与题库结构校验
│   └── push_to_github.py   默认 dry-run 的安全发布脚本
├── tests/                  Node 与 Python 自动化测试
├── .github/workflows/ci.yml 自动校验与测试
├── package.json            测试与校验命令
└── README.md
```

## 二、当前课程实现基线

当前正式工作台是根目录 `index.html`：

- 课程周期：168 天；
- 页面展示：四个大阶段、40 个单元；
- 课程内容：约 543 段经典原文；
- 每日题量：6 道基础客观题 + 1 道综合客观大题；基础题共 1008 道，综合大题 168 道，每道含 4 个客观子判断；
- 每日计分：6 个基础计分点 + 4 个综合子判断计分点，共 10 分，70% 为日课通过线；
- 单课计划时长：50–55 分钟；
- 课程数据：`var COURSE` 与 `window.RD` 等数据内嵌在 HTML；
- 学习进度和卡片：默认保存在浏览器 localStorage，可按页面功能同步到个人私有仓库。

`data/plan.json` 与 `v1-96天版.html` 属于旧版 96 天、20 分钟课程资产。不要把它们误认为当前 168 天工作台的数据源。

## 三、目标课程架构

课程内容治理目标采用六阶段知识架构：

1. 中医理论基础；
2. 中医诊断学；
3. 中药学；
4. 方剂学；
5. 中医经典研读；
6. 综合研读与知识输出。

当前线上页面仍按四个大阶段展示。六阶段是目标知识分类框架，必须完成 40 个单元和 168 天逐课映射后，才能决定是否同步调整页面分组。不可仅更新文档就宣称六阶段页面已上线。

当前线上已实现 **6 道基础客观题 + 1 道综合客观大题**。综合大题由共同材料、4 个客观子判断组成；子判断独立计分，全部自动评分。基础题稳定 ID 已有 1008 个；来源盘点见 `data/assessments/question-provenance-audit.json`，672 道题仍待人工核验出处，界面会明确提示，不自动补造来源。

## 四、课程数据解耦目标

建议逐步将课程数据从 `index.html` 中抽离：

```text
data/
├── curriculum/
│   ├── curriculum.json
│   ├── phases.json
│   └── units.json
├── courses/
│   └── lessons-*.json
├── assessments/
│   ├── daily-objective-questions.json
│   ├── daily-composite-questions.json
│   └── phase-exams.json
├── reviews/
│   └── review-rules.json
└── schema/
    ├── lesson.schema.json
    ├── objective-question.schema.json
    ├── composite-question.schema.json
    └── source.schema.json
```

该目录为目标结构，当前仓库尚未完成数据解耦。实施时应保留现有页面和交互，先提取数据，再逐步调整加载方式。若部署需要单文件，可通过构建脚本生成发布 HTML。

## 五、数据迁移原则

迁移前备份 localStorage 与历史数据；保持已有课程 ID、题目 ID、已完成状态、历史答题记录、卡片、笔记和同步数据的兼容。阶段归属调整不应导致历史课程重置。

旧版 96 天数据与当前 168 天课程应明确区分，不能在构建过程中互相覆盖。

## 六、三种交付形态

| 形态 | 位置 | 数据位置 | 说明 |
|---|---|---|---|
| 当前静态工作台 | 根目录 `index.html` | 浏览器 localStorage；课程数据内嵌 HTML | 当前 168 天版本，支持离线打开 |
| 旧版课程存档 | `v1-96天版.html`、`data/plan.json` | 旧版 JSON 与 HTML | 96 天、20 分钟/天，仅供历史参考 |
| 资料库数据页 | `library-page/index.html` | 资料库运行环境 | 存档形态，脱离相应环境可能只显示静态壳 |

## 七、学习记录、评价与时间统计

- 每次提交保留首次完成日期、最近成绩、最佳成绩、尝试次数和最近 20 次答题记录；重做不覆盖历史。
- 未提交答题草稿保存在 localStorage；题库版本不匹配时不复用旧草稿。
- 通过线为 70%；通过不等于长期掌握，薄弱题按 D+1、D+3、D+14、D+30 安排复习。
- 计划课程分钟与实际专注分钟分开；实际分钟仅由用户主动启动的课程专注计时器累计。旧版折算分钟保留在 `legacy_estimated_sec`。
- 完成课程提交后生成 D+3～D+5 学情检查，不再依赖计划时长阈值。

## 八、测试与持续集成

```bash
npm run validate
npm test
npm run test:python
```

GitHub Actions 在 `main` 更新和 Pull Request 时运行课程数据校验、Node 测试与发布脚本安全测试。`tools/course-engine.js` 是评分引擎的可测试源文件，`index.html` 内嵌同一份代码以保持单文件离线交付；修改引擎后执行 `npm run build:engine` 同步。

## 九、发布与本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

GitHub Pages 地址：https://zhshy.github.io/tcm-workbench/

发布脚本默认 dry-run，只检查本地白名单清单；确认后才执行：

```bash
python3 tools/push_to_github.py
GH_TOKEN=<本机环境变量> python3 tools/push_to_github.py --apply
```

脚本自动定位仓库根目录，默认排除本地技能目录、依赖目录和密钥/数据库文件；不改动资料库现有目录及内容；只新增或更新白名单文件，不删除远端多余文件，也不自动创建仓库或更改 Pages 设置。

Token 应只使用在本机安全环境中，限定到目标私有仓库所需的最小权限，不得提交到仓库或写入日志。

## 十、版权与内容边界

- `library/` 中古籍文本应保留来源和文本准确性提示。
- `library/_external/` 中第三方资料的授权边界见 `library/_external/README.md`；不得因为文件位于本仓库就将其视为本项目原创或可自由再分发。
- 本项目用于中医理论学习与古籍研读，不构成诊断、处方、用药或剂量建议。不得将课程改造为自行诊疗训练。
