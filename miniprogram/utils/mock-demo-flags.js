/**
 * Mock 演示开关（不改账号即可测权限拦截等场景）
 */
const STORAGE_KEY = 'wxapp_mock_demo_flags_v1';

function load() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function save(flags) {
  try {
    wx.setStorageSync(STORAGE_KEY, flags || {});
  } catch (e) { /* ignore */ }
}

/** 模拟当前账号：所有模块均无权限 */
function isDenyAllModules() {
  const flags = load();
  return !!(flags.denyAllModules || flags.denyAllListView || flags.denyInventoryView);
}

function setDenyAllModules(on) {
  const flags = load();
  flags.denyAllModules = !!on;
  delete flags.denyAllListView;
  delete flags.denyInventoryView;
  save(flags);
  return flags.denyAllModules;
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (e) { /* ignore */ }
}

module.exports = {
  isDenyAllModules: isDenyAllModules,
  setDenyAllModules: setDenyAllModules,
  /** @deprecated 兼容旧调用 */
  isDenyAllListView: isDenyAllModules,
  setDenyAllListView: setDenyAllModules,
  clear: clear
};
