/**
 * M4 五行生克制化乘侮环 · 3D 交互原型
 * 仅在图谱页 / 条目页点“3D 交互演示”时按需加载；
 * 静态 webp 始终保留，WebGL 不可用时由外层回退。
 */
import * as THREE from "../vendor/three.module.min.js";

const ORDER = ["fire", "earth", "metal", "water", "wood"]; // 顺时针＝相生
const ANGLE = {
  fire: -Math.PI / 2,
  earth: -Math.PI / 10,
  metal: Math.PI * 3 / 10,
  water: Math.PI * 7 / 10,
  wood: Math.PI * 11 / 10
};

const EL = {
  wood: { name: "木", organ: "肝、胆", nature: "曲直、升发", season: "春", flavor: "酸", color: "青", emotion: "怒", items: ["1-5", "1-6"] },
  fire: { name: "火", organ: "心、小肠", nature: "炎上、温煦", season: "夏", flavor: "苦", color: "赤", emotion: "喜", items: ["1-5", "1-6"] },
  earth: { name: "土", organ: "脾、胃", nature: "稼穑、承载", season: "长夏", flavor: "甘", color: "黄", emotion: "思", items: ["1-5", "1-6"] },
  metal: { name: "金", organ: "肺、大肠", nature: "从革、肃降", season: "秋", flavor: "辛", color: "白", emotion: "悲", items: ["1-5", "1-6"] },
  water: { name: "水", organ: "肾、膀胱", nature: "润下、闭藏", season: "冬", flavor: "咸", color: "黑", emotion: "恐", items: ["1-5", "1-6"] }
};
const SHENG = { fire: "earth", earth: "metal", metal: "water", water: "wood", wood: "fire" };
const KE = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const BEI_SHENG = invert(SHENG);
const BEI_KE = invert(KE);

function invert(map) {
  const out = {};
  Object.keys(map).forEach(function (k) { out[map[k]] = k; });
  return out;
}

const state = {
  open: false,
  selected: null,
  mode: "normal", // normal | excess | deficit
  showSheng: true,
  showKe: true,
  plan: false,
  reduced: false,
  dragging: false,
  hover: null,
  moved: 0,
  tourTimer: 0,
  tourStep: -1
};

let el = null;
let opts = {};
let scene = null;
let camera = null;
let renderer = null;
let raf = 0;
let prevFocus = null;
let stageRect = { width: 1, height: 1 };
let nodeObjs = {};
let nodeLabels = {};
let edgeObjs = [];
let shengGroup = null;
let keGroup = null;
let pathGroup = null;
let pathLabels = [];
let particles = [];
let pathParticles = [];
let lastPathKey = null;
let userZoom = false;
const DEFAULT_PHI = 0.9;
const cam = { theta: 0, phi: 0.9, dist: 11.4, tTheta: 0, tPhi: 0.9, tDist: 11.4 };
const tmpV = new THREE.Vector3();

/* ---------- 对外接口 ---------- */
export function open(options) {
  opts = options || {};
  if (state.open) return;
  cacheEl();
  state.open = true;
  state.selected = null;
  state.mode = "normal";
  state.hover = null;
  state.plan = false;
  state.showSheng = true;
  state.showKe = true;
  state.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  prevFocus = document.activeElement;
  el.root.classList.add("on");
  document.body.style.overflow = "hidden";
  buildScene();
  bindOnce();
  renderPanel();
  refresh();
  startLoop();
  try { el.close.focus({ preventScroll: true }); } catch (e) {}
}

