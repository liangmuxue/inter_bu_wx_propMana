const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '已派单', label: '已派单' },
  { id: '维修处理中', label: '处理中' },
  { id: '维修完成（已完结）', label: '维修完成' },
  { id: '维修失败（无法处理）', label: '维修失败' },
  { id: '工单作废', label: '已作废' }
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
    showVoidModal: false,
    voidWorkOrderId: '',
    voidTitle: '作废工单',
    voidReason: '',
    voidSubmitting: false
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
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
    return assetService.listWorkOrders(status, this.data.scope, {
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
    wx.navigateTo({ url: '/packages/device/repair-workorder-detail/index?id=' + id });
  },

  handleActionResult(res) {
    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: res.message || '操作成功', icon: 'success' });
    this.loadList();
  },

  onAccept(e) {
    const id = e.currentTarget.dataset.id;
    assetService.acceptWorkOrder(id).then(this.handleActionResult.bind(this));
  },

  onTransfer(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/packages/device/repair-workorder-transfer/index?id=' + encodeURIComponent(id || '')
    });
  },

  onVoid(e) {
    const id = e.currentTarget.dataset.id;
    const code = e.currentTarget.dataset.code || '';
    this.setData({
      showVoidModal: true,
      voidWorkOrderId: id || '',
      voidTitle: code ? ('作废工单 — ' + code) : '作废工单',
      voidReason: '',
      voidSubmitting: false
    });
  },

  closeVoidModal() {
    if (this.data.voidSubmitting) return;
    this.setData({
      showVoidModal: false,
      voidWorkOrderId: '',
      voidReason: ''
    });
  },

  onVoidReasonInput(e) {
    this.setData({
      voidReason: e.detail.value
    });
  },

  submitVoidModal() {
    if (this.data.voidSubmitting) return;
    const reason = String(this.data.voidReason || '').trim();
    if (!reason) {
      wx.showToast({ title: '请填写作废原因', icon: 'none' });
      return;
    }
    const id = this.data.voidWorkOrderId;
    this.setData({ voidSubmitting: true });
    assetService.voidWorkOrder(id, { voidReason: reason }).then(function (res) {
      this.setData({ voidSubmitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '作废失败', icon: 'none' });
        return;
      }
      this.setData({
        showVoidModal: false,
        voidWorkOrderId: '',
        voidReason: ''
      });
      this.handleActionResult(res);
    }.bind(this)).catch(function () {
      this.setData({ voidSubmitting: false });
      wx.showToast({ title: '作废失败', icon: 'none' });
    }.bind(this));
  },

  onFinish(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/packages/device/repair-workorder-finish/index?id=' + encodeURIComponent(id || '')
    });
  }
});
