/**
 * 角色 · 页面操作权限（与 PC settings-user ROLE_PERMISSIONS / PAGE_PERM_ACTIONS 叶子 id 对齐）
 * 流程按钮（去执行 / 接单 / 完工 / 验收 / 评价 / 撤回等）不纳入本表。
 *
 * 工作台入口：
 * - 区域工单 → wos-list.view
 * - 巡检任务 → patrol-task.view；临时上报 → patrol-issue.add
 * - 班组排班 → guard-plan-schedule.view
 * - 资产盘点 → dev-asset-inventory.view
 * - 发起报修 → repair-request.add；资产报修列表 → repair-request.view
 * - 报修工单 → repair-workorder.view；审批 → repair-request.audit；转派/作废 → repair-workorder.transfer/void
 * - 扫码查资产 → ledger-list.view
 * - 备品领用（列表入口）→ spare-usage.view
 * - 备品领用申请 → spare-ledger.view；派发审批 → spare-usage.audit
 * - 访客核验/列表 → vis2-invite-all.view；访客预约 → vis2-invite-appointment.view；员工邀约 → vis2-invite-staff.view；通行记录 → vis2-passage.view
 * - 预约看板 → sp-reserve-board.view；预约记录 → sp-reserve-record.view；费用统计 → sp-fee-stats.view
 *
 * 盘点 detail/report：移动端进详情/报告页，等价于具备 view（见 canPageAction 兼容）
 */
const ROLE_PAGE_ACTIONS = {
  '超级管理员': { system: true },
  '安保主管': {
    'patrol-task': ['view', 'remind', 'reassign', 'export'],
    'patrol-issue': ['view', 'add'],
    'patrol-record-task': ['view', 'export'],
    'patrol-record-issue': ['view', 'export'],
    'patrol-record-guard': ['view', 'export'],
    'patrol-stat': ['view'],
    'guard-plan-route': ['view', 'add', 'edit', 'delete'],
    'guard-plan-schedule': ['view', 'add', 'edit', 'delete'],
    'guard-plan-holiday': ['view', 'add', 'edit', 'delete'],
    'vis2-invite-all': ['view', 'export'],
    'vis2-invite-appointment': ['view', 'export'],
    'vis2-invite-staff': ['view', 'add', 'export'],
    'vis2-passage': ['view'],
    'vis2-trail': ['view'],
    'wos-list': ['view', 'add', 'export'],
    'wos-stat': ['view'],
    'fire-data-monitor': ['view', 'edit']
  },
  '运维工程师': {
    'ledger-list': ['view', 'add', 'edit', 'export', 'import'],
    'ledger-input': ['view', 'export'],
    'ledger-change': ['view', 'export'],
    'dev-asset-inventory': ['view', 'add', 'audit', 'delete'],
    'spare-ledger': ['view', 'add', 'inbound', 'edit', 'delete', 'export'],
    'spare-usage': ['view', 'audit', 'export'],
    'repair-request': ['view', 'add', 'audit', 'delete', 'export'],
    'repair-workorder': ['view', 'transfer', 'void', 'export'],
    'patrol-task': ['view', 'remind', 'reassign', 'export'],
    'patrol-issue': ['view', 'add'],
    'patrol-record-task': ['view', 'export'],
    'patrol-record-issue': ['view', 'export'],
    'patrol-record-guard': ['view', 'export'],
    'patrol-stat': ['view'],
    'guard-plan-route': ['view', 'add', 'edit', 'delete'],
    'guard-plan-schedule': ['view', 'add', 'edit', 'delete'],
    'guard-plan-holiday': ['view', 'add', 'edit', 'delete'],
    'vis2-invite-all': ['view', 'export'],
    'vis2-invite-appointment': ['view', 'export'],
    'vis2-invite-staff': ['view', 'add', 'export'],
    'vis2-passage': ['view'],
    'vis2-trail': ['view'],
    'wos-list': ['view', 'add', 'export'],
    'wos-stat': ['view'],
    'sp-reserve-board': ['view'],
    'sp-reserve-record': ['view'],
    'sp-fee-stats': ['view'],
    'sp-room': ['view', 'add', 'edit', 'delete'],
    'fire-data-monitor': ['view', 'edit']
  },
  '普通用户': {
    'vis2-invite-all': ['view'],
    'wos-list': ['view'],
    'sp-reserve-board': ['view'],
    'sp-reserve-record': ['view']
  }
};

/** 移动端进页动作 → 菜单权限动作（不新增独立权限项） */
const ACTION_ALIASES = {
  'dev-asset-inventory': {
    detail: 'view',
    report: 'view',
    edit: 'add'
  },
  'patrol-task': {
    edit: 'view'
  }
};

function resolveAction(pageId, actionId) {
  const map = ACTION_ALIASES[pageId];
  if (map && map[actionId]) return map[actionId];
  return actionId;
}

function canPageAction(roleName, pageId, actionId) {
  if (!pageId || !actionId) return false;
  try {
    const flags = require('../utils/mock-demo-flags');
    if (flags.isDenyAllModules()) return false;
  } catch (e) { /* ignore */ }
  const resolved = resolveAction(pageId, actionId);
  try {
    const session = require('../store/session');
    const user = session.getUser();
    if (user) {
      if (user.admin || user.role === '超级管理员') return true;
      if (user.pageActions && typeof user.pageActions === 'object') {
        if (Object.prototype.hasOwnProperty.call(user.pageActions, pageId)) {
          let actions = user.pageActions[pageId] || [];
          if (!Array.isArray(actions)) {
            actions = Object.keys(actions).filter(function (k) { return !!actions[k]; });
          }
          return actions.indexOf(resolved) >= 0 || actions.indexOf(actionId) >= 0;
        }
      }
    }
  } catch (e2) { /* ignore */ }
  const role = ROLE_PAGE_ACTIONS[roleName];
  if (!role) return false;
  if (role.system) return true;
  const actions = role[pageId];
  if (!actions || !actions.length) return false;
  return actions.indexOf(resolved) >= 0 || actions.indexOf(actionId) >= 0;
}

module.exports = {
  ROLE_PAGE_ACTIONS: ROLE_PAGE_ACTIONS,
  canPageAction: canPageAction
};