export function close() {
  if (!state.open) return;
  state.open = false;
  stopTour();
  cancelAnimationFrame(raf);
  el.root.classList.remove("on");
  document.body.style.overflow = "";
  disposeScene();
  if (prevFocus && prevFocus.focus) {
    try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  prevFocus = null;
}

export function isOpen() {
  return state.open;
}

/* ---------- DOM ---------- */
function cacheEl() {
  if (el) return;
  el = {
    root: document.getElementById("wx"),
    stage: document.getElementById("wxStage"),
    host: document.getElementById("wxCanvas"),
    labels: document.getElementById("wxLabels"),
    panel: document.getElementById("wxPanel"),
    live: document.getElementById("wxLive"),
    state: document.getElementById("wxState"),
    close: document.getElementById("wxClose"),
    stat: document.getElementById("wxStatic"),
    tour: document.getElementById("wxTour"),
    plan: document.getElementById("wxPlan"),
    sheng: document.getElementById("wxSheng"),
    ke: document.getElementById("wxKe"),
    reset: document.getElementById("wxReset")
  };
}

let bound = false;
function bindOnce() {
  if (bound) return;
  bound = true;
  el.close.addEventListener("click", close);
  el.stat.addEventListener("click", function () {
    close();
    if (opts.onStatic) opts.onStatic();
  });
  el.tour.addEventListener("click", toggleTour);
  el.plan.addEventListener("click", togglePlan);
  el.sheng.addEventListener("click", function () { state.showSheng = !state.showSheng; syncToolState(); refresh(); });
  el.ke.addEventListener("click", function () { state.showKe = !state.showKe; syncToolState(); refresh(); });
  el.reset.addEventListener("click", resetView);
  el.state.addEventListener("click", resetView);
  el.panel.addEventListener("click", onPanelClick);
  el.labels.addEventListener("click", onLabelClick);
  el.labels.addEventListener("pointerover", function (e) {
    var n = e.target.closest("[data-key]");
    if (!n || state.selected) return;
    state.hover = n.dataset.key;
    refresh();
  });
  el.labels.addEventListener("pointerout", function (e) {
    var n = e.target.closest("[data-key]");
    if (!n || state.selected) return;
    state.hover = null;
    refresh();
  });
  el.labels.addEventListener("focusin", function (e) {
    var n = e.target.closest("[data-key]");
    if (!n || state.selected) return;
    state.hover = n.dataset.key;
    refresh();
  });
  el.labels.addEventListener("focusout", function (e) {
    if (!state.selected) { state.hover = null; refresh(); }
  });
  el.root.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    if (state.open && document.hidden) cancelAnimationFrame(raf);
    else if (state.open) startLoop();
  });
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (mq) {
    var onChange = function () { state.reduced = mq.matches; if (state.reduced) stopTour(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

function onLabelClick(e) {
  var node = e.target.closest("[data-key]");
  if (node) {
    var k = node.dataset.key;
    if (state.selected === k && state.mode === "normal") state.selected = null;
    else { state.selected = k; state.mode = "normal"; }
    state.hover = null;
    stopTour();
    renderPanel();
    refresh();
    return;
  }
}

function onPanelClick(e) {
  var mode = e.target.closest("[data-mode]");
  if (mode) {
    state.mode = mode.dataset.mode;
    stopTour();
    renderPanel();
    refresh();
    return;
  }
  var a = e.target.closest("a[href^='#/']");
  if (a) close();
}

function onKeydown(e) {
  if (e.key === "Escape") { e.preventDefault(); close(); return; }
  if (e.key === "Tab") {
    var items = Array.prototype.filter.call(
      el.root.querySelectorAll("button, a[href], summary"),
      function (n) { return !n.disabled && n.offsetParent !== null; }
    );
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")) return;
  if (e.key === "ArrowLeft") { cam.tTheta -= 0.12; e.preventDefault(); }
  else if (e.key === "ArrowRight") { cam.tTheta += 0.12; e.preventDefault(); }
  else if (e.key === "ArrowUp") { cam.tPhi = clamp(cam.tPhi - 0.07, 0.18, 1.34); e.preventDefault(); }
  else if (e.key === "ArrowDown") { cam.tPhi = clamp(cam.tPhi + 0.07, 0.18, 1.34); e.preventDefault(); }
  else if (e.key === "+" || e.key === "=") { cam.tDist = clamp(cam.tDist - 0.7, 7, 16); userZoom = true; e.preventDefault(); }
  else if (e.key === "-") { cam.tDist = clamp(cam.tDist + 0.7, 7, 16); userZoom = true; e.preventDefault(); }
}

/* ---------- 场景 ---------- */
function buildScene() {
  scene = new THREE.Scene();
  lastPathKey = null;
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  el.host.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = "none";

  scene.add(new THREE.HemisphereLight(0xbcd2ee, 0x1a130a, 0.5));
  var key = new THREE.DirectionalLight(0xffe4b6, 1.15);
  key.position.set(4.5, 6.5, 3.5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x6f8fb5, 0.55);
  rim.position.set(-4.5, 2.5, -5);
  scene.add(rim);

  buildPlate();
  buildNodes();
  buildEdges();
  bindPointer();
  resize();
  cam.theta = cam.tTheta;
  cam.phi = cam.tPhi;
  cam.dist = cam.tDist;
}

function buildPlate() {
  var bronze = new THREE.MeshStandardMaterial({ color: 0x241d13, metalness: 0.72, roughness: 0.52 });
  var plate = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.12, 96), bronze);
  plate.position.y = -0.06;
  scene.add(plate);

  var rimMat = new THREE.MeshStandardMaterial({ color: 0xc8a15a, metalness: 0.88, roughness: 0.26, emissive: 0x5a4016, emissiveIntensity: 0.3 });
  var rim = new THREE.Mesh(new THREE.TorusGeometry(3.26, 0.03, 10, 160), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.01;
  scene.add(rim);

  var ringMat = new THREE.MeshBasicMaterial({ color: 0xc8a15a, transparent: true, opacity: 0.32 });
  [1.0, 1.9, 2.75].forEach(function (r) {
    var ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 128), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.012;
    scene.add(ring);
  });

  var tickGeo = new THREE.BoxGeometry(0.018, 0.006, 0.12);
  for (var i = 0; i < 24; i++) {
    var a = i / 24 * Math.PI * 2;
    var tick = new THREE.Mesh(tickGeo, ringMat);
    tick.position.set(Math.cos(a) * 3.1, 0.014, Math.sin(a) * 3.1);
    tick.rotation.y = -a;
    scene.add(tick);
  }
}

function nodePos(key, y) {
  var r = 2.26;
  return new THREE.Vector3(Math.cos(ANGLE[key]) * r, y == null ? 0.06 : y, Math.sin(ANGLE[key]) * r);
}

function buildNodes() {
  nodeObjs = {};
  nodeLabels = {};
  Object.keys(EL).forEach(function (k) {
    var group = new THREE.Group();
    group.position.copy(nodePos(k, 0));

    var discMat = new THREE.MeshStandardMaterial({ color: 0x6d5435, metalness: 0.82, roughness: 0.34, transparent: true, opacity: 1 });
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.11, 64), discMat);
    disc.position.y = 0.055;
    group.add(disc);

    var ringMat = new THREE.MeshStandardMaterial({ color: 0xe0bb72, metalness: 0.9, roughness: 0.24, emissive: 0x5e4416, emissiveIntensity: 0.4, transparent: true, opacity: 1 });
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.019, 8, 64), ringMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.11;
    group.add(rim);

    var innerMat = new THREE.MeshBasicMaterial({ color: 0xc8a15a, transparent: true, opacity: 0.35 });
    var inner = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.005, 6, 48), innerMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.112;
    group.add(inner);

    scene.add(group);
    nodeObjs[k] = { group: group, mats: [discMat, ringMat, innerMat] };

    var b = document.createElement("button");
    b.type = "button";
    b.className = "wx-node";
    b.dataset.key = k;
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", EL[k].name + "，" + EL[k].organ);
    b.innerHTML = "<b>" + EL[k].name + "</b><span>" + EL[k].organ + "</span>";
    el.labels.appendChild(b);
    nodeLabels[k] = b;
  });

  var seal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x2f2619, metalness: 0.7, roughness: 0.45 })
  );
  seal.position.y = 0.03;
  scene.add(seal);
}

