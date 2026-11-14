const test = require("node:test");
const assert = require("node:assert/strict");
const TCMState = require("../tools/user-state.js");

const validIds = ["1-1", "1-2"];

test("支持旧版 v2 备份并过滤当前版本不存在的条目", () => {
  const parsed = TCMState.parseBackup({
    v: 2,
    exported: "2026-11-13T00:00:00.000Z",
    data: {
      done: { "1-1": true, "old-item": true },
      tries: { "1-1": { score: "5/6", best: 6, n: 2 }, "old-item": { score: "4/6" } },
      last: "1-1"
    }
  }, validIds);
  assert.deepEqual(parsed.state.done, { "1-1": true });
  assert.equal(parsed.state.last, "1-1");
  assert.equal(parsed.summary.ignoredCount, 2);
});

test("兼容未封装的旧格式", () => {
  const parsed = TCMState.parseBackup({ done: { "1-2": true }, tries: {}, last: "1-2" }, validIds);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.state.done["1-2"], true);
});

test("v3 备份可往返并保留有效学习记录", () => {
  const state = { done: { "1-1": true }, tries: { "1-1": { score: "6/6", best: 6, n: 1 } }, last: "1-1" };
  const backup = TCMState.makeBackup(state, "2026-11-14T00:00:00.000Z");
  assert.equal(backup.v, 3);
  const parsed = TCMState.parseBackup(backup, validIds);
  assert.deepEqual(parsed.state, state);
});

test("拒绝损坏结构和未来备份版本", () => {
  assert.throws(() => TCMState.parseBackup("not-json", validIds));
  assert.throws(() => TCMState.parseBackup({ v: 99, data: {} }, validIds), /不支持的备份版本/);
  assert.throws(() => TCMState.parseBackup({ v: 3, data: { done: [] } }, validIds), /done 字段格式错误/);
});

test("忽略未知条目，不会把任意字段或对象写入学习记录", () => {
  const parsed = TCMState.parseBackup({
    v: 3,
    data: {
      done: { "1-1": true, "1-2": "yes", "extra": true },
      tries: { "1-2": { score: "3/6", payload: { injected: true }, ok: false }, "extra": { score: "6/6" } },
      last: "extra"
    }
  }, validIds);
  assert.deepEqual(parsed.state.done, { "1-1": true });
  assert.deepEqual(parsed.state.tries["1-2"], { score: "3/6", ok: false });
  assert.equal(parsed.state.last, null);
  assert.equal(parsed.summary.ignoredCount, 4);
});
