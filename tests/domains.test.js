// v2.1 域-块-条目结构测试。旧版 168 天课程测试已归档到 tests/legacy/。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { root, readHtml, loadData, allItems } = require("../tools/load-data.js");

const DATA = loadData();
const rows = allItems(DATA);
const html = readHtml();

test("数据版本为 2.1.0，域 8 / 块 29 / 条目 170", () => {
  assert.equal(DATA.version, "2.2.0");
  assert.equal(DATA.domains.length, 8);
  assert.equal(DATA.domains.reduce((n, d) => n + d.blocks.length, 0), 29);
  assert.equal(rows.length, 170);
});

test("条目 id 全局唯一", () => {
  const ids = rows.map((r) => r.item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("每条都是 6 道单选 + 1 组综合辨析（旧版规定）", () => {
  for (const { item } of rows) {
    assert.equal(item.quiz.length, 6, item.id + " 单选题不是 6 道");
    for (const [i, q] of item.quiz.entries()) {
      assert.ok(q.q && q.opts.length >= 2, item.id + " quiz[" + i + "] 选项不足 2 个");
      const ans = Array.isArray(q.a) ? q.a : [q.a];
      assert.ok(ans.length > 0, item.id + " quiz[" + i + "] 无答案");
      for (const a of ans) assert.ok(a >= 0 && a < q.opts.length, item.id + " quiz[" + i + "] 答案越界");
      assert.ok(q.why, item.id + " quiz[" + i + "] 缺解析");
      assert.ok(q.id && ["manual", "generated"].includes(q.question_origin), item.id + " 题目缺 ID 或来源类型");
      assert.ok(["draft", "pending_review", "reviewed", "approved", "rejected"].includes(q.review_status), item.id + " 题目审核状态无效");
      if (q.question_origin === "generated") assert.equal(q.review_status, "draft", item.id + " 自动生成题不得默认审核通过");
      assert.ok(Array.isArray(q.knowledge_ids) && q.knowledge_ids.length, item.id + " 题目缺知识点关联");
      assert.ok(Array.isArray(q.source_refs), item.id + " 题目缺来源数组");
    }
    assert.ok(item.composite && item.composite.items.length >= 1, item.id + " 缺综合辨析题");
    assert.ok(item.composite.stimulus.text, item.id + " 综合题缺材料");
    assert.ok(item.composite.id && item.composite.question_origin && item.composite.review_status, item.id + " 综合题缺来源或审核状态");
    if (item.composite.question_origin === "generated") assert.equal(item.composite.review_status, "draft", item.id + " 自动生成综合题不得默认审核通过");
    for (const sub of item.composite.items) {
      assert.ok(sub.id && Array.isArray(sub.knowledge_ids) && sub.knowledge_ids.length, item.id + " 综合题子项缺 ID / 知识关联");
      assert.ok(Array.isArray(sub.source_refs) && sub.review_status, item.id + " 综合题子项缺来源 / 审核状态");
    }
  }
  // 单选题答案位置不能总在 A
  const positions = rows.flatMap((r) => r.item.quiz.filter((q) => !Array.isArray(q.a)).map((q) => q.a));
  assert.ok(new Set(positions).size >= 3, "答案分布过于集中");
});

test("每条 ≥5 段原文、≥8 条要点，原文四层与书库深链齐全", () => {
  for (const { item } of rows) {
    assert.ok(item.title && item.goal, item.id + " 缺标题或目标");
    assert.ok(item.pts.length >= 8, item.id + " 要点不足 8 条");
    assert.ok(item.quote.length >= 5, item.id + " 原文不足 5 段");
    for (const q of item.quote) {
      assert.ok(q.s && q.src && q.tr && q.tip, item.id + " 原文四层不齐");
      assert.ok(["exact", "fragment", "chapter", "outside", "unmatched"].includes(q.match_status), item.id + " 原文匹配状态无效");
      assert.ok(q.match_method && typeof q.hit === "boolean", item.id + " 缺匹配依据");
      assert.equal(q.hit, q.match_status === "exact", item.id + " 精确命中标记不一致");
      if (q.match_status === "unmatched") assert.ok(!q.file && !q.q, item.id + " 未匹配原文不应伪造跳转");
      else assert.ok(q.book && q.file && q.q && q.work_id, item.id + " 已定位原文缺文献元数据或链接");
      if (q.match_status === "outside") assert.equal(q.outside, true, item.id + " 库外引文标记缺失");
    }
  }
  const total = rows.reduce((n, r) => n + r.item.quote.length, 0);
  assert.ok(total >= 880, "原文总数不足 880，实际 " + total);
});

test("第一域按《中医基础理论》全程重写，第二域仍是四诊且以《诊家枢要》为骨架", () => {
  const d1 = DATA.domains[0], d2 = DATA.domains[1];
  assert.equal(d1.id, "d1");
  assert.match(d1.name, /中基筑基/);
  assert.match(d1.sub + d1.intro, /中医基础理论/);
  assert.equal(d1.blocks.length, 5);
  assert.equal(d1.blocks.reduce((n, b) => n + b.items.length, 0), 25);
  const titles = d1.blocks.flatMap((b) => b.items.map((i) => i.title)).join(" ");
  for (const key of ["阴阳", "五行", "藏象", "气血", "经络", "体质", "病因", "病机", "防治"]) {
    assert.ok(titles.includes(key), "中基筑基未覆盖：" + key);
  }
  assert.equal(d2.id, "d2");
  assert.match(d2.name, /四诊/);
  const mai = d2.blocks.find((b) => /诊家枢要/.test(b.name || ""));
  assert.ok(mai && mai.items.length >= 8, "脉诊讲数不足 8");
  const flat = JSON.stringify(mai);
  assert.ok(flat.includes("六部中俱带弦"), "脉诊块缺四时平脉原文");
  assert.ok(flat.includes("伤寒论·平脉法"), "肥瘦责脉出处未标注《伤寒论·平脉法》");
});

test("已彻底去掉「天」驱动：数据无 day/d 字段，页面无逐日解锁", () => {
  for (const { item } of rows) {
    assert.ok(!("d" in item) && !("day" in item), item.id + " 仍带天数字段");
  }
  for (const legacy of ["var COURSE=[", "window.RD", "S.course.start", "weekfocus", "startDate"]) {
    assert.ok(!html.includes(legacy), "页面残留旧结构：" + legacy);
  }
  assert.ok(html.includes("没有「今日课程」，没有解锁，没有上限"), "首页未说明已取消每日配额");
  assert.ok(html.includes("var DOMAINS = DATA.domains"), "缺少域-块渲染入口");
});

test("v2.1 前端：原文链接、译按钮、原文/白话切换、深链路由齐备", () => {
  for (const marker of ["class=\"qlink", "data-out=", "rdSwitch", "RDMODE", "openBookHash", "trbtn", "trType", "tr=1"]) {
    assert.ok(html.includes(marker), "页面缺少：" + marker);
  }
  assert.ok(html.includes("原书未入书库"), "库外引文未做诚实标注");
  assert.ok(html.includes("#/b/"), "缺少书库深链路由");
});

test("书库 32 部，每部都有白话译本文件与译本类型", () => {
  const lib = JSON.parse(fs.readFileSync(path.join(root, "library", "index.json"), "utf8"));
  assert.equal(lib.items.length, 32);
  const types = {};
  for (const b of lib.items) {
    assert.ok(fs.existsSync(path.join(root, "library", b.file)), "缺原书：" + b.file);
    assert.ok(b.tr && b.trType, "《" + b.title + "》缺译本登记");
    assert.ok(fs.existsSync(path.join(root, "library", b.tr)), "缺译本：" + b.tr);
    types[b.trType] = (types[b.trType] || 0) + 1;
  }
  assert.equal(types["全本逐篇译解"], 1);
  assert.equal(types["全本逐脉译解"], 1);
  assert.equal(types["框架节译"], 2);
  assert.equal(types["白话导读"], 28);
  assert.match(lib.translation_note, /不冒充全译/);
});

test("《诊家枢要》全文与三书节引校读附录齐备", () => {
  const t = fs.readFileSync(path.join(root, "library", "诊家枢要.txt"), "utf8");
  for (const key of [
    "六部中俱带弦", "如鸡践地", "肥人责浮", "不相戾", "密下指",
    "见在上曰上病", "脉阴阳类成", "诊家宗法", "伤寒论·平脉法", "素问·平人气象论",
  ]) {
    assert.ok(t.includes(key), "缺关键内容：" + key);
  }
  assert.ok(t.includes("附：常见节引校读"), "缺校读附录");
});

test("页面语法可解析，进度存储键为 v2", () => {
  assert.ok(html.includes('var KEY = "mozhu-tcm-v2"'), "localStorage 键未升级到 v2");
  assert.ok(html.includes("var DATA = "), "DATA 未注入");
});

test("题目与综合题均具有来源、知识点和审核状态", () => {
  const ids = [];
  for (const { item } of rows) {
    for (const q of item.quiz) ids.push(q.id);
    ids.push(item.composite.id);
    for (const sub of item.composite.items) ids.push(sub.id);
  }
  assert.equal(new Set(ids).size, ids.length, "题目 ID 必须全局唯一");
});

test("古籍元数据区分公版作品与电子文本授权", () => {
  const lib = JSON.parse(fs.readFileSync(path.join(root, "library", "index.json"), "utf8"));
  const ids = lib.items.map((x) => x.work_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const book of lib.items) {
    for (const key of ["edition", "publisher", "source_url", "transcriber", "text_status", "license_status", "verified_at", "verification_note"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(book, key), book.title + " 缺元数据字段 " + key);
    }
    assert.equal(book.license_status, "underlying_work_public_domain_transcription_rights_unverified");
  }
  assert.match(lib.license_note, /电子文本/);
});
