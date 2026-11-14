#!/usr/bin/env node
// 确认完整构建后的 domains.json 与单页 index.html 内嵌数据一致。
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "build", "domains.json");
const htmlPath = path.join(root, "index.html");
const libraryPath = path.join(root, "library", "index.json");
const swPath = path.join(root, "service-worker.js");

const sourceData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");
const startMarker = "var DATA = ";
const start = html.indexOf(startMarker);
assert.notEqual(start, -1, "index.html 缺少 DATA 注入入口");

const jsonStart = start + startMarker.length;
// 兼容 LF / CRLF：Windows 本地重建的产物可能带 \r\n。
const tail = html.slice(jsonStart);
const boundary = /;\r?\n\(function \(root, factory\)/.exec(tail);
const end = boundary ? jsonStart + boundary.index : -1;
assert.notEqual(end, -1, "index.html 缺少状态辅助模块注入边界");
const embeddedData = JSON.parse(html.slice(jsonStart, end));

assert.equal(sourceData.version, "2.3.0", "build/domains.json 版本不正确");
assert.deepEqual(embeddedData, sourceData, "index.html 内嵌课程数据与 build/domains.json 不一致");
assert.ok(!html.includes("/*__DATA__*/ null"), "DATA 占位符未替换");
assert.ok(!html.includes("/*__STATE_HELPERS__*/"), "学习记录辅助模块占位符未替换");
assert.ok(html.includes("function parseBackup") || html.includes("parseBackup: parseBackup"), "备份校验模块未注入");

const library = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
assert.equal(library.items.length, 32, "书库数量不正确");
for (const book of library.items) {
  assert.ok(book.work_id && book.license_status, book.title + " 缺少文献/授权元数据");
}
const sw = fs.readFileSync(swPath, "utf8");
assert.ok(sw.includes('tcm-workbench-static-v5'), "Service Worker 缓存版本未升级");
assert.ok(sw.includes("networkFirst(request)"), "书库索引缺少 Network First 策略");
assert.ok(sw.includes("staleWhileRevalidate(request, event)"), "书库正文缺少后台更新策略");

console.log("生成一致性通过：domains.json ↔ index.html；32 部书目元数据齐备；PWA 缓存策略已注入。");
