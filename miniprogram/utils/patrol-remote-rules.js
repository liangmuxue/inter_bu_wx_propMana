/**
 * 远程巡检 / 规则参数：与 PC「计划设置 → 规则参数」对齐
 * 来源优先级：wx 本地缓存 > PC localStorage(H5) > 打包默认 JSON
 */
var RULES_STORAGE_KEY = 'patrol_wxapp_remote_rules_v1';

var DEFAULT_RULES = {
  replayDuration: '60 秒',
  snapshotRetainDays: '30',
  taskRemind: '30 分钟前',
  overdueRemind: '超时 30 分钟',
  missAlarm: '推送至执行人+主管'
};

function loadBundledRules() {
  try {
    const bundled = require('../mock/patrol-remote-rules.json');
    if (bundled && typeof bundled === 'object') return bundled;
  } catch (e) { /* ignore */ }
  return {};
}

function loadPcLocalRules() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (e) {
    return null;
  }
}

function loadStoredRules() {
  try {
    const raw = wx.getStorageSync(RULES_STORAGE_KEY);
    if (raw && typeof raw === 'object') return raw;
    if (typeof raw === 'string' && raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveRules(rules) {
  try {
    wx.setStorageSync(RULES_STORAGE_KEY, rules || DEFAULT_RULES);
  } catch (e) { /* ignore */ }
}

/** 合并后的生效规则 */
function getPatrolRuleParams() {
  const merged = Object.assign({}, DEFAULT_RULES, loadBundledRules());
  const pc = loadPcLocalRules();
  if (pc) Object.assign(merged, pc);
  const local = loadStoredRules();
  if (local) Object.assign(merged, local);
  return merged;
}

/** 从 PC / 外部同步规则到小程序本地 */
function ingestPatrolRuleParams(rules) {
  if (!rules || typeof rules !== 'object') return getPatrolRuleParams();
  const next = Object.assign({}, getPatrolRuleParams(), rules);
  saveRules(next);
  return next;
}

function parseReplayDurationSec(text) {
  const m = String(text || '').match(/(\d+)/);
  return m ? Number(m[1]) : 60;
}

function parseSnapshotRetainDays(text) {
  const n = Number(String(text || '').trim());
  return isNaN(n) || n < 1 ? 30 : Math.min(3650, Math.floor(n));
}

/**
 * 演示抓拍条数：按保留天数裁剪（最多 total，最少 3）
 * 1 天→3 张，之后约每天 1 张，封顶 total
 */
function resolveSnapshotTotal(total, retainDays) {
  const max = total || 24;
  const days = parseSnapshotRetainDays(retainDays);
  return Math.max(3, Math.min(max, days));
}

module.exports = {
  RULES_STORAGE_KEY: RULES_STORAGE_KEY,
  DEFAULT_RULES: DEFAULT_RULES,
  getPatrolRuleParams: getPatrolRuleParams,
  ingestPatrolRuleParams: ingestPatrolRuleParams,
  parseReplayDurationSec: parseReplayDurationSec,
  parseSnapshotRetainDays: parseSnapshotRetainDays,
  resolveSnapshotTotal: resolveSnapshotTotal
};
