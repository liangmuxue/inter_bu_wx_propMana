const patrolTask = require('../../../services/patrol-task');
const patrolIssueQuery = require('../../../utils/patrol-issue-query');
const patrolIssueListRefresh = require('../../../utils/patrol-issue-list-refresh');
const patrolIssueFormat = require('../../../utils/patrol-issue-format');
const patrolIssueListState = require('../../../utils/patrol-issue-list-state');
const dataScope = require('../../../utils/data-scope');
const mockPatrol = require('../../../mock/patrol');
const pageAccess = require('../../../utils/page-access');

const TABS = [
  { id: 'all', label: '全部' },
  { id: 'rectify', label: '待整改' },
  { id: 'reinspect', label: '待复检' },
  { id: 'done', label: '已完成' }
];

const TAB_HINT = {
  all: '',
  rectify: '待整改',
  reinspect: '待复检',
  done: '已完成'
};

Page({
  data: {
    list: [],
    tab: 'all',
    scope: 'org',
    tabs: TABS,
    tabHint: '',
    scopeHint: '组织权限内',
    loading: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: patrolIssueQuery.emptyQueryForm(),
    statusOptions: patrolIssueQuery.STATUS_OPTIONS,
    sourceOptions: patrolIssueQuery.SOURCE_OPTIONS
  },

  persistListState(fromDetail) {
    patrolIssueListState.save({
      fromDetail: !!fromDetail,
      tab: this.data.tab,
      scope: this.data.scope,
      queryForm: this.data.queryForm,
      queryActive: this.data.queryActive,
      tabHint: this.data.tabHint,
      scopeHint: this.data.scopeHint
    });
  },

  applyEntryOptions(options) {
    options = options || {};
    const tab = options.tab || 'all';
    const scope = options.scope === 'mine' ? 'mine' : 'org';
    const queryForm = patrolIssueQuery.applyTabToForm(
      patrolIssueQuery.emptyQueryForm(),
      tab
    );
    this.setData({
      tab: tab,
      scope: scope,
      tabHint: TAB_HINT[tab] || '',
      scopeHint: scope === 'mine' ? '与我相关的' : '组织权限内',
      queryForm: queryForm,
      showFilterPanel: false,
      queryActive: patrolIssueQuery.hasActiveQuery(queryForm, tab)
    });
  },

  applyRestoredState(state) {
    const form = Object.assign(patrolIssueQuery.emptyQueryForm(), state.queryForm || {});
    const scope = state.scope === 'mine' ? 'mine' : 'org';
    const tab = state.tab || 'all';
    this.setData({
      tab: tab,
      scope: scope,
      tabHint: state.tabHint || TAB_HINT[tab] || '',
      scopeHint: state.scopeHint || (scope === 'mine' ? '与我相关的' : '组织权限内'),
      queryForm: form,
      showFilterPanel: false,
      queryActive: typeof state.queryActive === 'boolean'
        ? state.queryActive
        : patrolIssueQuery.hasActiveQuery(form, tab)
    });
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const restored = patrolIssueListState.consume();
    if (restored && restored.fromDetail) {
      this.applyRestoredState(restored);
      this._skipShowReload = true;
      this.loadList(true);
      return;
    }
    this.applyEntryOptions(options || {});
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this._openingDetail = false;
    if (this._skipShowReload) {
      this._skipShowReload = false;
      return;
    }
    const silent = !!this._shownOnce;
    this._shownOnce = true;
    const refreshPatch = patrolIssueListRefresh.consume({
      scope: this.data.scope,
      tab: this.data.tab
    });
    if (refreshPatch) {
      const pinIssueNo = refreshPatch.pinIssueNo || '';
      const scrollToTop = !!refreshPatch.scrollToTop;
      delete refreshPatch.pinIssueNo;
      delete refreshPatch.scrollToTop;
      this.setData(refreshPatch, function () {
        this.loadList(silent, false, { pinIssueNo: pinIssueNo, scrollToTop: scrollToTop });
      }.bind(this));
      return;
    }
    this.loadList(silent);
  },

  onHide() {
    if (this._openingDetail) {
      this.persistListState(true);
    }
  },

  onUnload() {
    if (this._openingDetail) {
      this.persistListState(true);
      return;
    }
    patrolIssueListState.clear();
  },

  onScopeChange(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.scope) return;
    this.setData({
      scope: scope,
      scopeHint: scope === 'mine' ? '与我相关的' : '组织权限内',
      queryActive: patrolIssueQuery.hasActiveQuery(this.data.queryForm, this.data.tab)
    });
    this.loadList();
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    const form = patrolIssueQuery.applyTabToForm(this.data.queryForm, tab);
    this.setData({
      tab: tab,
      tabHint: TAB_HINT[tab] || '',
      queryForm: form,
      queryActive: patrolIssueQuery.hasActiveQuery(form, tab)
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
    this.setData({ 'queryForm.keyword': e.detail.value });
  },

  onStatusPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const opt = this.data.statusOptions[index] || this.data.statusOptions[0];
    this.setData({
      'queryForm.statusIndex': index,
      'queryForm.status': opt.value
    });
  },

  onSourcePick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const opt = this.data.sourceOptions[index] || this.data.sourceOptions[0];
    this.setData({
      'queryForm.sourceIndex': index,
      'queryForm.source': opt.value
    });
  },

  resetQuery() {
    this.setData({
      tab: 'all',
      tabHint: '',
      scope: this.data.scope,
      queryForm: patrolIssueQuery.emptyQueryForm(),
      queryActive: false
    });
    this.closeFilterPanel();
    this.loadList();
  },

  applyQuery() {
    const form = this.data.queryForm;
    const tab = patrolIssueQuery.tabFromStatus(form.status, this.data.tab);
    this.setData({
      tab: tab,
      tabHint: TAB_HINT[tab] || '',
      queryActive: patrolIssueQuery.hasActiveQuery(form, tab),
      showFilterPanel: false
    });
    this.loadList(false, true);
  },

  buildQueryPayload() {
    const form = this.data.queryForm;
    const tab = this.data.tab;
    const statusViaTab = tab === 'rectify' || tab === 'reinspect' || tab === 'done';
    return {
      tab: tab,
      scope: this.data.scope,
      status: statusViaTab ? '' : (form.status || ''),
      source: form.source || '',
      keyword: (form.keyword || '').trim()
    };
  },

  loadList(silent, fromQuery, options) {
    options = options || {};
    if (!silent) {
      this.setData({ loading: true });
    }
    const keyword = (this.data.queryForm.keyword || '').trim();
    patrolTask.getIssues(this.buildQueryPayload()).then(function (res) {
      let list = patrolIssueFormat.ensureCreatorDisplayList(
        res.list || [],
        dataScope.formatUserDisplay,
        mockPatrol.getTaskExecutorId
      );
      if (options.pinIssueNo) {
        list = patrolIssueListRefresh.pinIssueToTop(list, options.pinIssueNo);
      }
      this.setData({ list: list, loading: false });
      if (options.scrollToTop) {
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
      }
      if (fromQuery && keyword) {
        wx.showToast({
          title: list.length ? '找到 ' + list.length + ' 条' : '无匹配结果',
          icon: 'none'
        });
      }
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    }.bind(this));
  },

  openIssue(e) {
    const issueNo = e.currentTarget.dataset.no;
    if (!issueNo) return;
    this._openingDetail = true;
    this.persistListState(true);
    wx.navigateTo({
      url: '/packages/patrol/issue-detail/index?issueNo=' + encodeURIComponent(issueNo),
      fail: function () {
        this._openingDetail = false;
        patrolIssueListState.clear();
        wx.showToast({ title: '打开问题详情失败', icon: 'none' });
      }.bind(this)
    });
  },

  openIssueAction(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    this._openingDetail = true;
    this.persistListState(true);
    wx.navigateTo({
      url: url,
      fail: function () {
        this._openingDetail = false;
        patrolIssueListState.clear();
      }.bind(this)
    });
  },

  onPullDownRefresh() {
    this.loadList();
    wx.stopPullDownRefresh();
  }
});
