const session = require('../store/session');
const userDisplay = require('../utils/user-display');
const pagePerm = require('../config/page-permissions');
const patrolMock = require('./patrol');
const workorderMock = require('./workorder');
const assetMock = require('./asset');
const spareMock = require('./spare');

function getUser() {
  return userDisplay.normalizeUser(session.getUser());
}

function canView(pageId) {
  const user = getUser();
  return pagePerm.canPageAction(user.role, pageId, 'view');
}

function canEdit(pageId) {
  const user = getUser();
  return pagePerm.canPageAction(user.role, pageId, 'edit');
}

function canAudit(pageId) {
  const user = getUser();
  return pagePerm.canPageAction(user.role, pageId, 'audit');
}

function withVisibleItems(section) {
  if (!section) return null;
  const items = (section.items || []).filter(function (item) {
    return item && Number(item.count) > 0;
  });
  if (!items.length) return null;
  return Object.assign({}, section, { items: items });
}

function patrolSection(user) {
  if (!canView('patrol-task') && !canView('patrol-issue')) return null;
  const stats = patrolMock.workbenchStats(user);
  const items = [];
  if (canView('patrol-task')) {
    items.push(
      { key: 'today', label: '今日待办', count: stats.todayTasks || 0 },
      { key: 'pending', label: '待完成任务', count: stats.pendingTasks || 0 },
      { key: 'overdue', label: '已超时任务', count: stats.overdueTasks || 0, danger: true }
    );
  }
  if (canView('patrol-issue')) {
    items.push(
      { key: 'rectify', label: '待整改问题', count: stats.pendingRectify || 0 },
      { key: 'reinspect', label: '待复检问题', count: stats.pendingReinspect || 0 }
    );
  }
  return withVisibleItems({
    id: 'patrol',
    title: '巡查管控',
    color: '#1A5FDB',
    linkLabel: '全部任务',
    linkKey: 'patrol-all',
    items: items
  });
}

function workorderSection(user) {
  if (!canView('wos-list')) return null;
  const list = workorderMock.listWorkOrders('pending', 'all', {}) || [];
  return withVisibleItems({
    id: 'workorder',
    title: '工单服务',
    color: '#DD6B20',
    linkLabel: '全部工单',
    linkKey: 'workorder-all',
    items: [
      { key: 'pending', label: '待我处理', count: list.length }
    ]
  });
}

function deviceSection() {
  const hasRepair = canView('repair-request') || canView('repair-workorder');
  const hasInv = canView('dev-asset-inventory');
  const hasSpare = canView('spare-usage') || canView('spare-ledger');
  if (!hasRepair && !hasInv && !hasSpare) return null;

  const items = [];
  if (hasRepair) {
    // 仅统计派给我、且当前需我操作的报修工单
    const workOrders = assetMock.listWorkOrders('all', 'mine', {}) || [];
    const woPending = workOrders.filter(function (w) {
      return !!(w.canAccept || w.canFinish || w.canTransfer || w.canVoid);
    }).length;
    items.push({ key: 'repair-wo', label: '报修工单待处理', count: woPending });
    if (canAudit('repair-request')) {
      // 待我审批：可审批且非本人提交（本人提交需他人审批，不计入）
      const repairs = assetMock.listRepairs('pending', 'org', {}) || [];
      const user = getUser();
      const approveCount = repairs.filter(function (r) {
        if (!r.canApprove) return false;
        const mine = (r.reporterAccount && r.reporterAccount === user.id) ||
          (r.reporterName && r.reporterName === user.name);
        return !mine;
      }).length;
      items.push({ key: 'repair-approve', label: '待审批报修', count: approveCount });
    }
  }
  if (hasSpare && canAudit('spare-usage')) {
    // 待我审批领用：可审批，排除本人申请
    const usages = spareMock.listUsages('待审批', 'org', {}) || [];
    const user = getUser();
    const spareApprove = usages.filter(function (u) {
      if (!u.canApprove) return false;
      const mine = (u.applicantAccount && u.applicantAccount === user.id) ||
        (u.applicantName && u.applicantName === user.name);
      return !mine;
    }).length;
    items.push({ key: 'spare-approve', label: '待审批领用', count: spareApprove });
  }
  if (hasInv) {
    // 仅统计我是盘点人、且当前需我执行的盘点
    function countMineExecutable(status) {
      const list = (assetMock.listInventories(status, 'mine', {}).list || []);
      return list.filter(function (t) {
        return t.canExecute !== false;
      }).length;
    }
    items.push({
      key: 'inventory',
      label: '盘点待执行',
      count: countMineExecutable('待盘点') + countMineExecutable('盘点中') + countMineExecutable('未完成')
    });
  }
  return withVisibleItems({
    id: 'device',
    title: '资产管理',
    color: '#3182CE',
    items: items
  });
}

function getTodoSections(user) {
  user = user || getUser();
  const sections = [
    workorderSection(user),
    patrolSection(user),
    deviceSection(user)
  ].filter(Boolean);

  const totalCount = sections.reduce(function (sum, section) {
    return sum + (section.items || []).reduce(function (n, item) {
      return n + (item.count || 0);
    }, 0);
  }, 0);

  return { sections: sections, totalCount: totalCount };
}

module.exports = {
  getTodoSections: getTodoSections
};
