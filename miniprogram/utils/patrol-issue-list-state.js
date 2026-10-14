/**
 * 巡检问题列表筛选状态：进入详情后若页面被回收重建，用此恢复关键词等条件。
 * 对齐 utils/patrol-task-list-state.js
 */
let cached = null;

function save(state) {
  if (!state) {
    cached = null;
    return;
  }
  cached = {
    fromDetail: !!state.fromDetail,
    tab: state.tab || 'all',
    scope: state.scope === 'mine' ? 'mine' : 'org',
    queryForm: Object.assign({
      status: '',
      statusIndex: 0,
      source: '',
      sourceIndex: 0,
      keyword: ''
    }, state.queryForm || {}),
    queryActive: !!state.queryActive,
    tabHint: state.tabHint || '',
    scopeHint: state.scopeHint || ''
  };
}

function consume() {
  const state = cached;
  cached = null;
  return state;
}

function clear() {
  cached = null;
}

module.exports = {
  save: save,
  consume: consume,
  clear: clear
};
