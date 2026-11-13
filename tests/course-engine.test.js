const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../tools/course-engine.js");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8").replace(/\r\n/g, "\n");
const html = read("index.html");
const source = read("tools/course-engine.js").trim();
function loadCourse() {
  const start = html.indexOf("var COURSE=[") + "var COURSE=".length;
  const end = html.indexOf(";\nwindow.RD", start);
  assert.ok(start >= "var COURSE=".length && end > start, "COURSE 数据应可定位");
  return JSON.parse(html.slice(start, end));
}
test("168 天每天恰好 6 道基础客观题", () => {
  const course = loadCourse();
  assert.equal(course.length, 168);
  const ids = new Set();
  for (const lesson of course) {
    assert.equal(lesson.q.length, 6, "D" + lesson.d);
    for (const question of lesson.q) {
      assert.ok(question.id);
      assert.ok(!ids.has(question.id), "重复题目 ID：" + question.id);
      ids.add(question.id);
      const answers = Array.isArray(question.a) ? question.a : [question.a];
      assert.ok(answers.every((a) => Number.isInteger(a) && a >= 0 && a < question.o.length));
    }
  }
  assert.equal(ids.size, 1008);
});
test("168 天均生成 1 道四子题综合客观大题", () => {
  for (const lesson of loadCourse()) {
    const composite = engine.buildComposite(lesson);
    assert.equal(composite.id, "D" + String(lesson.d).padStart(3, "0") + "-Q07");
    assert.equal(composite.items.length, 4);
    assert.equal(composite.items.filter((item) => item.answer).length, 2);
    assert.equal(composite.items.filter((item) => !item.answer).length, 2);
  }
});
test("每日评分为 10 个客观计分点", () => {
  const lesson = loadCourse()[0];
  const composite = engine.buildComposite(lesson);
  const basicAnswers = Object.fromEntries(lesson.q.map((q, i) => [i, q.a]));
  const compositeAnswers = Object.fromEntries(composite.items.map((item, i) => [i, item.answer]));
  const full = engine.scoreLesson(lesson, basicAnswers, compositeAnswers);
  assert.equal(full.score, 10);
  assert.equal(full.total, 10);
  assert.equal(full.basic_score, 6);
  assert.equal(full.composite_score, 4);
  const partial = engine.scoreLesson(lesson, {}, {});
  assert.equal(partial.score, 0);
  assert.equal(partial.total, 10);
});
test("重做保留首次完成时间、最佳成绩和最近 20 次尝试", () => {
  let record = engine.recordAttempt(null, {date:"2026-11-13",submitted_at:"2026-11-13T10:00:00.000Z",score:6,total:10});
  record = engine.recordAttempt(record, {date:"2026-11-14",submitted_at:"2026-11-14T10:00:00.000Z",score:9,total:10});
  assert.equal(record.date, "2026-11-13");
  assert.equal(record.latest_date, "2026-11-14");
  assert.equal(record.attempt_count, 2);
  assert.equal(record.best_score, 9);
  assert.equal(record.score, 9);
  assert.equal(record.passed, true);
  for (let i = 0; i < 22; i++) record = engine.recordAttempt(record, {date:"2026-11-15",submitted_at:"2026-11-15T10:00:00.000Z",score:i%10,total:10});
  assert.equal(record.attempts.length, 20);
  assert.equal(record.date, "2026-11-13");
});
test("错题按知识点记录 D+1、D+3、D+14、D+30 复习节奏", () => {
  const q = {id:"D001-Q01",q:"题干",knowledge_ids:["unit.u01"]};
  let weak = engine.updateWeakQuestion(null, false, "2026-11-13", 1, q);
  assert.equal(weak.due_date, "2026-11-14");
  weak = engine.updateWeakQuestion(weak, true, "2026-11-14", 1, q);
  assert.equal(weak.due_date, "2026-11-17");
  weak = engine.updateWeakQuestion(weak, true, "2026-11-17", 1, q);
  assert.equal(weak.resolved, false);
  assert.equal(weak.due_date, "2026-12-01");
  weak = engine.updateWeakQuestion(weak, true, "2026-12-01", 1, q);
  assert.equal(weak.resolved, true);
  assert.equal(weak.due_date, "2026-12-31");
});
test("index.html 内嵌引擎与可测试源文件保持一致", () => {
  const begin = "/* BEGIN EMBEDDED COURSE ENGINE */", end = "/* END EMBEDDED COURSE ENGINE */";
  const a = html.indexOf(begin), b = html.indexOf(end, a + begin.length);
  assert.ok(a >= 0 && b > a, "嵌入标记存在");
  assert.equal(html.slice(a + begin.length, b).trim(), source);
});
test("题目出处未核验时不伪造来源字段", () => {
  const pending = loadCourse().flatMap((lesson) => lesson.q).filter((q) => q.source_status === "needs_manual_source_review");
  assert.equal(pending.length, 672);
  assert.ok(pending.every((q) => Array.isArray(q.source_refs) && q.source_refs.length === 0));
});