function shengCurve(a, b) {
  var A = nodePos(a, 0.11);
  var B = nodePos(b, 0.11);
  var mid = A.clone().add(B).multiplyScalar(0.5);
  var dir = new THREE.Vector3(mid.x, 0, mid.z).normalize();
  mid.set(dir.x * 2.62, 0.2, dir.z * 2.62);
  return new THREE.QuadraticBezierCurve3(A, mid, B);
}

function straightCurve(a, b, y) {
  return new THREE.LineCurve3(nodePos(a, y), nodePos(b, y));
}

function arrow(group, curve, material, size, at) {
  var p = curve.getPoint(at == null ? 0.9 : at);
  var t = curve.getTangent(at == null ? 0.9 : at).normalize();
  var cone = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.5, 10), material);
  cone.position.copy(p);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
  group.add(cone);
  return cone;
}

function buildEdges() {
  shengGroup = new THREE.Group();
  keGroup = new THREE.Group();
  scene.add(shengGroup);
  scene.add(keGroup);
  edgeObjs = [];
  particles = [];

  Object.keys(SHENG).forEach(function (a) {
    var b = SHENG[a];
    var curve = shengCurve(a, b);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xd9b878, metalness: 0.8, roughness: 0.3,
      emissive: 0x8a6520, emissiveIntensity: 0.5, transparent: true, opacity: 0.9
    });
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 6, false), mat);
    shengGroup.add(tube);
    var dotMat = new THREE.MeshBasicMaterial({ color: 0xf3dda6, transparent: true, opacity: 0.95 });
    edgeObjs.push({ type: "sheng", a: a, b: b, group: shengGroup, mats: [mat], dotMat: dotMat, base: 0.9 });

    for (var i = 0; i < 5; i++) {
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), dotMat);
      shengGroup.add(dot);
      particles.push({ mesh: dot, curve: curve, t: i / 5, speed: 0.028 });
    }
  });

  Object.keys(KE).forEach(function (a) {
    var b = KE[a];
    var curve = straightCurve(a, b, 0.09);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xc8a15a, metalness: 0.75, roughness: 0.35,
      emissive: 0x4d360f, emissiveIntensity: 0.4, transparent: true, opacity: 0.66
    });
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 1, 0.01, 6, false), mat);
    keGroup.add(tube);
    arrow(keGroup, curve, mat, 0.045, 0.86);
    edgeObjs.push({ type: "ke", a: a, b: b, group: keGroup, mats: [mat], base: 0.66 });
  });
}

