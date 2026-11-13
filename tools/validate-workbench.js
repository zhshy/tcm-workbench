#!/usr/bin/env node
// v2.1 校验：6+1 自测 / 原文四层与书库深链 / 白话译本覆盖 / 旧结构已清除。
// 用法：npm run validate
const fs = require("node:fs");
const path = require("node:path");
const { root, readHtml, loadData, allItems } = require("./load-data.js");

function check(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = readHtml();
const DATA = loadData();
const rows = allItems(DATA);

check(DATA.version === "2.1.0", "数据版本不是 2.1.0，实际 " + DATA.version);
check(Array.isArray(DATA.domains), "domains 必须是数组");
check(DATA.domains.length === 8, "域数不是 8，实际 " + DATA.domains.length);

const blocks = DATA.domains.reduce((n, d) => n + d.blocks.length, 0);
check(blocks === 29, "块数不是 29，实际 " + blocks);
check(rows.length === 170, "条目数不是 170，实际 " + rows.length);

// ---------- 1. 6+1 与内容篇幅 ----------
const ids = new Set();
let quoteTotal = 0, linked = 0, exact = 0, outside = 0;
for (const { domain, block, item } of rows) {
  const where = domain.id + "/" + block.id + "/" + (item.id || "?");
  check(typeof item.id === "string" && item.id, where + " 缺 id");
  check(!ids.has(item.id), where + " id 重复：" + item.id);
  ids.add(item.id);
  check(typeof item.title === "string" && item.title, where + " 缺标题");
  check(typeof item.goal === "string" && item.goal, where + " 缺目标");

  // 用户规定：每节课后必须是 6 道单选 + 1 道综合辨析
  check(Array.isArray(item.quiz) && item.quiz.length === 6,
    where + " 单选题不是 6 道，实际 " + (item.quiz || []).length);
  for (const [i, q] of item.quiz.entries()) {
    // 旧课沿用三种题型：单选（4 选项）、判断（2 选项）、多选（数组答案）
    check(q.q && Array.isArray(q.opts) && q.opts.length >= 2,
      where + " quiz[" + i + "] 选项不足 2 个");
    const ans = Array.isArray(q.a) ? q.a : [q.a];
    check(ans.length > 0 && ans.every((a) => Number.isInteger(a) && a >= 0 && a < q.opts.length),
      where + " quiz[" + i + "] 答案下标越界或为空");
    check(typeof q.why === "string" && q.why, where + " quiz[" + i + "] 缺解析");
  }
  const comp = item.composite || {};
  check(Array.isArray(comp.items) && comp.items.length >= 1, where + " 缺综合辨析题");
  check(comp.stimulus && typeof comp.stimulus.text === "string" && comp.stimulus.text,
    where + " 综合题缺材料");
  for (const [i, s] of comp.items.entries()) {
    check(s.q && Array.isArray(s.o) && s.o.length >= 2 && Number.isInteger(s.a),
      where + " 综合题子判断 " + i + " 不完整");
  }

  // 加大篇幅：每条 ≥5 段原文、≥8 条要点
  check(Array.isArray(item.pts) && item.pts.length >= 8,
    where + " 要点不足 8 条，实际 " + (item.pts || []).length);
  check(Array.isArray(item.quote) && item.quote.length >= 5,
    where + " 原文不足 5 段，实际 " + (item.quote || []).length);
  for (const [i, q] of item.quote.entries()) {
    const at = where + " quote[" + i + "]";
    check(q.s && q.src, at + " 缺原文或出处");
    check(typeof q.tr === "string" && q.tr, at + " 缺白话翻译");
    check(typeof q.tip === "string" && q.tip, at + " 缺校读提示");
    check(typeof q.book === "string" && q.book, at + " 缺书库书名");
    check(typeof q.file === "string" && q.file, at + " 缺书库跳转文件");
    check(typeof q.q === "string" && q.q, at + " 缺书库检索词");
    check(typeof q.hit === "boolean", at + " 缺命中标记");
    quoteTotal++;
    linked++;
    if (q.hit) exact++;
    if (q.outside) {
      outside++;
      check(q.hit === false, at + " 库外引文不得标记为精确命中");
    }
  }
}
check(quoteTotal >= 880, "原文总数不足 880，实际 " + quoteTotal);
check(linked === quoteTotal, "仍有原文缺书库链接");
check(outside >= 1, "库外引文未被单独标注");

// ---------- 2. 域结构与学术校读 ----------
check(DATA.domains[0].id === "d1" && /中基筑基/.test(DATA.domains[0].name),
  "第一域不是「中基筑基」");
check(/中医基础理论/.test(DATA.domains[0].sub || "") ||
      /中医基础理论/.test(DATA.domains[0].intro || ""),
  "第一域未说明按《中医基础理论》全程展开");
check(DATA.domains[0].blocks.length === 5, "中基筑基不是 5 块");
check(DATA.domains[0].blocks.reduce((n, b) => n + b.items.length, 0) === 25,
  "中基筑基不是 25 条");
check(DATA.domains[1].id === "d2" && /四诊/.test(DATA.domains[1].name), "第二域不是四诊");
const maiBlock = DATA.domains[1].blocks.find((b) => /诊家枢要/.test(b.name || ""));
check(!!maiBlock && maiBlock.items.length >= 8, "脉诊块（《诊家枢要》）不足 8 讲");

const flat = JSON.stringify(DATA);
check(!flat.includes("后世脉学通说"), "仍残留错误的引文出处标注");
check(flat.includes("伤寒论·平脉法"), "缺少《伤寒论·平脉法》出处标注");

// ---------- 3. 旧结构彻底移除 ----------
for (const legacy of ["var COURSE=[", "window.RD", "S.course.start", "weekfocus", "weekFocus", "startDate"]) {
  check(!html.includes(legacy), "仍残留旧版逐日结构：" + legacy);
}
check(html.includes("没有「今日课程」，没有解锁，没有上限"), "首页未说明已取消每日配额");

// ---------- 4. v2.1 前端能力标记 ----------
for (const marker of ["class=\"qlink", "data-out=", "rdSwitch", "RDMODE", "openBookHash", "trbtn", "trType", "tr=1", "原书未入书库"]) {
  check(html.includes(marker), "页面缺少 v2.1 前端能力：" + marker);
}

// ---------- 5. 书库与白话译本 ----------
const lib = JSON.parse(fs.readFileSync(path.join(root, "library", "index.json"), "utf8"));
check(Array.isArray(lib.items) && lib.items.length >= 32, "书库条目不足 32，实际 " + lib.items.length);
const types = {};
for (const b of lib.items) {
  check(fs.existsSync(path.join(root, "library", b.file)), "书库缺文件：" + b.file);
  check(typeof b.tr === "string" && b.tr, "《" + b.title + "》缺白话译本路径");
  check(fs.existsSync(path.join(root, "library", b.tr)), "《" + b.title + "》译本文件不存在：" + b.tr);
  check(typeof b.trType === "string" && b.trType, "《" + b.title + "》缺译本类型");
  check(Number.isInteger(b.trSections) && b.trSections >= 1, "《" + b.title + "》缺译本节数");
  check(Number.isInteger(b.trQuotes) && b.trQuotes >= 0, "《" + b.title + "》缺引用段落数");
  types[b.trType] = (types[b.trType] || 0) + 1;
}
check((types["全本逐篇译解"] || 0) + (types["全本逐脉译解"] || 0) === 2, "全本译解不是 2 部");
check(types["框架节译"] === 2, "框架节译不是 2 部");
check(types["白话导读"] === 28, "白话导读不是 28 部");
check(typeof lib.translation_note === "string" && /不冒充全译/.test(lib.translation_note),
  "书库索引未声明译本边界");

const zjsy = fs.readFileSync(path.join(root, "library", "诊家枢要.txt"), "utf8");
for (const key of ["六部中俱带弦", "如鸡践地", "肥人责浮", "不相戾", "伤寒论·平脉法", "脉阴阳类成"]) {
  check(zjsy.includes(key), "《诊家枢要》缺关键内容：" + key);
}
const zjsyTr = fs.readFileSync(path.join(root, "library", "白话", "诊家枢要.txt"), "utf8");
check(/全本逐篇白话译解/.test(zjsyTr) && /译本说明/.test(zjsyTr), "《诊家枢要》译本格式不对");

console.log(
  "校验通过：8 域 / 29 块 / 170 条；" +
  "6+1 全覆盖，原文 " + quoteTotal + " 段（白话 100%、书库链接 100%、精确命中 " + exact +
  "、库外参读 " + outside + "）；书库 " + lib.items.length + " 部译本齐备。"
);
