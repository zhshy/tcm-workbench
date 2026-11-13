#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const engine = fs.readFileSync(path.join(__dirname, "course-engine.js"), "utf8").trim();
const htmlPath = path.join(root, "index.html");
const begin = "/* BEGIN EMBEDDED COURSE ENGINE */";
const end = "/* END EMBEDDED COURSE ENGINE */";
const html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf(begin);
const finish = html.indexOf(end, start + begin.length);
if (start < 0 || finish < 0) throw new Error("index.html 缺少课程引擎嵌入标记");
fs.writeFileSync(htmlPath, html.slice(0, start + begin.length) + "\n" + engine + "\n" + html.slice(finish), "utf8");
console.log("已同步课程引擎到 index.html");