/* ---------- 病机边 ---------- */
function clearPath() {
  if (pathGroup) {
    pathGroup.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
    });
    scene.remove(pathGroup);
  }
  pathGroup = new THREE.Group();
  scene.add(pathGroup);
  pathLabels.forEach(function (x) { x.el.remove(); });
  pathLabels = [];
  pathParticles = [];
}

function renderPathology() {
  var key = (state.selected || "") + "|" + state.mode;
  if (key === lastPathKey) return;
  lastPathKey = key;
  clearPath();
  if (!state.selected || state.mode === "normal") return;
  var sel = state.selected;
  var chengFrom, chengTo, wuFrom, wuTo;
  if (state.mode === "excess") {
    chengFrom = sel; chengTo = KE[sel];
    wuFrom = sel; wuTo = BEI_KE[sel];
  } else {
    chengFrom = BEI_KE[sel]; chengTo = sel;
    wuFrom = KE[sel]; wuTo = sel;
  }

  /* 相乘：朱砂粗实线 + 加速箭头 */
  var cCurve = straightCurve(chengFrom, chengTo, 0.16);
  var cMat = new THREE.MeshStandardMaterial({
    color: 0xb4432f, metalness: 0.55, roughness: 0.4,
    emissive: 0x5e170c, emissiveIntensity: 0.75, transparent: true, opacity: 1
  });
  pathGroup.add(new THREE.Mesh(new THREE.TubeGeometry(cCurve, 1, 0.028, 8, false), cMat));
  arrow(pathGroup, cCurve, cMat, 0.085, 0.88);

  var redDot = new THREE.MeshBasicMaterial({ color: 0xf0a088, transparent: true, opacity: 0.95 });
  for (var i = 0; i < 4; i++) {
    var d = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), redDot);
    pathGroup.add(d);
    pathParticles.push({ mesh: d, curve: cCurve, t: i / 4, speed: 0.12 });
  }
  addPathLabel(EL[chengFrom].name + "乘" + EL[chengTo].name, cCurve.getPoint(0.5), "cheng");

  /* 相侮：青灰虚线 + 反向箭头 */
  var wCurve = straightCurve(wuFrom, wuTo, 0.19);
  var wMat = new THREE.LineDashedMaterial({ color: 0x7fa3c4, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.95 });
  var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([wCurve.getPoint(0), wCurve.getPoint(1)]), wMat);
  line.computeLineDistances();
  pathGroup.add(line);
  arrow(pathGroup, wCurve, new THREE.MeshBasicMaterial({ color: 0x7fa3c4, transparent: true, opacity: 0.95 }), 0.07, 0.9);
  addPathLabel(EL[wuFrom].name + "侮" + EL[wuTo].name, wCurve.getPoint(0.5), "wu");
}

