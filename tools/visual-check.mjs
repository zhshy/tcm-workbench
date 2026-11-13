#!/usr/bin/env node
// v2.1 无头浏览器回归检查：真实点击 / hash 深链 / 截图 / 窄屏溢出。
// 用法：node tools/visual-check.mjs
// 依赖本机 Edge；可用 EDGE_PATH / BASE_URL / OUT_DIR 覆盖。
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const EDGE = process.env.EDGE_PATH ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8899/index.html";
const OUT = process.env.OUT_DIR || path.resolve("shots");
const PORT = Number(process.env.CDP_PORT || 9333);
const PROFILE = path.join(os.tmpdir(), "tcm-v21-cdp-" + process.pid);

const results = [];
function ok(name, cond, extra) {
  results.push({ name, pass: !!cond, extra: extra === undefined ? "" : String(extra) });
  if (!cond) console.log("  ✗ " + name + (extra !== undefined ? "  → " + extra : ""));
  else console.log("  ✓ " + name + (extra !== undefined ? "  (" + extra + ")" : ""));
}

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
  "--remote-allow-origins=*", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + PROFILE, "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });

async function waitPort(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch (_) { /* 还没起来 */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Edge 调试端口未就绪");
}

let ws, seq = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expr) {
  const r = await send("Runtime.evaluate", {
    expression: expr, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error("JS 异常：" + (r.exceptionDetails.text || "") + " :: " + expr);
  return r.result.value;
}
async function waitFor(expr, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await js(expr);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error("等待超时：" + expr);
}
async function go(hash) {
  await js(`location.hash = ${JSON.stringify(hash)}; true`);
  await new Promise((r) => setTimeout(r, 260));
}
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(r.data, "base64"));
  return p;
}
async function reload(url) {
  await send("Page.navigate", { url });
  await waitFor(`document.readyState === "complete" && !!window.__APP_OK__ || (document.readyState === "complete" && !!document.getElementById("mQ"))`, 12000);
  await new Promise((r) => setTimeout(r, 300));
}

