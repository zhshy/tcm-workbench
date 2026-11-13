# 每日评价数据说明

当前正式日课采用 **6 道基础客观题 + 1 道综合客观大题**。

- 基础题：168 天 × 6 道，共 1008 道，内嵌在根目录 `index.html` 的 `COURSE` 数据中。
- 综合题：每天 1 道父题，包含 4 个客观子判断。评分引擎从本课前四道基础题生成候选答案核验组，父题 ID 为 `D001-Q07` 至 `D168-Q07`；子题 ID 使用 `-A` 至 `-D`。
- 计分：6 道基础题各 1 分，4 个子判断各 1 分，总分 10 分；达到 7 分记为日课通过。
- 引擎源文件：`tools/course-engine.js`。为保留单文件离线使用，运行时同一份引擎代码嵌入 `index.html`；修改源文件后运行 `npm run build:engine`。
- 结构定义：`composite-question.schema.json`。
- 来源状态盘点：`question-provenance-audit.json`。

## 来源核验规则

现有题目已经有稳定 ID、知识点 ID 和来源状态字段。当前 1008 道基础题中，672 道尚无独立来源引用，状态为 `needs_manual_source_review`。这些题目在界面中明确提示“来源待人工核验”，不自动生成古籍条号或伪造引用。只有完成版本、篇名/条文和上下文核对后，才可将状态更新为已核验并补充 `source_refs`。

综合题的子题继承其来源基础题的来源状态，不会因为变成综合题而自动获得新的文献出处。

## 验证命令

```bash
npm run validate
npm test
npm run test:python
```
