// v2.0 域-块-条目结构测试。旧版 168 天课程测试已归档到 tests/legacy/。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { root, readHtml, loadData, allItems } = require("../tools/load-data.js");

const DATA = loadData();
const rows = allItems(DATA);

test("数据版本为 2.0.0，域 8 / 块 27 / 条目 152", () => {
  assert.equal(DATA.version, "2.0.0");
  assert.equal(DATA.domains.length, 8);
  assert.equal(DATA.domains.reduce((n, d) => n + d.blocks.length, 0), 27);
  assert.equal(rows.length, 152);
});

test("条目 id 全局唯一", () => {
  const ids = rows.map((r) => r.item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("每条都有目标、要点、至少一段原文（四层齐全）", () => {
  for (const { item } of rows) {
    assert.ok(item.title && item.goal, item.id + " 缺标题或目标");
    assert.ok(Array.isArray(item.pts) && item.pts.length >= 3, item.id + " 要点不足");
    assert.ok(Array.isArray(item.quote) && item.quote.length >= 1, item.id + " 缺原文");
    for (const q of item.quote) {
      assert.ok(q.s && q.src && q.tr && q.tip, item.id + " 原文四层不齐");
    }
  }
});

test("课程顺序：筑基在前，四诊第二，脉诊以《诊家枢要》为骨架", () => {
  assert.equal(DATA.domains[0].id, "d1");
  assert.match(DATA.domains[0].name, /筑基/);
  assert.equal(DATA.domains[1].id, "d2");
  assert.match(DATA.domains[1].name, /四诊/);
  const mai = DATA.domains[1].blocks.find((b) => /诊家枢要/.test(b.name || ""));
  assert.ok(mai, "找不到《诊家枢要》脉诊块");
  assert.ok(mai.items.length >= 8, "脉诊讲数不足 8");
  const flat = JSON.stringify(mai);
  assert.ok(flat.includes("六部中俱带弦"), "脉诊块缺四时平脉原文");
  assert.ok(flat.includes("伤寒论·平脉法"), "肥瘦责脉出处未标注《伤寒论·平脉法》");
});

test("已彻底去掉「天」驱动：数据无 day/d 字段，页面无逐日解锁", () => {
  for (const { item } of rows) {
    assert.ok(!("d" in item) && !("day" in item), item.id + " 仍带天数字段");
  }
  const html = readHtml();
  for (const legacy of ["var COURSE=[", "window.RD", "S.course.start", "weekfocus", "startDate"]) {
    assert.ok(!html.includes(legacy), "页面残留旧结构：" + legacy);
  }
  assert.ok(html.includes("没有「今日课程」，没有解锁，没有上限"), "首页未说明已取消每日配额");
  assert.ok(html.includes("var DOMAINS = DATA.domains"), "缺少域-块渲染入口");
});

test("书库 32 部，索引中每个文件都存在", () => {
  const lib = JSON.parse(fs.readFileSync(path.join(root, "library", "index.json"), "utf8"));
  assert.ok(lib.items.length >= 32);
  for (const b of lib.items) {
    assert.ok(fs.existsSync(path.join(root, "library", b.file)), "缺文件：" + b.file);
  }
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
  const html = readHtml();
  assert.ok(html.includes('var KEY = "mozhu-tcm-v2"'), "localStorage 键未升级到 v2");
  assert.ok(html.includes("var DATA = "), "DATA 未注入");
});
