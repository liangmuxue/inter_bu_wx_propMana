const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');

const PASS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '未生效', label: '未生效' },
  { id: '生效中', label: '生效中' },
  { id: '已作废', label: '已作废' },
  { id: '已结束', label: '已结束' }
];

function emptyQuery() {
  return { keyword: '' };
}

function hasActiveQuery(form) {
  return !!(form && String(form.keyword || '').trim());
}

Page({
  data: {
    tab: 'org',
    passAuth: 'all',
    passFilters: PASS_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: emptyQuery()
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.tab) return;
    this.setData({ tab: tab });
    this.loadList();
  },

  onPassFilterChange(e) {
    const passAuth = e.currentTarget.dataset.id;
    if (passAuth === this.data.passAuth) return;
    this.setData({ passAuth: passAuth });
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
    this.setData({
      queryActive: hasActiveQuery(this.data.queryForm),
      showFilterPanel: false
    });
    this.loadList();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().then(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    const form = this.data.queryForm || emptyQuery();
    return visitorService.listVisitorPass({
      tab: this.data.tab,
      passAuth: this.data.passAuth,
      keyword: form.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/packages/visitor/visitor-detail/index?id=' + encodeURIComponent(id) +
        (this.data.tab === 'mine' ? '&from=mineApprove' : '')
    });
  },

  onVoidPass(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this._voiding) return;
    const page = this;
    wx.showModal({
      title: '作废通行授权？',
      content: '作废后该访客通行授权将失效，确认作废？',
      confirmText: '确认作废',
      confirmColor: '#E53E3E',
      success: function (res) {
        if (!res.confirm) return;
        page._voiding = true;
        visitorService.voidVisitorPass({ visitId: id }).then(function (result) {
          page._voiding = false;
          if (!result || !result.ok) {
            wx.showToast({ title: (result && result.message) || '作废失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: result.message || '已作废通行授权', icon: 'success' });
          page.loadList();
        }).catch(function () {
          page._voiding = false;
          wx.showToast({ title: '作废失败', icon: 'none' });
        });
      }
    });
  }
});
