const spareService = require('../../../services/spare');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待审批', label: '待审批' },
  { id: '派发审批通过', label: '已通过' },
  { id: '派发审批驳回', label: '已驳回' }
];

function emptyQuery() {
  return { keyword: '' };
}

function hasActiveQuery(form) {
  return !!(form && String(form.keyword || '').trim());
}

Page({
  data: {
    scope: 'org',
    status: 'all',
    statusFilters: STATUS_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: emptyQuery(),
    canAdd: false
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
    spareService.canAddUsage().then(function (canAdd) {
      this.setData({ canAdd: !!canAdd });
    }.bind(this));
  },

  onLoad(options) {
    options = options || {};
    const patch = {};
    if (options.scope === 'mine' || options.scope === 'org') {
      patch.scope = options.scope;
    }
    if (options.status) {
      const ok = STATUS_FILTERS.some(function (f) { return f.id === options.status; });
      if (ok) patch.status = options.status;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  onScopeChange(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.scope) return;
    this.setData({ scope: scope });
    this.loadList();
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.status) return;
    this.setData({ status: status });
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

  resetQuery() {
    this.setData({
      queryForm: emptyQuery(),
      queryActive: false,
      showFilterPanel: false
    });
    this.loadList();
  },

  applyQuery() {
    const form = this.data.queryForm;
    this.setData({
      queryActive: hasActiveQuery(form),
      showFilterPanel: false
    });
    this.loadList();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().then(function () {
      this.setData({ refreshing: false });
    }.bind(this)).catch(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    const form = this.data.queryForm || emptyQuery();
    const status = this.data.status || 'all';
    return spareService.listUsages(status, this.data.scope, {
      status: status,
      keyword: form.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  preventBubble() {},

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/packages/device/spare-detail/index?id=' + id });
  },

  goCreate() {
    if (!this.data.canAdd) {
      pageAccess.denyNavigate('当前账号无「领用申请」权限');
      return;
    }
    wx.navigateTo({ url: '/packages/device/spare-create/index' });
  },

  handleActionResult(res) {
    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: res.message || '操作成功', icon: 'success' });
    this.loadList();
  },

  onApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/packages/device/spare-approve/index?id=' + encodeURIComponent(id || '')
    });
  }
});
