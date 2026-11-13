# 项目结构与数据流

## 一、当前仓库结构

```text
tcm-workbench/
├── index.html              当前 168 天工作台；课程数据与页面逻辑内嵌
├── v1-96天版.html           旧版 96 天课程存档
├── manifest.json           PWA 清单
├── assets/                 PWA 图标
├── data/
│   └── plan.json           旧版 96 天课程数据，不是当前 168 天课程数据源
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
│   ├── ARCHITECTURE.md     本文件
│   └── TCM-CURRICULUM-IMPROVEMENT.md
│                            课程体系改进实施方案（仓库根目录）
├── tools/
│   └── push_to_github.py   Git Data API 推送脚本
└── README.md
```

## 二、当前课程实现基线

当前正式工作台是根目录 `index.html`：

- 课程周期：168 天；
- 页面展示：四个大阶段、40 个单元；
- 课程内容：约 543 段经典原文；
- 每日题量：4 道客观题，合计 672 道；
- 单课时长：45–48 分钟；
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

每日题量的目标为 **6 道基础客观题 + 1 道综合客观大题**，综合大题内部可含多个客观子题，所有题目均须具备标准答案、自动评分规则和解析。当前线上题量仍为 4 道/天；目标题量未完成题库和页面开发前，不作为当前功能描述。

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

## 七、部署与本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

GitHub Pages 地址：https://zhshy.github.io/tcm-workbench/

仓库更新脚本：

```bash
GH_TOKEN=<你的 fine-grained token> python3 tools/push_to_github.py
```

Token 应只使用在本机安全环境中，限定到目标私有仓库所需的最小权限，不得提交到仓库或写入日志。

## 八、版权与内容边界

- `library/` 中古籍文本应保留来源和文本准确性提示。
- `library/_external/` 中第三方资料的授权边界见 `library/_external/README.md`；不得因为文件位于本仓库就将其视为本项目原创或可自由再分发。
- 本项目用于中医理论学习与古籍研读，不构成诊断、处方、用药或剂量建议。不得将课程改造为自行诊疗训练。