function addPathLabel(text, pos, kind) {
  var d = document.createElement("div");
  d.className = "wx-elabel " + kind;
  d.textContent = text;
  el.labels.appendChild(d);
  pathLabels.push({ el: d, pos: pos.clone().add(new THREE.Vector3(0, 0.16, 0)) });
}

/* ---------- 视觉状态 ---------- */
function refresh() {
  var sel = state.selected;
  var focus = sel || state.hover;
  var mode = state.mode;
  var related = {};
  if (focus) {
    related[focus] = true;
    related[SHENG[focus]] = true;
    related[BEI_SHENG[focus]] = true;
    related[KE[focus]] = true;
    related[BEI_KE[focus]] = true;
  }

  renderPathology();

  Object.keys(nodeObjs).forEach(function (k) {
    var active = !focus || related[k];
    var o = active ? 1 : 0.32;
    nodeObjs[k].mats.forEach(function (m) { m.opacity = o; });
    var lab = nodeLabels[k];
    lab.classList.toggle("dim", !!focus && !active);
    lab.setAttribute("aria-pressed", sel === k ? "true" : "false");
  });

  edgeObjs.forEach(function (e) {
    var visible = e.type === "sheng" ? state.showSheng : state.showKe;
    var op = e.base;
    if (!visible) op = 0;
    else if (focus) {
      if (mode === "normal") {
        var on = e.a === focus || e.b === focus;
        op = on ? (e.type === "sheng" ? 1 : 0.92) : 0.1;
      } else {
        op = 0.06;
      }
    }
    e.mats.forEach(function (m) { m.opacity = op; });
    if (e.dotMat) e.dotMat.opacity = op;
    e.group.visible = true;
  });

  if (pathGroup) pathGroup.visible = !!sel && mode !== "normal";
  if (el.state) {
    var stateText = !sel ? "常" : (mode === "normal" ? EL[sel].name + " · 常" : EL[sel].name + (mode === "excess" ? " · 太过" : " · 不及"));
    el.state.textContent = stateText;
    el.state.setAttribute("aria-label", "当前状态：" + stateText + "，点击复位");
    el.state.classList.toggle("active", !!sel);
  }
  syncToolState();
}