let main;
try {
  await waitPort();
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find((t) => t.type === "page");
  if (!page) throw new Error("找不到可调试页面");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  fs.mkdirSync(OUT, { recursive: true });

  console.log("\n[1] 首页统计与导航");
  await reload(BASE + "#/");
  await waitFor(`Number(document.getElementById("mQ").textContent) > 0`, 8000);
  const home = await js(`(() => {
    const cards = document.querySelectorAll("#home .dcard, #v-home .dcard, .domain-card").length;
    return {
      quotes: Number(document.getElementById("mQ").textContent),
      dataQuotes: DATA.domains.reduce((n, d) => n + d.blocks.reduce((m, b) => m + b.items.reduce((k, i) => k + (i.quote || []).length, 0), 0), 0),
      nav: document.querySelectorAll("#nav button").length,
      cards: cards,
      hasQuota: document.body.innerText.includes("今日课程") && document.body.innerText.includes("解锁"),
      txt: (document.querySelector("#v-home h1") || {}).textContent || "",
    };
  })()`);
  ok("首页原文数与内嵌 DATA 一致", home.quotes === home.dataQuotes && home.quotes >= 880, home.quotes + " / " + home.dataQuotes);
  ok("导航 8 域 + 全部/书库/我的 = 11", home.nav === 11, home.nav);
  ok("首页标题为 v2.1 文案", /八个域/.test(home.txt), home.txt.trim());
  await shot("v21-01-home.png");

  console.log("\n[2] 条目页 6+1 与原文卡片");
  await go("#/i/1-1");
  await waitFor(`document.querySelectorAll("#itemBody .q").length > 0`, 8000);
  const item = await js(`(() => {
    const q = document.querySelectorAll('#quizBox > .q[data-q]').length;
    const c = document.querySelectorAll('.composite .q[data-c]').length;
    const quotes = document.querySelectorAll('#itemBody .quote');
    let withTr = 0, withTip = 0, withLink = 0;
    quotes.forEach(x => {
      if (x.querySelector('.tr')) withTr++;
      if (x.querySelector('.tip')) withTip++;
      if (x.querySelector('.qlink')) withLink++;
    });
    const links = [...document.querySelectorAll('.qlink')].map(a => ({f:a.dataset.f,q:a.dataset.q,hit:a.dataset.hit}));
    return { q, c, nq: quotes.length, withTr, withTip, withLink, links,
             title: (document.querySelector('#itemBody h2')||{}).textContent||'' };
  })()`);
  ok("6 道单选", item.q === 6, item.q);
  ok("1 组综合辨析（含子判断）", item.c >= 1, item.c);
  ok("原文 5 段", item.nq === 5, item.nq);
  ok("每段都有白话", item.withTr === item.nq, item.withTr + "/" + item.nq);
  ok("每段都有校读提示", item.withTip === item.nq, item.withTip + "/" + item.nq);
  ok("每段都有书库跳转链接", item.withLink === item.nq, item.withLink + "/" + item.nq);
  ok("链接带书名/检索词/命中标记", item.links.every(x => x.f && x.q && x.hit !== undefined), item.links.length);
  await shot("v21-02-item.png");

  console.log("\n[2b] 库外引文标注与四诊篇幅补强");
  await go("#/i/2-5");
  await waitFor(`document.querySelectorAll("#itemBody .quote").length >= 5`, 8000);
  const thin = await js(`(() => {
    const qs=[...document.querySelectorAll('#itemBody .quote')];
    const out=[...document.querySelectorAll('#itemBody .qlink[data-out="1"]')];
    return { nq:qs.length, pts:document.querySelectorAll('#itemBody .pts li').length,
             tr:qs.filter(x=>x.querySelector('.tr')).length,
             links:qs.filter(x=>x.querySelector('.qlink')).length,
             out:out.length, label:out[0]?out[0].textContent:'' };
  })()`);
  ok("四诊条目已补到 ≥5 段原文", thin.nq >= 5, thin.nq);
  ok("四诊条目要点 ≥8 条", thin.pts >= 8, thin.pts);
  ok("补编原文同样有白话与链接", thin.tr === thin.nq && thin.links === thin.nq, thin.tr + "/" + thin.links);
  ok("库外引文标注「原书未入书库」而非冒充可跳转", thin.out >= 1 && /原书未入书库/.test(thin.label), thin.label.trim());

  console.log("\n[2c] 混合题型判分：多选题可选全并判对");
  await go("#/i/3-1");
  await waitFor(`document.querySelectorAll("#quizBox > .q[data-q]").length === 6`, 8000);
  const grade = await js(`(() => {
    const it = DATA.domains.flatMap(d => d.blocks).flatMap(b => b.items).find(x => x.id === '3-1');
    document.querySelectorAll('#quizBox > .q[data-q]').forEach(qEl => {
      const qi = +qEl.dataset.q, q = it.quiz[qi];
      const ans = Array.isArray(q.a) ? q.a : [q.a];
      ans.forEach(a => { const b = qEl.querySelector('.opt[data-o="' + a + '"]'); if (b) b.click(); });
    });
    document.getElementById('btnSubmit').click();
    return { score: document.getElementById('qScore').textContent,
             multi: document.querySelectorAll('#quizBox .q[data-multi="1"]').length,
             right: document.querySelectorAll('#quizBox .opt.right').length };
  })()`);
  ok("含多选题且标注为可多选", grade.multi >= 1, grade.multi);
  ok("全部按标准答案作答得 6/6", grade.score === "6/6", grade.score + " / 正确项高亮 " + grade.right);
  await go("#/i/1-1");

  console.log("\n[3] 点击原文链接 → 打开原书并高亮");
  await js(`document.querySelector('#itemBody .qlink').click(); true`);
  await waitFor(`document.getElementById("reader").classList.contains("on") && document.getElementById("rdText").textContent.length > 200`, 9000);
  const rd = await js(`(() => ({
    hash: location.hash,
    title: document.getElementById("rdTitle").textContent,
    marks: document.querySelectorAll("#rdText mark").length,
    foot: document.getElementById("rdFoot").textContent,
    find: document.getElementById("rdFind").value,
    sw: document.getElementById("rdSwitch").textContent,
    len: document.getElementById("rdText").textContent.length,
  }))()`);
  ok("hash 切到 #/b/ 深链", /^#\/b\//.test(rd.hash), rd.hash.slice(0, 70));
  ok("阅读器检索并高亮命中", rd.marks >= 1, rd.marks + " 处 mark");
  ok("检索框带入原文片段", rd.find.length > 0, rd.find.slice(0, 24));
  ok("底部显示命中计数", /共 \d+ 处/.test(rd.foot), rd.foot);
  ok("原文态按钮提示「白话译本」", rd.sw === "白话译本", rd.sw);
  await shot("v21-03-reader-raw.png");

  console.log("\n[4] 关闭阅读器回到条目页");
  await js(`document.getElementById("rdClose").click(); true`);
  await new Promise((r) => setTimeout(r, 200));
  const closed = await js(`({on:document.getElementById("reader").classList.contains("on"),hash:location.hash,view:document.getElementById("v-item").classList.contains("on")})`);
  ok("阅读器已关闭", closed.on === false);
  ok("返回条目页视图", closed.view === true, closed.hash);

  console.log("\n[5] 书库「译」按钮与译本类型标签");
  await go("#/shelf");
  await waitFor(`document.querySelectorAll("#shelf .book").length >= 32`, 8000);
  const shelf = await js(`(() => {
    const books = document.querySelectorAll("#shelf .book");
    const tr = document.querySelectorAll("#shelf .trbtn");
    const tags = [...document.querySelectorAll("#shelf .ttag")].map(x=>x.textContent);
    return { n: books.length, tr: tr.length, tags,
             count: Number(document.getElementById("libCount").textContent),
             full: tags.filter(t=>/全本/.test(t)).length,
             part: tags.filter(t=>/节译|框架/.test(t)).length };
  })()`);
  ok("书库 32 部", shelf.n === 32, shelf.n);
  ok("计数显示 32", shelf.count === 32, shelf.count);
  ok("每部书都有「译」按钮", shelf.tr === 32, shelf.tr);
  ok("每部书都有译本类型标签", shelf.tags.length === 32, shelf.tags.length);
  ok("全本译解 2 部、框架节译 2 部", shelf.full === 2 && shelf.part === 2, "全本 " + shelf.full + " / 节译 " + shelf.part);
  await shot("v21-04-shelf.png");

  console.log("\n[6] 点「译」进入白话译本 / 切回原文");
  await js(`(() => { const b=[...document.querySelectorAll('#shelf .book')].find(x=>x.dataset.t==='诊家枢要'); b.querySelector('.trbtn').click(); return true; })()`);
  await waitFor(`document.getElementById("rdTitle").textContent.includes("白话译本") && document.getElementById("rdText").textContent.length > 500`, 9000);
  const trMode = await js(`(() => ({
    hash: location.hash,
    title: document.getElementById("rdTitle").textContent,
    sw: document.getElementById("rdSwitch").textContent,
    tag: document.getElementById("rdTag").textContent,
    tagShown: document.getElementById("rdTag").style.display !== "none",
    head: document.getElementById("rdText").textContent.slice(0, 120),
    foot: document.getElementById("rdFoot").textContent,
  }))()`);
  ok("阅读器标题标注「白话译本」", /白话译本/.test(trMode.title), trMode.title);
  ok("译本类型标签可见", trMode.tagShown && /全本逐篇译解/.test(trMode.tag), trMode.tag);
  ok("按钮变为「回原文」", trMode.sw === "回原文", trMode.sw);
  ok("译本正文已加载", /诊家枢要/.test(trMode.head) || /译本/.test(trMode.head), trMode.head.replace(/\n/g," ").slice(0, 60));
  ok("hash 带 tr=1 深链", /tr=1/.test(trMode.hash), trMode.hash.slice(0, 80));
  await shot("v21-05-reader-tr.png");
  await js(`document.getElementById("rdSwitch").click(); true`);
  await waitFor(`document.getElementById("rdTitle").textContent.indexOf("白话译本") < 0 && document.getElementById("rdText").textContent.length > 500`, 9000);
  const back = await js(`({title:document.getElementById("rdTitle").textContent,sw:document.getElementById("rdSwitch").textContent,hash:location.hash})`);
  ok("切回原文成功", !/白话译本/.test(back.title) && back.sw === "白话译本", back.title);

  console.log("\n[7] 直接访问深链（冷启动）");
  const deepTr = BASE + "#/b/" + encodeURIComponent("诊家枢要.txt") + "?tr=1";
  await reload(deepTr);
  await waitFor(`document.getElementById("reader").classList.contains("on") && document.getElementById("rdText").textContent.length > 500`, 10000);
  const coldTr = await js(`({title:document.getElementById("rdTitle").textContent,tag:document.getElementById("rdTag").textContent,shown:document.getElementById("rdTag").style.display !== "none"})`);
  ok("冷启动 tr=1 打开白话译本", /白话译本/.test(coldTr.title) && coldTr.shown, coldTr.title + " / " + coldTr.tag);
  const deepRaw = BASE + "#/b/" + encodeURIComponent("诊家枢要.txt") + "?q=" + encodeURIComponent("六部中俱带弦");
  await reload(deepRaw);
  await waitFor(`document.querySelectorAll("#rdText mark").length >= 1`, 10000);
  const coldRaw = await js(`({title:document.getElementById("rdTitle").textContent,marks:document.querySelectorAll("#rdText mark").length,foot:document.getElementById("rdFoot").textContent})`);
  ok("冷启动 q= 打开原书并高亮", coldRaw.marks >= 1 && !/白话译本/.test(coldRaw.title), coldRaw.marks + " 处 / " + coldRaw.foot);

  console.log("\n[8] 跨域抽查 6+1");
  await reload(BASE + "#/");
  const ids = await js(`(() => {
    const out = [];
    const ds = DATA.domains;
    ds.forEach(d => { const b=d.blocks[0]; if(b&&b.items[0]) out.push(b.items[0].id); });
    out.push(DATA.domains[0].blocks[4].items.slice(-1)[0].id);
    return out;
  })()`);
  for (const iid of ids) {
    await go("#/i/" + iid);
    await waitFor(`document.querySelector("#itemBody h2") && document.querySelectorAll("#quizBox > .q[data-q]").length >= 1`, 8000);
    const r = await js(`({q:document.querySelectorAll('#quizBox > .q[data-q]').length,c:document.querySelectorAll('.composite .q[data-c]').length,nq:document.querySelectorAll('#itemBody .quote').length,links:document.querySelectorAll('#itemBody .qlink').length,tr:document.querySelectorAll('#itemBody .quote .tr').length})`);
    ok("条目 " + iid + " 为 6+1、原文有白话和跳转", r.q === 6 && r.c >= 1 && r.nq >= 1 && r.tr === r.nq && r.links >= 1, JSON.stringify(r));
  }

  console.log("\n[9] 窄屏 500px 布局无横向溢出");
  await send("Emulation.setDeviceMetricsOverride", { width: 500, height: 900, deviceScaleFactor: 1, mobile: false });
  await js(`document.getElementById("rdClose").click(); true`);
  await go("#/shelf");
  await new Promise((r) => setTimeout(r, 350));
  const narrow = await js(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,books:document.querySelectorAll('#shelf .book').length,reader:document.getElementById("reader").classList.contains("on"),view:document.getElementById("v-shelf").classList.contains("on")})`);
  ok("500px 无横向溢出", narrow.sw <= narrow.cw + 1, narrow.sw + " / " + narrow.cw);
  ok("窄屏显示书库且阅读器已关闭", narrow.view && !narrow.reader && narrow.books >= 32, narrow.books + " 部");
  await shot("v21-06-narrow500.png");
  await send("Emulation.clearDeviceMetricsOverride");

  const fail = results.filter(x => !x.pass);
  console.log("\n———— 汇总 ————");
  console.log(`通过 ${results.length - fail.length}/${results.length} 项；截图目录 ${OUT}`);
  if (fail.length) {
    console.log("失败项：" + fail.map(x => x.name).join("、"));
    process.exitCode = 1;
  }
} catch (e) {
  console.error("检查中断：", e.stack || e.message);
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch (_) {}
  try { edge.kill(); } catch (_) {}
}
