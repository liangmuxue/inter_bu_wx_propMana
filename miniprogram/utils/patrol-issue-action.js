/** 巡检问题操作权限（对齐 PC buildPatrolIssueManageActionHtml） */
const taskStore = require('../mock/patrol-task-store');
const patrolIssueCreator = require('./patrol-issue-creator');

const SOURCE_TO_METHOD = {
  '现场巡检': '现场',
  '远程巡检': '远程',
  '自动巡检': '自动',
  '临时上报': '现场'
};

function resolveCheckMethod(issue) {
  issue = issue || {};
  if (issue.method) return issue.method;
  if (issue.checkMethod) return issue.checkMethod;
  const spec = taskStore.getItemSpec(issue.itemId);
  if (spec && spec.method) return spec.method;
  if (issue.source && SOURCE_TO_METHOD[issue.source]) {
    return SOURCE_TO_METHOD[issue.source];
  }
  return '现场';
}

function buildReinspectUrl(issue) {
  const issueNo = encodeURIComponent(issue.issueNo || '');
  return '/packages/patrol/issue-reinspect-onsite/index?issueNo=' + issueNo;
}

function buildDetailUrl(issueNo) {
  return '/packages/patrol/issue-detail/index?issueNo=' + encodeURIComponent(issueNo || '');
}

function buildEditUrl(issueNo) {
  return '/packages/patrol/issue-report/index?issueNo=' + encodeURIComponent(issueNo || '') + '&mode=edit';
}

function buildRectifyUrl(issueNo) {
  return '/packages/patrol/issue-rectify/index?issueNo=' + encodeURIComponent(issueNo || '');
}

function isIssueCreator(issue, userId) {
  if (!userId || !issue) return false;
  if (patrolIssueCreator.isAutoPatrolIssue(issue)) return false;
  return issue.creatorId === userId;
}

function isIssueHandler(issue, userId) {
  return !!(userId && issue && issue.handlerId === userId);
}

function isIssueEditable(issue) {
  issue = issue || {};
  if (issue.source !== '临时上报') return false;
  if (issue.editable === false) return false;
  return true;
}

/**
 * @returns {{ actions: Array, canEdit: boolean, canRectify: boolean, canReinspect: boolean, primaryAction: object|null }}
 */
function getIssueActions(issue, userId) {
  issue = issue || {};
  const actions = [];
  const status = issue.status || '';
  const creator = isIssueCreator(issue, userId);
  const handler = isIssueHandler(issue, userId);
  const editable = isIssueEditable(issue);

  actions.push({
    type: 'detail',
    label: '详情',
    url: buildDetailUrl(issue.issueNo)
  });

  if (editable && status === '待整改' && creator) {
    actions.push({
      type: 'edit',
      label: '编辑',
      url: buildEditUrl(issue.issueNo)
    });
  }

  // 仅问题处理人 + 待整改
  if (status === '待整改' && handler) {
    actions.push({
      type: 'rectify',
      label: '整改',
      url: buildRectifyUrl(issue.issueNo),
      emphasis: true
    });
  }

  // 仅问题创建人（复检人）+ 待复检；自动巡检由系统自动复检，无需手动入口
  const checkMethod = resolveCheckMethod(issue);
  if (status === '待复检' && creator && checkMethod !== '自动') {
    actions.push({
      type: 'reinspect',
      label: '复检',
      url: buildReinspectUrl(issue),
      emphasis: true
    });
  }

  const primaryTypes = ['rectify', 'reinspect'];
  let primaryAction = null;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (primaryTypes.indexOf(actions[i].type) >= 0) {
      primaryAction = actions[i];
      break;
    }
  }

  return {
    actions: actions,
    canEdit: editable && status === '待整改' && creator,
    canRectify: status === '待整改' && handler,
    canReinspect: status === '待复检' && creator && resolveCheckMethod(issue) !== '自动',
    primaryAction: primaryAction,
    checkMethod: resolveCheckMethod(issue)
  };
}

function attachIssueActions(issue, userId) {
  const meta = getIssueActions(issue, userId);
  const issueNo = issue.issueNo || '';
  return Object.assign({}, issue, {
    actions: meta.actions,
    canEdit: meta.canEdit,
    canRectify: meta.canRectify,
    canReinspect: meta.canReinspect,
    primaryAction: meta.primaryAction,
    checkMethod: meta.checkMethod,
    editUrl: meta.canEdit ? buildEditUrl(issueNo) : '',
    rectifyUrl: meta.canRectify ? buildRectifyUrl(issueNo) : '',
    reinspectUrl: meta.canReinspect ? buildReinspectUrl(issue) : '',
    hasActions: meta.canEdit || meta.canRectify || meta.canReinspect,
    showActionBar: true
  });
}

function getDetailPageActions(actions) {
  return (actions || []).filter(function (action) {
    return action.type !== 'detail';
  });
}

function formatCheckMethodLabel(method) {
  const map = { '现场': '现场巡检', '远程': '远程巡检', '自动': '自动巡检' };
  return map[method] || '现场巡检';
}

module.exports = {
  SOURCE_TO_METHOD: SOURCE_TO_METHOD,
  resolveCheckMethod: resolveCheckMethod,
  formatCheckMethodLabel: formatCheckMethodLabel,
  getIssueActions: getIssueActions,
  attachIssueActions: attachIssueActions,
  getDetailPageActions: getDetailPageActions,
  isIssueEditable: isIssueEditable,
  buildDetailUrl: buildDetailUrl,
  buildEditUrl: buildEditUrl,
  buildRectifyUrl: buildRectifyUrl,
  buildReinspectUrl: buildReinspectUrl
};