function syncToolState() {
  el.sheng.setAttribute("aria-pressed", state.showSheng ? "true" : "false");
  el.ke.setAttribute("aria-pressed", state.showKe ? "true" : "false");
  el.plan.textContent = state.plan ? "立体视图" : "平面视图";
  el.plan.setAttribute("aria-pressed", state.plan ? "true" : "false");
  el.tour.setAttribute("aria-pressed", state.tourTimer ? "true" : "false");
  el.tour.textContent = state.tourTimer ? "停止" : "沿生序";
  el.tour.disabled = state.reduced;
  el.tour.title = state.reduced ? "已开启减少动态效果" : "依次高亮五行";
}

/* ---------- 面板 ---------- */
function renderPanel() {
  var sel = state.selected;
  if (!sel) {
    el.panel.innerHTML =
      '<div class="wx-eyebrow">M4 · 五行</div>' +
      '<h2>生克制化，乘侮有向</h2>' +
      '<p class="wx-lead">点一枚铜章查看这一行的属性；再切换「太过 / 不及」，盘面会亮起相乘、相侮两条病机路径。</p>' +
      '<ul class="wx-guide">' +
      '<li><i class="lg sheng"></i>相生：顺时针一圈，木火土金水</li>' +
      '<li><i class="lg ke"></i>相克：五角星隔位相制</li>' +
      '<li><i class="lg cheng"></i>相乘：克得太过，实线朱砂</li>' +
      '<li><i class="lg wu"></i>相侮：反克为侮，青灰虚线</li>' +
      '</ul>' +
      '<p class="wx-note">图为概念示意；五行归类与病机以本讲正文与原书为准。</p>';
    setLive("五行图，尚未选择。可用 Tab 选择木火土金水。");
    return;
  }
  var e = EL[sel];
  var mode = state.mode;
  var rel;
  if (mode === "normal") {
    rel = [
      ["生我", EL[BEI_SHENG[sel]].name],
      ["我生", EL[SHENG[sel]].name],
      ["克我", EL[BEI_KE[sel]].name],
      ["我克", EL[KE[sel]].name]
    ];
  } else if (mode === "excess") {
    rel = [
      ["相乘", EL[sel].name + "乘" + EL[KE[sel]].name],
      ["相侮", EL[sel].name + "侮" + EL[BEI_KE[sel]].name]
    ];
  } else {
    rel = [
      ["被乘", EL[BEI_KE[sel]].name + "乘" + EL[sel].name],
      ["被侮", EL[KE[sel]].name + "侮" + EL[sel].name]
    ];
  }
  var relHtml = rel.map(function (r) {
    return '<div class="wx-relrow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
  }).join("");

  el.panel.innerHTML =
    '<div class="wx-elhead"><b>' + e.name + '</b><div><strong>' + e.nature + '</strong>' +
      '<span>' + e.organ + ' · ' + e.season + '</span></div></div>' +
    '<dl class="wx-facts">' +
      '<div><dt>志</dt><dd>' + e.emotion + '</dd></div>' +
      '<div><dt>味</dt><dd>' + e.flavor + '</dd></div>' +
      '<div><dt>色</dt><dd>' + e.color + '</dd></div>' +
      '<div><dt>季</dt><dd>' + e.season + '</dd></div>' +
    '</dl>' +
    '<div class="wx-seg" role="group" aria-label="病机状态">' +
      '<button data-mode="normal" aria-pressed="' + (mode === "normal") + '">常</button>' +
      '<button data-mode="excess" aria-pressed="' + (mode === "excess") + '">太过</button>' +
      '<button data-mode="deficit" aria-pressed="' + (mode === "deficit") + '">不及</button>' +
    '</div>' +
    '<div class="wx-rel">' + relHtml + '</div>' +
    '<details class="wx-table"><summary>关系表（读屏 / 打印）</summary>' +
      '<table><caption>' + e.name + '行的生克乘侮</caption><tbody>' +
      '<tr><th>生我</th><td>' + EL[BEI_SHENG[sel]].name + '生' + e.name + '</td></tr>' +
      '<tr><th>我生</th><td>' + e.name + '生' + EL[SHENG[sel]].name + '</td></tr>' +
      '<tr><th>克我</th><td>' + EL[BEI_KE[sel]].name + '克' + e.name + '</td></tr>' +
      '<tr><th>我克</th><td>' + e.name + '克' + EL[KE[sel]].name + '</td></tr>' +
      '<tr><th>太过</th><td>' + e.name + '乘' + EL[KE[sel]].name + '，' + e.name + '侮' + EL[BEI_KE[sel]].name + '</td></tr>' +
      '<tr><th>不及</th><td>' + EL[BEI_KE[sel]].name + '乘' + e.name + '，' + EL[KE[sel]].name + '侮' + e.name + '</td></tr>' +
      '</tbody></table></details>' +
    '<div class="wx-links">' + e.items.map(function (id) {
      return '<a href="#/i/' + id + '">去条目 ' + id + ' →</a>';
    }).join("") + '</div>' +
    '<p class="wx-note">图为概念示意；五行归类与病机以本讲正文与原书为准。</p>';

  setLive(sel && mode === "normal"
    ? "已选择" + e.name + "。" + e.name + "生" + EL[SHENG[sel]].name + "，" + e.name + "克" + EL[KE[sel]].name + "。"
    : "已选择" + e.name + "，" + (mode === "excess" ? "太过" : "不及") + "。" + rel.map(function (r) { return r[1]; }).join("，") + "。");
}

