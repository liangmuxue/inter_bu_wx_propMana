/**
 * 小程序关键字「模拟检索」：在已加载的 mock 列表上本地过滤，不请求服务端。
 * 对齐 PC patrol-control.js applyPatrolTableFilter 的前端筛选行为。
 */
const patrolIssueQuery = require('./patrol-issue-query');
const patrolTaskQuery = require('./patrol-task-query');

function filterIssues(list, keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return (list || []).slice();
  return (list || []).filter(function (issue) {
    return patrolIssueQuery.matchAdvancedQuery(issue, { keyword: keyword }, null);
  });
}

function filterTasks(list, keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return (list || []).slice();
  return (list || []).filter(function (task) {
    return patrolTaskQuery.matchAdvancedQuery(task, { keyword: keyword });
  });
}

function splitKeywordQuery(query) {
  query = query || {};
  const keyword = (query.keyword || '').trim();
  const rest = Object.assign({}, query);
  delete rest.keyword;
  return { keyword: keyword, query: rest };
}

module.exports = {
  filterIssues: filterIssues,
  filterTasks: filterTasks,
  splitKeywordQuery: splitKeywordQuery
};
