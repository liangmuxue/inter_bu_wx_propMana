/**
 * 巡检任务列表筛选状态：进入详情后若页面被回收重建，用此恢复关键词等条件。
 */
let cached = null;

function save(state) {
  if (!state) {
    cached = null;
    return;
  }
  cached = {
    fromDetail: !!state.fromDetail,
    filter: state.filter || 'all',
    scope: state.scope === 'mine' ? 'mine' : 'org',
    queryForm: Object.assign({
      executor: '',
      executorIndex: 0,
      method: '',
      methodIndex: 0,
      status: '',
      statusIndex: 0,
      keyword: ''
    }, state.queryForm || {}),
    queryActive: !!state.queryActive,
    emptyHint: state.emptyHint || '',
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