function setLive(msg) {
  if (el && el.live) el.live.textContent = msg;
}

/* ---------- 视图控制 ---------- */
function togglePlan() {
  state.plan = !state.plan;
  cam.tPhi = state.plan ? 0.16 : DEFAULT_PHI;
  syncToolState();
}

function resetView() {
  state.selected = null;
  state.mode = "normal";
  state.plan = false;
  state.showSheng = true;
  state.showKe = true;
  cam.tTheta = 0;
  cam.tPhi = DEFAULT_PHI;
  userZoom = false;
  cam.tDist = fitDistance();
  stopTour();
  renderPanel();
  refresh();
}

function toggleTour() {
  if (state.tourTimer) { stopTour(); return; }
  if (state.reduced) return;
  state.tourStep = -1;
  state.tourTimer = setInterval(function () {
    state.tourStep++;
    if (state.tourStep >= ORDER.length) { stopTour(); return; }
    state.selected = ORDER[state.tourStep];
    state.mode = "normal";
    renderPanel();
    refresh();
  }, 1300);
  syncToolState();
}

function stopTour() {
  if (state.tourTimer) clearInterval(state.tourTimer);
  state.tourTimer = 0;
  state.tourStep = -1;
  if (el) syncToolState();
}

/* ---------- 相机与循环 ---------- */
function fitDistance() {
  var w = stageRect.width, h = stageRect.height;
  if(!w || !h) return 11.4;
  var half = Math.tan(camera.fov * Math.PI / 360);
  var needV = 3.35 / half;
  var needH = 3.35 / (half * (w / h));
  return Math.min(16, Math.max(9.6, Math.max(needV, needH) + 0.6));
}

function resize() {
  if (!renderer || !el) return;
  var w = el.stage.clientWidth, h = el.stage.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  stageRect = { width: w, height: h };
  if (!userZoom) { cam.tDist = fitDistance(); cam.dist = cam.tDist; }
}

