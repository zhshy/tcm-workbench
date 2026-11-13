# 项目结构与数据流

## 目录

```
tcm-workbench/
├── index.html              工作台入口（单文件，含全部 CSS/JS）
├── manifest.json           PWA 清单
├── assets/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── data/
│   └── plan.json           96 天课程表（72 学习日 + 24 次检查，含题目与解析）
├── library/                31 部公有领域古籍 + index.json
├── resources/              学习资源
│   ├── github-projects.md  GitHub 中医项目清单（分层）
│   ├── skill-audit.md      5 个 Agent Skill 的安全审计结论
│   └── learning-path.md    六阶段路径与课程规则
├── docs/
│   └── ARCHITECTURE.md     本文件
├── library-page/
│   └── index.html          资料库在线版工作台（存档，见下方说明）
├── tools/
│   └── push_to_github.py   Git Data API 推送脚本（本机 git 协议不可用时使用）
├── skills/                 本地技能素材（.gitignore 排除，含版权教材）
├── README.md
└── .gitignore
```

## 三个交付形态

| 形态 | 位置 | 数据存哪 | 说明 |
| --- | --- | --- | --- |
| 静态站（GitHub Pages） | 仓库根 + `index.html` | 浏览器 localStorage，可选同步到私有仓库 | 离线可用，PWA 可装到主屏 |
| 资料库数据页 | `library-page/index.html` | 资料库三张表 | 需在资料库环境打开；脱离环境只显示静态壳 |
| 本地素材库 | `skills/` | 本地文件 | 供 AI 直接读取；含版权教材，**不随仓库发布** |

## 数据流

**静态站**：
```
页面 (index.html)
  ├─ 内嵌 PLAN（96 天课程）→ 无需网络即可显示每日内容
  ├─ localStorage（进度/卡片）→ 可选「笔记库」同步
  └─ GitHub Contents API → 私有仓库 tcm-notes/state.json（Git 版本历史）
```

**资料库版**：
```
页面 → __SMART_PAGE__.database
        ├─ 任务节点表（96 条）：任务/天数/阶段/周次/重点/状态/完成日期/预计分钟
        ├─ 每日打卡表：日期/学习天数/打卡状态/实际分钟/学习标签/心得
        └─ 专注记录表：日期/开始时间/时长分钟/番茄类型/关联任务
```

两套形态共享同一份 `data/plan.json`，改课程只需改这一处并重新生成。

## 部署

```bash
# 静态站：推送到 GitHub Pages
GH_TOKEN=<token> python3 tools/push_to_github.py

# 本地预览
python3 -m http.server 8000
```

Pages 地址：https://zhshy.github.io/tcm-workbench/

## 版权边界

- **收录**：31 部公有领域古籍（作者逝世已久，作品进入公共领域）。
- **排除**：六部规划教材（《中医基础理论》《中药学》七版等）仍在版权期内，不随公开仓库分发，仅保留在本地 `skills/`。
- 古籍电子文本可能存在 OCR 或传抄讹误，引用前请核对纸本或权威点校本。

## 内容边界

本项目及所引资源仅用于中医学习与古籍研读，不构成诊断、处方、用药或剂量建议。身体不适请就诊于执业中医师。
