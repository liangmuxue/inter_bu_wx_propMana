/**
 * 工作台入口 / 分包页 · 统一页权拦截（对齐 PC 菜单叶子 pageId）
 */
const pagePerm = require('../config/page-permissions');
const session = require('../store/session');
const userDisplay = require('./user-display');

/** 工作台 entry.id → 页权 */
const ENTRY_ACCESS = {
  'patrol-tasks': { pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  'patrol-issues': { pageId: 'patrol-issue', action: 'view', label: '巡检问题' },
  'patrol-schedule': { pageId: 'guard-plan-schedule', action: 'view', label: '班组排班' },
  'dev-inventory': { pageId: 'dev-asset-inventory', action: 'view', label: '资产盘点' },
  'dev-spare': { pageId: 'spare-usage', action: 'view', label: '备品领用' },
  'dev-scan': { pageId: 'ledger-list', action: 'view', label: '扫码/NFC查资产' },
  'dev-repair-list': { pageId: 'repair-request', action: 'view', label: '资产报修' },
  'dev-repair-wo': { pageId: 'repair-workorder', action: 'view', label: '报修工单' },
  'dev-repair': { pageId: 'repair-request', action: 'add', label: '发起报修' },
  'patrol-report': { pageId: 'patrol-issue', action: 'add', label: '临时上报' },
  'fire-alarms': { pageId: 'fire-data-monitor', action: 'view', label: '报警推送' },
  'fire-devices': { pageId: 'fire-data-monitor', action: 'view', label: '消防设备' },
  'fire-stats': { pageId: 'fire-data-monitor', action: 'view', label: '监测统计' },
  'vis-verify': { pageId: 'vis2-invite-all', action: 'view', label: '扫码核验' },
  'vis-appointment': { pageId: 'vis2-invite-appointment', action: 'view', label: '访客预约' },
  'vis-invite': { pageId: 'vis2-invite-staff', action: 'view', label: '员工邀约' },
  'vis-list': { pageId: 'vis2-invite-all', action: 'view', label: '访客列表' },
  'vis-passage': { pageId: 'vis2-passage', action: 'view', label: '通行记录' },
  'wo-mine': { pageId: 'wos-list', action: 'view', label: '区域工单' },
  'space-board': { pageId: 'sp-reserve-board', action: 'view', label: '预约看板' },
  'space-records': { pageId: 'sp-reserve-record', action: 'view', label: '预约记录' },
  'space-fee-stats': { pageId: 'sp-fee-stats', action: 'view', label: '费用统计' }
};

/** 分包页 path 前缀 → 页权（深链兜底；更具体的 match 写在前面） */
const PAGE_ACCESS = [
  { match: '/packages/patrol/task-', pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  { match: '/packages/patrol/issue-list', pageId: 'patrol-issue', action: 'view', label: '巡检问题' },
  { match: '/packages/patrol/issue-detail', pageId: 'patrol-issue', action: 'view', label: '巡检问题' },
  { match: '/packages/patrol/issue-report', pageId: 'patrol-issue', action: 'add', label: '临时上报' },
  { match: '/packages/patrol/issue-rectify', pageId: 'patrol-issue', action: 'view', label: '问题整改' },
  { match: '/packages/patrol/issue-reinspect', pageId: 'patrol-issue', action: 'view', label: '问题复检' },
  { match: '/packages/patrol/schedule', pageId: 'guard-plan-schedule', action: 'view', label: '班组排班' },
  { match: '/packages/patrol/subtask-', pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  { match: '/packages/patrol/guard-scan', pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  { match: '/packages/patrol/video-preview', pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  { match: '/packages/patrol/remote-monitor', pageId: 'patrol-task', action: 'view', label: '巡检任务' },
  { match: '/packages/device/inventory-', pageId: 'dev-asset-inventory', action: 'view', label: '资产盘点' },
  { match: '/packages/device/spare-create', pageId: 'spare-ledger', action: 'view', label: '领用申请' },
  { match: '/packages/device/spare-approve', pageId: 'spare-usage', action: 'audit', label: '派发审批' },
  { match: '/packages/device/spare-', pageId: 'spare-usage', action: 'view', label: '备品领用' },
  { match: '/packages/device/repair-workorder-transfer', pageId: 'repair-workorder', action: 'transfer', label: '转派工单' },
  { match: '/packages/device/repair-workorder-finish', pageId: 'repair-workorder', action: 'view', label: '维修完工' },
  { match: '/packages/device/repair-workorder-acceptance', pageId: 'repair-workorder', action: 'view', label: '工单验收' },
  { match: '/packages/device/repair-workorder', pageId: 'repair-workorder', action: 'view', label: '报修工单' },
  { match: '/packages/device/repair-create', pageId: 'repair-request', action: 'add', label: '发起报修' },
  { match: '/packages/device/repair-approve', pageId: 'repair-request', action: 'audit', label: '审批报修' },
  { match: '/packages/device/repair-', pageId: 'repair-request', action: 'view', label: '资产报修' },
  { match: '/packages/device/asset-detail', pageId: 'ledger-list', action: 'view', label: '资产台账' },
  { match: '/packages/fire/', pageId: 'fire-data-monitor', action: 'view', label: '消防管理' },
  { match: '/packages/visitor/passage', pageId: 'vis2-passage', action: 'view', label: '通行记录' },
  { match: '/packages/visitor/appointment', pageId: 'vis2-invite-appointment', action: 'view', label: '访客预约' },
  { match: '/packages/visitor/invite-create', pageId: 'vis2-invite-staff', action: 'add', label: '发起邀约' },
  { match: '/packages/visitor/invite', pageId: 'vis2-invite-staff', action: 'view', label: '员工邀约' },
  { match: '/packages/visitor/', pageId: 'vis2-invite-all', action: 'view', label: '访客管理' },
  { match: '/packages/workorder/action', pageId: 'wos-list', action: 'view', label: '工单处理' },
  { match: '/packages/workorder/detail', pageId: 'wos-list', action: 'view', label: '工单详情' },
  { match: '/packages/workorder/', pageId: 'wos-list', action: 'view', label: '工单服务' },
  { match: '/packages/space/fee-stats', pageId: 'sp-fee-stats', action: 'view', label: '费用统计' },
  { match: '/packages/space/booking-detail', pageId: 'sp-reserve-record', action: 'view', label: '预约详情' },
  { match: '/packages/space/room-detail', pageId: 'sp-reserve-board', action: 'view', label: '会议室详情' },
  { match: '/packages/space/record-list', pageId: 'sp-reserve-record', action: 'view', label: '预约记录' },
  { match: '/packages/space/board', pageId: 'sp-reserve-board', action: 'view', label: '预约看板' },
  { match: '/packages/space/', pageId: 'sp-reserve-board', action: 'view', label: '会议室管理' }
];

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

function checkAccess(pageId, action, label) {
  const role = currentRole();
  if (pagePerm.canPageAction(role, pageId, action || 'view')) {
    return { ok: true };
  }
  const name = label || '该功能';
  return {
    ok: false,
    message: '当前账号无「' + name + '」权限'
  };
}

function checkEntryAccess(entryId) {
  const cfg = ENTRY_ACCESS[entryId];
  if (!cfg) return { ok: true };
  return checkAccess(cfg.pageId, cfg.action, cfg.label);
}

function resolvePageAccess(routePath) {
  const path = String(routePath || '');
  for (let i = 0; i < PAGE_ACCESS.length; i++) {
    const row = PAGE_ACCESS[i];
    if (path.indexOf(row.match) >= 0) return row;
  }
  return null;
}

let _lastDenyKey = '';
let _lastDenyAt = 0;

function ensureAccess(pageId, action, label, options) {
  options = options || {};
  const res = checkAccess(pageId, action, label);
  if (res.ok) return true;
  const key = String(pageId) + ':' + String(action || 'view');
  const now = Date.now();
  const skipModal = _lastDenyKey === key && now - _lastDenyAt < 1200;
  _lastDenyKey = key;
  _lastDenyAt = now;
  if (!skipModal) {
    wx.showModal({
      title: '无访问权限',
      content: res.message,
      showCancel: false,
      confirmText: '知道了',
      success: function () {
        if (options.navigateBack !== false) {
          wx.navigateBack({ fail: function () {} });
        }
      }
    });
  } else if (options.navigateBack !== false) {
    wx.navigateBack({ fail: function () {} });
  }
  return false;
}

function ensureCurrentPageAccess(options) {
  options = options || {};
  let route = options.route || '';
  if (!route) {
    try {
      const pages = getCurrentPages();
      const cur = pages && pages[pages.length - 1];
      route = (cur && ('/' + cur.route)) || '';
    } catch (e) { /* ignore */ }
  }
  const cfg = resolvePageAccess(route);
  if (!cfg) return true;
  return ensureAccess(cfg.pageId, cfg.action, cfg.label, options);
}

function denyNavigate(message) {
  wx.showModal({
    title: '无访问权限',
    content: message || '当前账号无访问权限',
    showCancel: false,
    confirmText: '知道了'
  });
}

module.exports = {
  ENTRY_ACCESS: ENTRY_ACCESS,
  checkAccess: checkAccess,
  checkEntryAccess: checkEntryAccess,
  ensureAccess: ensureAccess,
  ensureCurrentPageAccess: ensureCurrentPageAccess,
  denyNavigate: denyNavigate
};
