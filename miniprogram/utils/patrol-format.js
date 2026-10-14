const dataScope = require('./data-scope');

function statusTagClass(status) {
  if (status === '已完成') return 'tag-success';
  if (status === '已超时') return 'tag-danger';
  return 'tag-info';
}

/** 现场多点：按各巡更点打卡人去重（与 PC collectPatrolSubtaskActualExecutorIds 一致） */
function collectSubtaskActualExecutorIds(sub) {
  if (!sub) return [];
  const ids = [];
  const seen = {};
  const push = function (id) {
    id = String(id || '').trim();
    if (!id || seen[id]) return;
    seen[id] = true;
    ids.push(id);
  };
  const results = sub.guardPointResults || {};
  Object.keys(results).forEach(function (pointId) {
    const pr = results[pointId];
    if (pr && pr.completedById) push(pr.completedById);
  });
  if (!ids.length && Array.isArray(sub.completedByIds)) {
    sub.completedByIds.forEach(push);
  }
  if (!ids.length && sub.completedById) push(sub.completedById);
  return ids;
}

/** 巡检项实际执行人展示（与 PC formatPatrolSubtaskActualExecutorDisplay 一致） */
function formatSubtaskActualExecutorName(sub) {
  if (!sub) return '—';
  if (sub.completedBySystem || sub.autoRan || (sub.method === '自动' && sub.status === '已完成' && !sub.completedById)) {
    return '系统';
  }
  const ids = collectSubtaskActualExecutorIds(sub);
  if (!ids.length) return '—';
  return ids.map(function (id) { return dataScope.formatExecutorDisplay(id); }).join('、');
}

function formatPointCheckinActorName(pointResult) {
  const id = pointResult && pointResult.completedById;
  if (!id) return '';
  return dataScope.formatExecutorDisplay(id);
}

function methodTagClass(method) {
  if (method === '现场') return 'tag-warning';
  if (method === '远程') return 'tag-info';
  if (method === '自动') return 'tag-success';
  return 'tag-info';
}

function canExecuteSubtask(sub) {
  if (!sub) return false;
  return sub.status === '待完成' || sub.status === '已超时';
}

/** isExecutor：当前用户是否为本任务执行人（多人任务任一人即可）
 * 非执行人对未完成的现场/远程项仅展示「仅执行人可操作」，不可进入（与 PC 一致）。
 * 自动巡检仅系统执行：待完成显示「系统执行」，已完成可「查看结果」
 */
function getSubtaskAction(sub, options) {
  options = options || {};
  const isExecutor = !!options.isExecutor;
  if (!sub) return { type: 'none', label: '' };
  if (sub.method === '自动') {
    if (sub.status === '已完成' || sub.autoRan) {
      return { type: 'view', label: '查看结果' };
    }
    return { type: 'hint', label: '系统执行' };
  }
  if (sub.method === '现场' || sub.method === '远程') {
    if (canExecuteSubtask(sub)) {
      if (!isExecutor) return { type: 'hint', label: '仅执行人可操作' };
      return { type: 'exec', label: '去执行' };
    }
    if (sub.status === '已完成') return { type: 'view', label: '查看结果' };
  }
  return { type: 'none', label: '' };
}

function orderModeLabel(mode) {
  return mode === 'random' ? '可随机打卡' : '须依次打卡';
}

function checkinTypeLabel(type) {
  if (type === 'access') return '门禁打卡';
  if (type === 'nfc') return 'NFC 标签';
  return '扫描二维码';
}

module.exports = {
  statusTagClass,
  methodTagClass,
  canExecuteSubtask,
  getSubtaskAction,
  orderModeLabel,
  checkinTypeLabel,
  collectSubtaskActualExecutorIds,
  formatSubtaskActualExecutorName,
  formatPointCheckinActorName
};
