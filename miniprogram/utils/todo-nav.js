const pageAccess = require('./page-access');

function openPatrolTask(filter) {
  const gate = pageAccess.checkAccess('patrol-task', 'view', '巡检任务');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  wx.navigateTo({
    url: '/packages/patrol/task-list/index?filter=' + encodeURIComponent(filter || 'all') + '&scope=mine'
  });
}

function openPatrolIssue(tab) {
  const gate = pageAccess.checkAccess('patrol-issue', 'view', '巡检问题');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  wx.navigateTo({
    url: '/packages/patrol/issue-list/index?tab=' + encodeURIComponent(tab || 'all') + '&scope=mine'
  });
}

function openWorkorderList() {
  const gate = pageAccess.checkAccess('wos-list', 'view', '区域工单');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  wx.navigateTo({
    url: '/packages/workorder/list/index?tab=mine'
  });
}

function openRepairList(query) {
  const gate = pageAccess.checkAccess('repair-request', 'view', '资产报修');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  query = query || {};
  const qs = [];
  if (query.scope) qs.push('scope=' + encodeURIComponent(query.scope));
  if (query.status) qs.push('status=' + encodeURIComponent(query.status));
  wx.navigateTo({
    url: '/packages/device/repair-list/index' + (qs.length ? '?' + qs.join('&') : '')
  });
}

function openRepairWorkorderList(query) {
  const gate = pageAccess.checkAccess('repair-workorder', 'view', '报修工单');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  query = query || {};
  const qs = [];
  if (query.scope) qs.push('scope=' + encodeURIComponent(query.scope));
  if (query.status) qs.push('status=' + encodeURIComponent(query.status));
  wx.navigateTo({
    url: '/packages/device/repair-workorder-list/index' + (qs.length ? '?' + qs.join('&') : '')
  });
}

function openSpareList(query) {
  const gate = pageAccess.checkAccess('spare-usage', 'view', '备品领用');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  query = query || {};
  const qs = [];
  if (query.scope) qs.push('scope=' + encodeURIComponent(query.scope));
  if (query.status) qs.push('status=' + encodeURIComponent(query.status));
  wx.navigateTo({
    url: '/packages/device/spare-list/index' + (qs.length ? '?' + qs.join('&') : '')
  });
}

function openInventoryList(query) {
  const gate = pageAccess.checkAccess('dev-asset-inventory', 'view', '资产盘点');
  if (!gate.ok) {
    pageAccess.denyNavigate(gate.message);
    return;
  }
  query = query || {};
  const qs = [];
  if (query.scope) qs.push('scope=' + encodeURIComponent(query.scope));
  if (query.status) qs.push('status=' + encodeURIComponent(query.status));
  wx.navigateTo({
    url: '/packages/device/inventory-list/index' + (qs.length ? '?' + qs.join('&') : '')
  });
}

function openSectionLink(sectionId) {
  if (sectionId === 'patrol') {
    openPatrolTask('pending');
    return;
  }
  if (sectionId === 'workorder') {
    openWorkorderList();
  }
}

function openStat(sectionId, itemKey) {
  if (sectionId === 'patrol') {
    if (itemKey === 'rectify') {
      openPatrolIssue('rectify');
      return;
    }
    if (itemKey === 'reinspect') {
      openPatrolIssue('reinspect');
      return;
    }
    openPatrolTask(itemKey);
    return;
  }
  if (sectionId === 'workorder' && itemKey === 'pending') {
    openWorkorderList();
    return;
  }
  if (sectionId === 'device') {
    if (itemKey === 'repair-approve') {
      openRepairList({ scope: 'org', status: '待审批' });
      return;
    }
    if (itemKey === 'repair-wo') {
      openRepairWorkorderList({ scope: 'mine' });
      return;
    }
    if (itemKey === 'spare-approve') {
      openSpareList({ scope: 'org', status: '待审批' });
      return;
    }
    if (itemKey === 'inventory') {
      openInventoryList({ scope: 'mine' });
    }
  }
}

module.exports = {
  openSectionLink: openSectionLink,
  openStat: openStat
};
