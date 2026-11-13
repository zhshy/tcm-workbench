#!/usr/bin/env node
// v2.0 校验：域-块-条目数据完整性 + 书库文件齐备 + 旧结构已清除。
// 用法：npm run validate
const fs = require("node:fs");
const path = require("node:path");
const { root, readHtml, loadData, allItems } = require("./load-data.js");

function check(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = readHtml();
const DATA = loadData();

check(DATA.version === "2.0.0", "数据版本不是 2.0.0");
check(Array.isArray(DATA.domains), "domains 必须是数组");
check(DATA.domains.length === 8, "域数不是 8，实际 " + DATA.domains.length);

const blocks = DATA.domains.reduce((n, d) => n + d.blocks.length, 0);
check(blocks === 27, "块数不是 27，实际 " + blocks);

const rows = allItems(DATA);
check(rows.length === 152, "条目数不是 152，实际 " + rows.length);

const ids = new Set();
for (const { domain, block, item } of rows) {
  const where = domain.id + "/" + block.id + "/" + (item.id || "?");
  check(typeof item.id === "string" && item.id, where + " 缺 id");
  check(!ids.has(item.id), where + " id 重复：" + item.id);
  ids.add(item.id);
  check(typeof item.title === "string" && item.title, where + " 缺标题");
  check(typeof item.goal === "string" && item.goal, where + " 缺目标");
  check(Array.isArray(item.pts) && item.pts.length >= 3, where + " 要点不足 3 条");
  check(Array.isArray(item.quote) && item.quote.length >= 1, where + " 缺原文");
  for (const [i, q] of item.quote.entries()) {
    check(q.s && q.src, where + " quote[" + i + "] 缺原文或出处");
    check(typeof q.tr === "string" && q.tr, where + " quote[" + i + "] 缺白话");
    check(typeof q.tip === "string" && q.tip, where + " quote[" + i + "] 缺看这里");
  }
}

// 第一域筑基，第二域四诊且以脉诊为重点
check(DATA.domains[0].id === "d1" && /筑基/.test(DATA.domains[0].name), "第一域不是七日筑基");
check(DATA.domains[1].id === "d2" && /四诊/.test(DATA.domains[1].name), "第二域不是四诊");
const maiBlock = DATA.domains[1].blocks.find((b) => /诊家枢要/.test(b.name || ""));
check(!!maiBlock && maiBlock.items.length >= 8, "脉诊块（《诊家枢要》）不足 8 讲");

// 旧的「天」驱动逻辑必须彻底移除（首页导语里的「没有今日课程」是说明文字，不算遗留）
for (const legacy of ["var COURSE=[", "window.RD", "S.course.start", "weekfocus", "weekFocus", "startDate"]) {
  check(!html.includes(legacy), "仍残留旧版逐日结构：" + legacy);
}
check(html.includes("没有「今日课程」，没有解锁，没有上限"), "首页未说明已取消每日配额");

// 书库：索引里每本书都要有文件
const lib = JSON.parse(fs.readFileSync(path.join(root, "library", "index.json"), "utf8"));
check(Array.isArray(lib.items) && lib.items.length >= 32, "书库条目不足 32，实际 " + lib.items.length);
for (const b of lib.items) {
  check(fs.existsSync(path.join(root, "library", b.file)), "书库缺文件：" + b.file);
}
const zjsy = fs.readFileSync(path.join(root, "library", "诊家枢要.txt"), "utf8");
for (const key of ["六部中俱带弦", "如鸡践地", "肥人责浮", "不相戾", "伤寒论·平脉法", "脉阴阳类成"]) {
  check(zjsy.includes(key), "《诊家枢要》缺关键内容：" + key);
}

// 引文出处不能有已修正掉的错误说法
const flat = JSON.stringify(DATA);
check(!flat.includes("后世脉学通说"), "仍残留错误的引文出处标注");
check(flat.includes("伤寒论·平脉法"), "缺少《伤寒论·平脉法》出处标注");

console.log("校验通过：8 域 / 27 块 / 152 条，书库 " + lib.items.length + " 部，引文出处与旧结构检查通过。");
