(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TCMState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var CURRENT_BACKUP_VERSION = 3;

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeState(input, validIds) {
    if (!isRecord(input)) throw new Error("学习记录必须是 JSON 对象");
    if (input.done != null && !isRecord(input.done)) throw new Error("done 字段格式错误");
    if (input.tries != null && !isRecord(input.tries)) throw new Error("tries 字段格式错误");

    var allowed = new Set(validIds || []);
    var done = {};
    var tries = {};
    var ignored = 0;

    Object.keys(input.done || {}).forEach(function (id) {
      if (!allowed.has(id)) { ignored++; return; }
      if (input.done[id] === true) done[id] = true;
      else if (input.done[id] !== false && input.done[id] != null) ignored++;
    });

    Object.keys(input.tries || {}).forEach(function (id) {
      var value = input.tries[id];
      if (!allowed.has(id) || !isRecord(value)) { ignored++; return; }
      var record = {};
      Object.keys(value).forEach(function (key) {
        var v = value[key];
        if (typeof v === "number" && Number.isFinite(v)) record[key] = v;
        else if (typeof v === "string" && v.length <= 200) record[key] = v;
        else if (typeof v === "boolean") record[key] = v;
      });
      tries[id] = record;
    });

    var last = typeof input.last === "string" && allowed.has(input.last) ? input.last : null;
    if (input.last != null && last == null) ignored++;

    return {
      state: { done: done, tries: tries, last: last },
      summary: {
        doneCount: Object.keys(done).length,
        tryCount: Object.keys(tries).length,
        ignoredCount: ignored
      }
    };
  }

  function parseBackup(backup, validIds) {
    if (!isRecord(backup)) throw new Error("备份文件必须是 JSON 对象");
    var version = Number.isInteger(backup.v) ? backup.v :
      (Number.isInteger(backup.version) ? backup.version : 1);
    if (version < 1 || version > CURRENT_BACKUP_VERSION) {
      throw new Error("不支持的备份版本：" + version);
    }
    var payload = isRecord(backup.data) ? backup.data :
      (isRecord(backup.state) ? backup.state : backup);
    var normalized = normalizeState(payload, validIds);
    normalized.version = version;
    return normalized;
  }

  function makeBackup(state, exportedAt) {
    return {
      v: CURRENT_BACKUP_VERSION,
      schema: "tcm-workbench-progress",
      exported: exportedAt || new Date().toISOString(),
      data: {
        done: state.done || {},
        tries: state.tries || {},
        last: state.last || null
      }
    };
  }

  return {
    CURRENT_BACKUP_VERSION: CURRENT_BACKUP_VERSION,
    normalizeState: normalizeState,
    parseBackup: parseBackup,
    makeBackup: makeBackup
  };
});
