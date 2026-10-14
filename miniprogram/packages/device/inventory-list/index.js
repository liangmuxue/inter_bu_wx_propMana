const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待盘点', label: '待盘点' },
  { id: '盘点中', label: '盘点中' },
  { id: '盘点完成', label: '盘点完成' },
  { id: '未完成', label: '未完成' }
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
    scopeHint: '组织权限内',
    status: 'all',
    statusFilters: STATUS_FILTERS,
    list: [],
    loading: true,
    denied: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: emptyQuery()
  },

  ensureViewPermission() {
    const ok = pageAccess.ensureAccess('dev-asset-inventory', 'view', '资产盘点');
    if (!ok) {
      this.setData({ denied: true, loading: false, list: [] });
    }
    return ok;
  },

  onShow() {
    if (!this.ensureViewPermission()) return;
    this.loadList();
  },

  onLoad(options) {
    options = options || {};
    const patch = {};
    if (options.scope === 'mine' || options.scope === 'org') {
      patch.scope = options.scope;
      patch.scopeHint = options.scope === 'mine' ? '我的' : '组织权限内';
    }
    if (options.status) {
      const ok = STATUS_FILTERS.some(function (f) { return f.id === options.status; });
      if (ok) patch.status = options.status;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  onPullDownRefresh() {
    if (!this.ensureViewPermission()) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadList().then(function () {
      wx.stopPullDownRefresh();
    });
  },

  onScopeChange(e) {
    if (this.data.denied) return;
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.scope) return;
    this.setData({
      scope: scope,
      scopeHint: scope === 'mine' ? '我的' : '组织权限内'
    });
    this.loadList();
  },

  onStatusChange(e) {
    if (this.data.denied) return;
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

  loadList() {
    this.setData({ loading: true });
    const form = this.data.queryForm || emptyQuery();
    const status = this.data.status || 'all';
    return assetService.listInventories(status, this.data.scope, {
      status: status,
      keyword: form.keyword
    }).then(function (res) {
      if (res && res.ok === false) {
        this.setData({ loading: false, list: [], denied: true });
        pageAccess.denyNavigate(res.message || '当前账号无「资产盘点」权限');
        setTimeout(function () {
          wx.navigateBack({ fail: function () {} });
        }, 300);
        return;
      }
      const list = Array.isArray(res) ? res : ((res && res.list) || []);
      this.setData({ list: list, loading: false, denied: false });
    }.bind(this)).catch(function () {
      this.setData({ loading: false, list: [] });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  openExecute(e) {
    const id = e.currentTarget.dataset.id;
    const can = e.currentTarget.dataset.can;
    if (!can) {
      wx.showToast({ title: '仅盘点人可执行', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/packages/device/inventory-execute/index?id=' + id });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const can = e.currentTarget.dataset.can;
    if (!can) {
      wx.showToast({ title: '当前账号无盘点明细权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/packages/device/inventory-detail/index?id=' + id });
  },

  openReport(e) {
    const id = e.currentTarget.dataset.id;
    const can = e.currentTarget.dataset.can;
    if (!can) {
      wx.showToast({ title: '当前账号无查看报告权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/packages/device/inventory-report/index?id=' + id });
  },

  openAudit(e) {
    const id = e.currentTarget.dataset.id;
    const can = e.currentTarget.dataset.can;
    if (!can) {
      wx.showToast({ title: '当前账号无审核报告权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/packages/device/inventory-report/index?id=' + id + '&mode=audit' });
  }
});
