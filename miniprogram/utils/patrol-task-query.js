/**
 * 巡检任务列表查询条件（对齐 PC patrol-task 筛选栏）
 */
const dataScope = require('./data-scope');
const taskStore = require('../mock/patrol-task-store');

const METHOD_OPTIONS = [
  { value: '', label: '全部检查方法' },
  { value: '现场', label: '现场' },
  { value: '远程', label: '远程' },
  { value: '自动', label: '自动' }
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: '待完成', label: '待完成' },
  { value: '已完成', label: '已完成' },
  { value: '已超时', label: '已超时' }
];

const STATUS_TO_FILTER = {
  '待完成': 'pending',
  '已完成': 'done',
  '已超时': 'overdue'
};

const FILTER_TO_STATUS = {
  pending: '待完成',
  done: '已完成',
  overdue: '已超时'
};

function statusIndexForValue(status) {
  const idx = STATUS_OPTIONS.findIndex(function (o) { return o.value === (status || ''); });
  return idx >= 0 ? idx : 0;
}

/** 高级筛选任务状态 → 顶部 tab */
function filterFromStatus(status, currentFilter) {
  if (status && STATUS_TO_FILTER[status]) return STATUS_TO_FILTER[status];
  if (currentFilter === 'pending' || currentFilter === 'done' || currentFilter === 'overdue') {
    return 'all';
  }
  return currentFilter || 'all';
}

/** 顶部 tab → 高级筛选任务状态 */
function statusFromFilter(filter) {
  return FILTER_TO_STATUS[filter] || '';
}

function applyStatusToForm(form, status) {
  const next = Object.assign({}, form || emptyQueryForm());
  next.status = status || '';
  next.statusIndex = statusIndexForValue(next.status);
  return next;
}

function taskHasMethod(taskId, method) {
  if (!method) return true;
  const subtasks = taskStore.getSubtasks(taskId);
  return subtasks.some(function (st) { return st.method === method; });
}

function matchExecutor(task, executorKey) {
  if (!executorKey) return true;
  const ids = Array.isArray(task.executorIds) && task.executorIds.length
    ? task.executorIds
    : (task.executorId ? [task.executorId] : []);
  if (ids.indexOf(executorKey) >= 0) return true;
  const display = ids.map(function (id) {
    return dataScope.formatExecutorDisplay(id);
  }).join('、') || dataScope.formatExecutorDisplay(task.executorId);
  const user = dataScope.getUserProfile(executorKey);
  if (user && display.indexOf(user.name) >= 0) return true;
  return display.indexOf(executorKey) >= 0;
}

function matchKeyword(task, keyword) {
  if (!keyword) return true;
  const kw = String(keyword).trim().toLowerCase();
  if (!kw) return true;
  const ids = Array.isArray(task.executorIds) && task.executorIds.length
    ? task.executorIds
    : (task.executorId ? [task.executorId] : []);
  const fields = [
    task.taskId,
    task.planCode,
    task.planName,
    task.objectName,
    task.executorName,
    ids.map(function (id) { return dataScope.formatExecutorDisplay(id); }).join('、')
  ];
  return fields.some(function (field) {
    return String(field || '').toLowerCase().indexOf(kw) >= 0;
  });
}

/** 高级查询（PC：执行人 / 检查方法 / 状态 / 关键词） */
function matchAdvancedQuery(task, query) {
  query = query || {};
  if (!matchExecutor(task, query.executor || '')) return false;
  if (!taskHasMethod(task.taskId, query.method || '')) return false;
  if (query.status && task.status !== query.status) return false;
  if (!matchKeyword(task, (query.keyword || '').trim())) return false;
  return true;
}

function hasActiveAdvancedQuery(query, scope) {
  query = query || {};
  if (scope !== 'mine' && query.executor) return true;
  return !!(query.method || (query.keyword || '').trim());
}

function buildExecutorOptions(accessibleUserIds) {
  const options = [{ value: '', label: '全部执行人' }];
  const seen = {};
  (accessibleUserIds || []).forEach(function (uid) {
    const user = dataScope.getUserProfile(uid);
    if (!user || seen[uid]) return;
    seen[uid] = true;
    options.push({ value: uid, label: user.name });
  });
  return options;
}

function emptyQueryForm() {
  return {
    executor: '',
    executorIndex: 0,
    method: '',
    methodIndex: 0,
    status: '',
    statusIndex: 0,
    keyword: ''
  };
}

module.exports = {
  METHOD_OPTIONS: METHOD_OPTIONS,
  STATUS_OPTIONS: STATUS_OPTIONS,
  matchAdvancedQuery: matchAdvancedQuery,
  matchKeyword: matchKeyword,
  hasActiveAdvancedQuery: hasActiveAdvancedQuery,
  buildExecutorOptions: buildExecutorOptions,
  emptyQueryForm: emptyQueryForm,
  filterFromStatus: filterFromStatus,
  statusFromFilter: statusFromFilter,
  applyStatusToForm: applyStatusToForm
};
