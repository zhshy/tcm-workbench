# 中医学习工作台

一个给自己用的单页学习系统：96 天课程（每天 20 分钟、所有问题都附参考答案）、31 部公版古籍、可导出的学习卡片，以及一套「让 AI 查表而非凭记忆」的提问模板。

纯静态、无后端、无追踪、无外部依赖。个人数据默认只存浏览器 localStorage，可选同步到自己的私有仓库。

**在线使用**：https://zhshy.github.io/tcm-workbench/

## 仓库结构

```
tcm-workbench/
├── index.html              工作台入口（单文件，含全部 CSS/JS）
├── manifest.json           PWA 清单
├── assets/                 图标（PWA / iOS 主屏）
├── data/plan.json          96 天课程表（20 分钟/天 · 含全部参考答案）
├── library/                31 部公有领域古籍 + index.json
├── resources/              学习资源（见下）
├── docs/ARCHITECTURE.md    结构、数据流、部署与版权边界
├── library-page/index.html 资料库在线版工作台（存档）
├── tools/push_to_github.py 推送脚本（Git Data API）
├── skills/                 本地技能素材（.gitignore 排除，含版权教材）
└── README.md
```

完整的目录职责、三套数据流与部署方式见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 学习资源

| 文件 | 内容 |
| --- | --- |
| [resources/learning-path.md](resources/learning-path.md) | 六阶段路径、96 天节奏、每日五板块、学情检查规则 |
| [resources/github-projects.md](resources/github-projects.md) | GitHub 中医开源项目清单，按数据/知识/模型/应用四层整理 |
| [resources/skill-audit.md](resources/skill-audit.md) | 5 个中医 Agent Skill 的安全审计结论与三个坑 |
| `library/` | 31 部公版古籍原文（伤寒论、金匮要略、黄帝内经、本草纲目等） |
| `data/plan.json` | 全部课程数据：精读、泛读、问题与参考答案、两张卡的写作要点、随堂题的答案/解析/出处、20 分钟时间盒 |

## 两个交付形态

1. **静态站（本仓库）**：`index.html`，离线可用，可「添加到主屏幕」。数据存浏览器，可选同步到私有仓库。
2. **资料库数据页**：`library-page/index.html` 存档，线上版本 https://workbuddy.link/p/alkYf196OwOYNtXaTQoV9E 。数据存资料库三张表（任务节点 / 每日打卡 / 专注记录），跨设备登录即同步。该存档依赖资料库运行环境，脱离后只显示静态壳。

## 每天 20 分钟，所有问题都有答案

- **固定 20 分钟**：学习日为精读 8′ + 泛读 4′ + 两个问题 3′ + 两张卡 3′ + 随堂 2 题 2′；检查日为 5 题 10′ + 错题回看 10′。`data/plan.json` 的 `duration` / `box`、页面时间盒与资料库节点表「预计分钟」统一为 20。
- **全部附答案**：72 个学习日的 2 个细读问题（`answers.focus`）与 2 张卡片任务（`answers.cards`）都有参考答案 / 写作要点；264 道选择题全部带答案 `a`、解析 `why`、出处 `src`。页面里答案默认折叠，先自己想、写完卡再展开对照。
- **不再有「今日三件事」**：总览页改为「今日课程 · 20 分钟」，完成当日学习点一次即打卡，连续天数按自然日累计。

## 手机安装

- **iPhone / iPad（Safari）**：打开网址 → 分享 → 添加到主屏幕。
- **Android（Chrome）**：菜单 → 安装应用 / 添加到主屏幕。

### 手机和电脑的数据怎么同步

静态站默认把数据存在各设备浏览器本地。要跨设备长期沉淀，用**笔记库**：把数据写进自己的 GitHub **私有**仓库，Git 历史即版本历史。

配置方式：「笔记库」页 → 填 `owner/repo`（默认 `zhshy/tcm-notes`）与令牌 → 保存并连接。令牌建议用 **fine-grained token**，只授予该仓库 `Contents: Read and write`。

没有令牌时，也可以用两种手动方式搬运：

1. **同步码**：「我的卡片 → 跨设备同步 → 生成同步码」，把文本发到微信/备忘录，另一台粘贴导入。
2. **JSON 备份**：导出文件后传到另一台设备导入。

导入会覆盖本机数据，操作前先导出备份。

## 功能

| 模块 | 内容 |
| --- | --- |
| 总览 · 今日 | 今日 20 分钟课程打卡、连续天数、每日一读、时间盒摘要 |
| 今日课程 | 当天五个板块（20 分钟）、问题与卡片可展开参考答案、随堂题可查答案与解析、节点可展开、补课列表 |
| 学习路径 | 六阶段目标、教材、自测题 |
| 资源库 | 25 个已核实 star 的 GitHub 项目，按层与阶段筛选 |
| 古籍资料库 | 31 部公版古籍，在线阅读 |
| Skill 接入 | 审计结论、三种接入方式、学习契约 |
| 我的卡片 | 六类卡片，搜索筛选、JSON 导入导出、跨设备同步码 |
| 笔记库 | 私有仓库自动同步、冲突合并、Markdown 导出 |
| 提问模板 | 12 条可直接复制的提问话术 |

## 本地开发

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

直接双击 `index.html` 也能用（`file://` 下卡片与进度正常）。

## 更新与提交

```bash
# 推送（本机 git 协议不可用，走 Git Data API）
GH_TOKEN=<你的 token> python3 tools/push_to_github.py

# 自定义提交信息
GH_TOKEN=<你的 token> python3 tools/push_to_github.py --message "feat: 更新第 5 周内容"
```

脚本分三步：按 blob SHA 差分只传变更文件 → 建 tree/commit/ref → 推完重新拉取远端树逐文件回验。

## 版权与内容边界

- **收录**：31 部公有领域古籍。
- **排除**：六部规划教材（《中医基础理论》《中药学》七版等）仍在版权期内，不随公开仓库分发，仅保留在本地 `skills/`。
- 古籍电子文本可能存在 OCR 或传抄讹误，引用前请核对纸本或权威点校本。
- 本项目仅用于中医学习与古籍研读，**不构成诊断、处方、用药或剂量建议**；身体不适请就诊于执业中医师。

## 许可

- 代码与文档：MIT
- `library/` 古籍文本：公有领域
- `resources/` 原创整理：CC BY 4.0
