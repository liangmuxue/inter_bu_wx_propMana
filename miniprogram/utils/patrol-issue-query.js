/** 巡检问题列表查询条件（对齐 PC patrol-issue 筛选栏） */
const dataScope = require('./data-scope');
const patrolIssueCreator = require('./patrol-issue-creator');

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: '待整改', label: '待整改' },
  { value: '待复检', label: '待复检' },
  { value: '已完成', label: '已完成' }
];

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: '现场巡检', label: '现场巡检' },
  { value: '远程巡检', label: '远程巡检' },
  { value: '自动巡检', label: '自动巡检' },
  { value: '临时上报', label: '临时上报' }
];

const TAB_TO_STATUS = {
  rectify: '待整改',
  reinspect: '待复检',
  done: '已完成'
};

const STATUS_TO_TAB = {
  '待整改': 'rectify',
  '待复检': 'reinspect',
  '已完成': 'done'
};

function statusIndexForValue(status) {
  const idx = STATUS_OPTIONS.findIndex(function (o) { return o.value === (status || ''); });
  return idx >= 0 ? idx : 0;
}

function sourceIndexForValue(source) {
  const idx = SOURCE_OPTIONS.findIndex(function (o) { return o.value === (source || ''); });
  return idx >= 0 ? idx : 0;
}

function tabFromStatus(status, currentTab) {
  if (status && STATUS_TO_TAB[status]) return STATUS_TO_TAB[status];
  if (currentTab === 'rectify' || currentTab === 'reinspect' || currentTab === 'done') {
    return 'all';
  }
  return currentTab || 'all';
}

function statusFromTab(tab) {
  return TAB_TO_STATUS[tab] || '';
}

function applyStatusToForm(form, status) {
  const next = Object.assign({}, form || emptyQueryForm());
  next.status = status || '';
  next.statusIndex = statusIndexForValue(next.status);
  return next;
}

function applyTabToForm(form, tab) {
  return applyStatusToForm(form, statusFromTab(tab));
}

function emptyQueryForm() {
  return {
    status: '',
    statusIndex: 0,
    source: '',
    sourceIndex: 0,
    keyword: ''
  };
}

function hasActiveQuery(form, tab) {
  form = form || {};
  if ((form.keyword || '').trim()) return true;
  if (form.source) return true;
  const tabStatus = statusFromTab(tab);
  if (form.status && form.status !== tabStatus) return true;
  return false;
}

function buildIssueSearchHaystack(issue, taskMeta, resolveTaskExecutorId) {
  issue = issue || {};
  taskMeta = taskMeta || {};
  const creatorLabel = issue.creatorName || patrolIssueCreator.formatCreatorName(
    issue,
    dataScope.formatUserDisplay.bind(dataScope),
    resolveTaskExecutorId
  );
  return [
    issue.issueNo,
    issue.title,
    issue.desc,
    issue.source,
    issue.status,
    issue.taskId,
    issue.taskLabel,
    taskMeta.planName,
    issue.objectName,
    issue.objectLabel,
    issue.itemId,
    issue.itemName,
    issue.itemLabel,
    creatorLabel,
    issue.handlerName,
    dataScope.formatUserDisplay(issue.creatorId),
    dataScope.formatUserDisplay(issue.handlerId),
    patrolIssueCreator.AUTO_PATROL_CREATOR_SUFFIX
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchAdvancedQuery(issue, query, taskMeta) {
  query = query || {};
  issue = issue || {};

  if (query.status && issue.status !== query.status) return false;
  if (query.source && issue.source !== query.source) return false;

  const keyword = (query.keyword || '').trim();
  if (!keyword) return true;
  const hay = buildIssueSearchHaystack(issue, taskMeta);
  return hay.indexOf(keyword.toLowerCase()) >= 0;
}

module.exports = {
  STATUS_OPTIONS: STATUS_OPTIONS,
  SOURCE_OPTIONS: SOURCE_OPTIONS,
  emptyQueryForm: emptyQueryForm,
  statusIndexForValue: statusIndexForValue,
  sourceIndexForValue: sourceIndexForValue,
  tabFromStatus: tabFromStatus,
  statusFromTab: statusFromTab,
  applyStatusToForm: applyStatusToForm,
  applyTabToForm: applyTabToForm,
  hasActiveQuery: hasActiveQuery,
  matchAdvancedQuery: matchAdvancedQuery
};
