#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const engine = require("./course-engine.js");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r\n/g, "\n");
const start = html.indexOf("var COURSE=[") + "var COURSE=".length;
const end = html.indexOf(";\nwindow.RD", start);
if (start < "var COURSE=".length || end < 0) throw new Error("无法定位 index.html 内嵌 COURSE 数据");
const course = JSON.parse(html.slice(start, end));
if (course.length !== 168) throw new Error("课程天数不是 168");
const ids = new Set();
const status = {};
let basicCount = 0, compositeCount = 0, subitemCount = 0;
course.forEach((lesson, index) => {
  if (lesson.d !== index + 1) throw new Error("课程日期不连续：" + lesson.d);
  if (!Array.isArray(lesson.q) || lesson.q.length !== 6) throw new Error("D" + lesson.d + " 必须恰好有 6 道基础客观题");
  lesson.q.forEach((q) => {
    if (!q.id || ids.has(q.id)) throw new Error("题目 ID 缺失或重复：" + q.id);
    ids.add(q.id);
    if (!Array.isArray(q.o) || !q.o.length) throw new Error(q.id + " 缺少选项");
    const answer = Array.isArray(q.a) ? q.a : [q.a];
    if (!answer.length || answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.o.length)) throw new Error(q.id + " 答案索引越界");
    if (!Array.isArray(q.knowledge_ids) || !q.knowledge_ids.length) throw new Error(q.id + " 缺少 knowledge_ids");
    if (!Array.isArray(q.source_refs)) throw new Error(q.id + " 缺少 source_refs 数组");
    status[q.source_status || "missing"] = (status[q.source_status || "missing"] || 0) + 1;
    basicCount++;
  });
  const composite = engine.buildComposite(lesson);
  if (composite.type !== "composite_objective" || composite.items.length !== 4) throw new Error("D" + lesson.d + " 综合大题必须有 4 个子题");
  if (composite.items.some((item) => !item.id || !item.source_question_id || typeof item.answer !== "boolean")) throw new Error("D" + lesson.d + " 综合子题结构不完整");
  if (composite.items.filter((item) => item.answer).length !== 2) throw new Error("D" + lesson.d + " 综合题应包含 2 个成立、2 个不成立的候选结论");
  compositeCount++;
  subitemCount += composite.items.length;
});
console.log(JSON.stringify({
  lessons: course.length,
  basic_objective_questions: basicCount,
  composite_questions: compositeCount,
  composite_subitems: subitemCount,
  daily_scoring_units: 10,
  question_source_status: status
}, null, 2));
