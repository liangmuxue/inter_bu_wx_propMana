/** 问题列表页刷新：整改/复检完成后回到列表、切换 tab、置顶刚操作的问题 */
const patrolIssueQuery = require('./patrol-issue-query');

const TAB_HINT = {
  all: '',
  rectify: '待整改',
  reinspect: '待复检',
  done: '已完成'
};

function tabForIssueStatus(status) {
  if (status === '已完成') return 'done';
  if (status === '待复检') return 'reinspect';
  if (status === '待整改') return 'rectify';
  return 'all';
}

function isIssueListPage(page) {
  return !!(page && (page.route || '').indexOf('issue-list/index') >= 0);
}

function notifyAfterIssueFlow(status, options) {
  options = options || {};
  const app = getApp();
  if (!app.globalData) app.globalData = {};
  app.globalData.patrolIssueListRefresh = {
    tab: options.tab || tabForIssueStatus(status),
    scope: options.scope,
    issueNo: options.issueNo || '',
    clearKeyword: options.clearKeyword !== false
  };
}

function navigateBackToIssueList() {
  const pages = getCurrentPages();
  let delta = 1;
  for (let i = pages.length - 2; i >= 0; i--) {
    if (isIssueListPage(pages[i])) {
      delta = pages.length - 1 - i;
      break;
    }
  }
  wx.navigateBack({ delta: delta });
}

function finishIssueFlow(status, options) {
  notifyAfterIssueFlow(status, options);
  setTimeout(function () {
    navigateBackToIssueList();
  }, 800);
}

function pinIssueToTop(list, issueNo) {
  list = list || [];
  issueNo = (issueNo || '').trim();
  if (!issueNo || !list.length) return list;
  const index = list.findIndex(function (item) {
    return item && item.issueNo === issueNo;
  });
  if (index <= 0) return list;
  const next = list.slice();
  next.unshift(next.splice(index, 1)[0]);
  return next;
}

function consume(pageState) {
  pageState = pageState || {};
  const app = getApp();
  const hint = app.globalData && app.globalData.patrolIssueListRefresh;
  if (!hint) return null;
  app.globalData.patrolIssueListRefresh = null;

  const tab = hint.tab || 'all';
  const scope = hint.scope === 'org' || hint.scope === 'mine'
    ? hint.scope
    : (pageState.scope === 'mine' ? 'mine' : 'org');
  let queryForm = patrolIssueQuery.emptyQueryForm();
  queryForm = patrolIssueQuery.applyTabToForm(queryForm, tab);

  return {
    tab: tab,
    tabHint: TAB_HINT[tab] || '',
    scope: scope,
    scopeHint: scope === 'mine' ? '与我相关的' : '组织权限内',
    queryForm: queryForm,
    queryActive: false,
    showFilterPanel: false,
    pinIssueNo: hint.issueNo || '',
    scrollToTop: true
  };
}

module.exports = {
  tabForIssueStatus: tabForIssueStatus,
  notifyAfterIssueFlow: notifyAfterIssueFlow,
  navigateBackToIssueList: navigateBackToIssueList,
  finishIssueFlow: finishIssueFlow,
  pinIssueToTop: pinIssueToTop,
  consume: consume,
  TAB_HINT: TAB_HINT
};
