# 自测数据说明（v2.2）

当前正式课程采用知识域 → 知识块 → 条目的组织方式。每条学习内容保留 **6 道基础客观题 + 1 组综合客观辨析**，不设置必做主观题或人工阅卷。

## 数据位置与结构

- 当前课程数据源：`build/d1_foundation_*.json`、`build/domain2*.json`、`build/new_extra.json`、旧课程转换数据及补编数据。
- 生成数据：`build/domains.json`，经 `build/build_site.py` 注入 `index.html`。
- 题目审核清单：`question-provenance-audit.json`。
- 综合题结构：`composite-question.schema.json`。

每道基础题和综合题子项应有稳定 ID、题目来源、审核状态、知识点关联、来源引用和解析。题目来源建议使用 `manual`、`generated`、`imported`；审核状态使用 `draft`、`pending_review`、`reviewed`、`approved`、`rejected`。

## 审核原则

- 自动生成仅表示题目由程序辅助构造，不代表内容准确或已通过人工审核。
- 未经人工核验的题目必须显示“未审核练习题”提示，不得标记为 `approved`。
- 古籍出处只有在核对具体文本、版本、篇章和上下文后才可标为已核验。
- 题目没有直接古籍依据时应标注为“课程归纳”或“待核”，不得自动补造条文出处。
- 综合题应结合材料或多个明确知识点开展辨析；单纯复述本讲要点不应默认视为高质量综合题。

## 历史说明

旧版 168 天课程的题量、`COURSE` 数据结构及 v1 评分引擎说明已归档，不再代表当前课程数据结构。相关历史记录保留在 Git 历史和 `docs/archive/` 中。

## 验证

```bash
npm run validate
npm test
npm run test:python
```
