// 从单文件 index.html 中取出内嵌的 DATA（v2.0 域-块-条目结构）。
// 供 tools/validate-workbench.js 与 tests/domains.test.js 共用。
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readHtml() {
  return fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/\r\n/g, "\n");
}

function loadData() {
  const html = readHtml();
  const marker = "var DATA = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("无法定位 index.html 内嵌 DATA 数据");
  const from = start + marker.length;
  // 注入的是紧凑单行 JSON（字符串内换行已被转义），故第一个 ;\n 即数据结束
  const end = html.indexOf(";\n", from);
  if (end < 0) throw new Error("无法定位 DATA 数据结尾");
  return JSON.parse(html.slice(from, end));
}

function allItems(data) {
  const out = [];
  for (const d of data.domains) {
    for (const b of d.blocks) {
      for (const it of b.items) out.push({ domain: d, block: b, item: it });
    }
  }
  return out;
}

module.exports = { root, readHtml, loadData, allItems };
