# 中医 Agent Skill 审计记录

> 审计时间：2026-11-13。方法：codeload tarball 下载（本机 `git clone` 常被中断）→ 检查 SKILL.md / 可执行位 / 外联与密钥读取 / 提示注入 / 许可证 / frontmatter 重名。

## 结论表

| 仓库 | 体积 | frontmatter name | 许可证 | 风险 | 结论 |
| --- | --- | --- | --- | --- | --- |
| YuanZHAO321/TCM.Skill | 29 MB / 98 文件 | 中医 | CC BY-NC 4.0（禁商用） | P2 | 收录为本地语料 |
| Tespera/nihaisha-skill | 3.5 MB / 115 文件 | nihaisha | 木兰宽松许可证 v2 | P2 | 收录 |
| jangviktor-web/ye-tianshi-skill | 2.1 MB / 43 文件 | ye-tianshi | CC BY-SA 4.0 | P2 | 收录（取子目录） |
| JuneYaooo/nihaisha-nishi-tcm | 145 MB / 3107 文件 | nihaisha（与上者重名） | 未见 LICENSE | P1 | 不安装，仅可作资料库 |
| qmzz/ni-haisha-tcm-skill | 10 MB / 1182 文件 | ni | MIT | P1 | 不安装（问诊开方定位） |

## 风险判定依据

**P1 的两个共同点**：

- `JuneYaooo/nihaisha-nishi-tcm` 含 `.env.example`、`SILICONFLOW_API_KEY`、`requests` 外联、`subprocess`、可执行 `install_as_skill.sh`；其 SKILL.md 自己声明「RAG 模式已下架」，但代码仍在包内。体积 145 MB 也不适合技能目录。
- `qmzz/ni-haisha-tcm-skill` 的 `allowed-tools: Read, Bash`，定位是「自然语言问诊 + 理法方药输出」，与「学习古籍」目标不匹配。

**P2 的三个共同点**：纯文本包、无可执行位、无网络外联；安全边界（不诊断、不开方、不替代就医）写进了正文。

## 三个必须知道的坑

1. **重名冲突**：`Tespera/nihaisha-skill` 与 `JuneYaooo/nihaisha-nishi-tcm` 的 frontmatter `name` 都是 `nihaisha`。同时安装会互相覆盖。
2. **目录名必须与 name 对齐**：`TCM.Skill` 的 name 是「中医」，安装时目录名要叫 `中医`，否则加载异常。
3. **提示注入扫描的误报**：扫描器在古籍里大量命中「外发」——那是「外发肌肤」「外发其汗」等医学术语，不是数据外发。**命中模式不等于风险，要看上下文。**

## 许可证提醒

- `TCM.Skill` 是 **CC BY-NC 4.0**，明确禁止商用。
- 其 `sources/` 含六部规划教材全文，教材版权另属出版方，**不宜公开分发**；本仓库因此只收录公版古籍。
- `ye-tianshi-skill` 是 CC BY-SA 4.0，`nihaisha-skill` 是木兰宽松许可证 v2，均允许非商业使用与再分发（保留署名）。

## 建议的用法

学习阶段优先「不安装、当语料」：让 AI 直接读本地 `skills/<name>/` 下的文本，并在开场声明「只依据这些文件回答、每条标注出处、查不到就说未收录」。这样边界最清楚，也不改动全局环境。
