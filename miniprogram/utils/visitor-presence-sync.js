/**
 * 物业扫码签到/签离事件同步（原型）
 * - 小程序：wx.storage
 * - 浏览器 H5/PC：localStorage（同域可读）
 * 事件结构对齐 PC DATA.guardVerifyEvents
 */
const STORAGE_KEY = 'vis2_guard_verify_events';

function canUseWx() {
  return typeof wx !== 'undefined' && wx && typeof wx.getStorageSync === 'function';
}

function canUseLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage;
  } catch (e) {
    return false;
  }
}

function readEvents() {
  let raw = '';
  try {
    if (canUseWx()) raw = wx.getStorageSync(STORAGE_KEY) || '';
    else if (canUseLocalStorage()) raw = localStorage.getItem(STORAGE_KEY) || '';
  } catch (e) {
    raw = '';
  }
  if (!raw) return [];
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeEvents(list) {
  const payload = JSON.stringify(Array.isArray(list) ? list : []);
  try {
    if (canUseWx()) wx.setStorageSync(STORAGE_KEY, payload);
  } catch (e) { /* ignore */ }
  try {
    if (canUseLocalStorage()) localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) { /* ignore */ }
}

function upsertEvent(event) {
  if (!event || !event.orderId || !event.action) return readEvents();
  const list = readEvents().slice();
  const idx = list.findIndex(function (e) {
    return e && e.orderId === event.orderId && e.action === event.action;
  });
  const row = Object.assign({
    id: 'GV-' + Date.now(),
    source: '物业端小程序',
    time: ''
  }, event);
  if (idx >= 0) list[idx] = Object.assign({}, list[idx], row);
  else list.unshift(row);
  writeEvents(list);
  return list;
}

function hasAction(orderId, action) {
  const id = String(orderId || '').trim();
  return readEvents().some(function (e) {
    return e && String(e.orderId) === id && String(e.action) === action;
  });
}

module.exports = {
  STORAGE_KEY: STORAGE_KEY,
  readEvents: readEvents,
  writeEvents: writeEvents,
  upsertEvent: upsertEvent,
  hasAction: hasAction
};