function bindPointer() {
  var dom = renderer.domElement;
  var pts = new Map();
  var lastX = 0, lastY = 0, pinch = 0;

  dom.addEventListener("pointerdown", function (e) {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      state.dragging = true;
      state.moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      try { dom.setPointerCapture(e.pointerId); } catch (err) {}
    } else if (pts.size === 2) {
      pinch = pinchDist(pts);
    }
  });

  dom.addEventListener("pointermove", function (e) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      var d = pinchDist(pts);
      if (pinch) {
        cam.tDist = clamp(cam.tDist * (pinch / d), 7, 16);
        userZoom = true;
      }
      pinch = d;
      return;
    }
    if (!state.dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    state.moved += Math.abs(dx) + Math.abs(dy);
    cam.tTheta -= dx * 0.006;
    cam.tPhi = clamp(cam.tPhi - dy * 0.005, 0.18, 1.34);
  });

  function end(e) {
    var wasOne = pts.size === 1;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    if (!pts.size) state.dragging = false;
    if (wasOne && state.moved < 6 && (state.selected || state.hover)) {
      state.selected = null;
      state.mode = "normal";
      state.hover = null;
      renderPanel();
      refresh();
    }
  }
  dom.addEventListener("pointerup", end);
  dom.addEventListener("pointercancel", end);

  dom.addEventListener("wheel", function (e) {
    e.preventDefault();
    cam.tDist = clamp(cam.tDist * (1 + e.deltaY * 0.0012), 7, 16);
    userZoom = true;
  }, { passive: false });

  dom.addEventListener("dblclick", function () {
    cam.tTheta = 0; cam.tPhi = DEFAULT_PHI; userZoom = false; cam.tDist = fitDistance();
  });

  function pinchDist(map) {
    var a = Array.from(map.values());
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
  }
}

function startLoop() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function loop(now) {
  if (!state.open || !renderer) return;
  raf = requestAnimationFrame(loop);
  var t = now / 1000;

  if (!state.reduced && !state.dragging && !state.selected && !state.hover && !state.plan) cam.tTheta += 0.00035;
  cam.theta += (cam.tTheta - cam.theta) * 0.1;
  cam.phi += (cam.tPhi - cam.phi) * 0.1;
  cam.dist += (cam.tDist - cam.dist) * 0.1;

  var sp = Math.sin(cam.phi);
  camera.position.set(
    cam.dist * sp * Math.sin(cam.theta),
    cam.dist * Math.cos(cam.phi),
    cam.dist * sp * Math.cos(cam.theta)
  );
  camera.lookAt(0, 0, 0);

  particles.forEach(function (p) {
    if (state.reduced) { p.mesh.position.copy(p.curve.getPoint((p.t + 0.5) % 1)); return; }
    p.t = (p.t + p.speed * 0.016) % 1;
    p.mesh.position.copy(p.curve.getPoint(p.t));
  });
  pathParticles.forEach(function (p) {
    if (state.reduced) { p.mesh.position.copy(p.curve.getPoint(0.5)); return; }
    p.t = (p.t + p.speed * 0.016) % 1;
    p.mesh.position.copy(p.curve.getPoint(p.t));
  });

  updateLabelPositions();
  renderer.render(scene, camera);
}

function updateLabelPositions() {
  if (!el) return;
  Object.keys(nodeLabels).forEach(function (k) {
    placeLabel(nodeLabels[k], nodePos(k, 0.62));
  });
  pathLabels.forEach(function (x) { placeLabel(x.el, x.pos); });
}

function placeLabel(node, pos) {
  tmpV.copy(pos).project(camera);
  var x = (tmpV.x * 0.5 + 0.5) * stageRect.width;
  var y = (-tmpV.y * 0.5 + 0.5) * stageRect.height;
  node.style.transform = "translate(-50%,-100%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
  node.style.opacity = tmpV.z > 1 ? "0" : "";
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/* ---------- 清理 ---------- */
function disposeScene() {
  if (pathGroup) {
    pathGroup.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
    });
  }
  if (scene) {
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
    });
  }
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  scene = null;
  camera = null;
  renderer = null;
  nodeObjs = {};
  nodeLabels = {};
  edgeObjs = [];
  particles = [];
  pathParticles = [];
  pathLabels = [];
  pathGroup = null;
  shengGroup = null;
  keGroup = null;
  lastPathKey = null;
  if (el) {
    el.labels.innerHTML = "";
    el.panel.innerHTML = "";
  }
}
