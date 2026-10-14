const patrolTask = require('../../../services/patrol-task');
const dataScope = require('../../../utils/data-scope');
const patrolTaskQuery = require('../../../utils/patrol-task-query');
const patrolTaskListState = require('../../../utils/patrol-task-list-state');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');
const pageAccess = require('../../../utils/page-access');

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'today', label: '今日' },
  { id: 'pending', label: '待完成' },
  { id: 'done', label: '已完成' },
  { id: 'overdue', label: '已超时' }
];

const EMPTY_HINT = {
  all: '',
  today: '今日',
  pending: '待完成',
  done: '已完成',
  overdue: '已超时'
};

function buildExecutorOptions() {
  const user = userDisplay.normalizeUser(session.getUser());
  const ids = dataScope.getAccessibleUserIds(user);
  return patrolTaskQuery.buildExecutorOptions(ids);
}

Page({
  data: {
    list: [],
    filter: 'all',
    scope: 'org',
    filters: FILTERS,
    emptyHint: '',
    scopeHint: '组织权限内',
    loading: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: patrolTaskQuery.emptyQueryForm(),
    executorOptions: [{ value: '', label: '全部执行人' }],
    methodOptions: patrolTaskQuery.METHOD_OPTIONS,
    statusOptions: patrolTaskQuery.STATUS_OPTIONS
  },

  persistListState(fromDetail) {
    patrolTaskListState.save({
      fromDetail: !!fromDetail,
      filter: this.data.filter,
      scope: this.data.scope,
      queryForm: this.data.queryForm,
      queryActive: this.data.queryActive,
      emptyHint: this.data.emptyHint,
      scopeHint: this.data.scopeHint
    });
  },

  applyEntryOptions(options) {
    options = options || {};
    const filter = options.filter || 'all';
    const scope = options.scope === 'mine' ? 'mine' : 'org';
    const queryForm = patrolTaskQuery.applyStatusToForm(
      patrolTaskQuery.emptyQueryForm(),
      patrolTaskQuery.statusFromFilter(filter)
    );
    this.setData({
      filter: filter,
      scope: scope,
      emptyHint: EMPTY_HINT[filter] || '',
      scopeHint: scope === 'mine' ? '我的' : '组织权限内',
      executorOptions: buildExecutorOptions(),
      queryForm: queryForm,
      showFilterPanel: false,
      queryActive: patrolTaskQuery.hasActiveAdvancedQuery(queryForm, scope)
    });
  },

  applyRestoredState(state) {
    const form = Object.assign(patrolTaskQuery.emptyQueryForm(), state.queryForm || {});
    const scope = state.scope === 'mine' ? 'mine' : 'org';
    this.setData({
      filter: state.filter || 'all',
      scope: scope,
      emptyHint: state.emptyHint || EMPTY_HINT[state.filter] || '',
      scopeHint: state.scopeHint || (scope === 'mine' ? '我的' : '组织权限内'),
      executorOptions: buildExecutorOptions(),
      queryForm: form,
      showFilterPanel: false,
      queryActive: typeof state.queryActive === 'boolean'
        ? state.queryActive
        : patrolTaskQuery.hasActiveAdvancedQuery(form, scope)
    });
  },

  resetFiltersToDefault() {
    patrolTaskListState.clear();
    this.setData({
      filter: 'all',
      scope: 'org',
      emptyHint: '',
      scopeHint: '组织权限内',
      showFilterPanel: false,
      queryForm: patrolTaskQuery.emptyQueryForm(),
      queryActive: false,
      executorOptions: buildExecutorOptions()
    });
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const restored = patrolTaskListState.consume();
    if (restored && restored.fromDetail) {
      this.applyRestoredState(restored);
      this._skipShowReload = true;
      this.loadList();
      return;
    }
    this.applyEntryOptions(options || {});
    this._skipShowReload = true;
    this.loadList();
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this._openingDetail = false;
    if (this._skipShowReload) {
      this._skipShowReload = false;
      return;
    }
    // 页面仍在栈内：保留当前筛选，仅刷新列表
    this.loadList();
  },

  onHide() {
    if (this._openingDetail) {
      this.persistListState(true);
    }
  },

  onUnload() {
    if (this._openingDetail) {
      // 进入详情时页面被回收：保留筛选供返回后 onLoad 恢复
      this.persistListState(true);
      return;
    }
    patrolTaskListState.clear();
  },

  onScopeChange(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.scope) return;
    const form = Object.assign({}, this.data.queryForm);
    if (scope === 'mine') {
      form.executor = '';
      form.executorIndex = 0;
    }
    this.setData({
      scope: scope,
      scopeHint: scope === 'mine' ? '我的' : '组织权限内',
      queryForm: form,
      queryActive: patrolTaskQuery.hasActiveAdvancedQuery(form, scope)
    });
    this.loadList();
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.filter) return;
    const form = patrolTaskQuery.applyStatusToForm(
      this.data.queryForm,
      patrolTaskQuery.statusFromFilter(filter)
    );
    this.setData({
      filter: filter,
      emptyHint: EMPTY_HINT[filter] || '',
      queryForm: form,
      queryActive: patrolTaskQuery.hasActiveAdvancedQuery(form, this.data.scope)
    });
    this.loadList();
  },

  openFilterPanel() {
    this.setData({ showFilterPanel: true });
  },

  closeFilterPanel() {
    this.setData({ showFilterPanel: false });
  },

  preventClose() {},

  onQueryKeywordInput(e) {
    this.setData({ 'queryForm.keyword': e.detail.value || '' });
  },

  onExecutorPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const opt = this.data.executorOptions[index] || this.data.executorOptions[0];
    this.setData({
      'queryForm.executorIndex': index,
      'queryForm.executor': opt.value
    });
  },

  onMethodPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const opt = this.data.methodOptions[index] || this.data.methodOptions[0];
    this.setData({
      'queryForm.methodIndex': index,
      'queryForm.method': opt.value
    });
  },

  onStatusPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const opt = this.data.statusOptions[index] || this.data.statusOptions[0];
    this.setData({
      'queryForm.statusIndex': index,
      'queryForm.status': opt.value
    });
  },

  resetQuery() {
    this.resetFiltersToDefault();
    this.closeFilterPanel();
    this.loadList();
  },

  applyQuery(e) {
    const form = Object.assign({}, this.data.queryForm);
    if (e && e.detail && typeof e.detail.value === 'string') {
      form.keyword = e.detail.value;
    }
    form.keyword = (form.keyword || '').trim();
    const filter = patrolTaskQuery.filterFromStatus(form.status, this.data.filter);
    const queryActive = patrolTaskQuery.hasActiveAdvancedQuery(form, this.data.scope);
    const payload = this.buildQueryPayload(form, filter);
    this.setData({
      queryForm: form,
      filter: filter,
      emptyHint: EMPTY_HINT[filter] || '',
      queryActive: queryActive,
      showFilterPanel: false
    });
    this.loadList(true, payload);
  },

  buildQueryPayload(form, filter) {
    form = form || this.data.queryForm;
    filter = filter == null ? this.data.filter : filter;
    const statusViaTab = filter === 'pending' || filter === 'done' || filter === 'overdue';
    return {
      filter: filter,
      scope: this.data.scope,
      executor: this.data.scope === 'mine' ? '' : (form.executor || ''),
      method: form.method || '',
      status: statusViaTab ? '' : (form.status || ''),
      keyword: (form.keyword || '').trim()
    };
  },

  loadList(fromQuery, payload) {
    this.setData({ loading: true });
    const query = payload || this.buildQueryPayload();
    const keyword = (query.keyword || '').trim();
    patrolTask.getTasks(query).then(function (res) {
      const list = res.list || [];
      this.setData({ list: list, loading: false });
      if (fromQuery && keyword) {
        wx.showToast({
          title: list.length ? '找到 ' + list.length + ' 条' : '无匹配结果',
          icon: 'none'
        });
      }
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    });
  },

  openTask(e) {
    const taskId = (e.currentTarget.dataset.id || '').trim();
    if (!taskId) {
      wx.showToast({ title: '任务编号无效', icon: 'none' });
      return;
    }
    this._openingDetail = true;
    this.persistListState(true);
    wx.navigateTo({
      url: '/packages/patrol/task-detail/index?taskId=' + encodeURIComponent(taskId),
      fail: function () {
        this._openingDetail = false;
        patrolTaskListState.clear();
        wx.showToast({ title: '打开任务详情失败', icon: 'none' });
      }.bind(this)
    });
  },

  onUrge(e) {
    const taskId = (e.currentTarget.dataset.id || '').trim();
    if (!taskId) return;
    wx.showModal({
      title: '催办确认',
      content: '将向当前可执行人发送站内信催办，是否继续？',
      success: function (res) {
        if (!res.confirm) return;
        patrolTask.urgeTask(taskId).then(function (result) {
          wx.showToast({
            title: (result && result.message) || '催办已发送',
            icon: 'none'
          });
        }).catch(function (err) {
          wx.showToast({
            title: (err && err.message) || '催办失败',
            icon: 'none'
          });
        });
      }
    });
  },

  onReassign(e) {
    const taskId = (e.currentTarget.dataset.id || '').trim();
    if (!taskId) return;
    this._openingDetail = true;
    this.persistListState(true);
    wx.navigateTo({
      url: '/packages/patrol/task-detail/index?taskId=' + encodeURIComponent(taskId) +
        '&action=reassign',
      fail: function () {
        this._openingDetail = false;
        patrolTaskListState.clear();
        wx.showToast({ title: '打开转派失败', icon: 'none' });
      }.bind(this)
    });
  },

  onPullDownRefresh() {
    this.loadList();
    wx.stopPullDownRefresh();
  }
});
