const workorderService = require('../../../services/workorder');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待派单', label: '待派单' },
  { id: '待派单（退回）', label: '待派单（退回）' },
  { id: '已派单', label: '已派单' },
  { id: '处理中', label: '处理中' },
  { id: '已完结', label: '已完结' },
  { id: '已撤回', label: '已撤回' }
];

function emptyQuery() {
  return { keyword: '' };
}

function buildQuerySummary(form) {
  const kw = String((form && form.keyword) || '').trim();
  if (!kw) return '已启用查询筛选';
  return '关键词：' + kw;
}

Page({
  data: {
    tab: 'all',
    status: 'all',
    statusFilters: STATUS_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showFilterPanel: false,
    queryActive: false,
    querySummaryText: '',
    queryForm: emptyQuery()
  },

  onLoad(options) {
    const tab = options.tab === 'mine' || options.tab === 'pending' ? 'mine' : 'all';
    this.setData({ tab: tab });
    wx.setNavigationBarTitle({ title: '区域工单' });
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab: tab });
    wx.setNavigationBarTitle({ title: '区域工单' });
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
      querySummaryText: '',
      showFilterPanel: false
    });
    this.loadList();
  },

  applyQuery() {
    const form = this.data.queryForm;
    const active = !!(form && String(form.keyword || '').trim());
    this.setData({
      queryActive: active,
      querySummaryText: buildQuerySummary(form),
      showFilterPanel: false
    });
    this.loadList();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().finally(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    const form = this.data.queryForm || emptyQuery();
    return workorderService.listWorkOrders(this.data.tab, this.data.status, {
      keyword: form.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/packages/workorder/detail/index?id=' + encodeURIComponent(id) });
  },

  onActionTap(e) {
    const id = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    if (!id || !action || action === 'detail') return;
    if (action === 'accept') {
      wx.showModal({
        title: '确认接单',
        content: '接单后将成为该工单实际处理人，是否继续？',
        success: function (res) {
          if (!res.confirm) return;
          workorderService.acceptWorkOrder(id).then(function (result) {
            if (!result || !result.ok) {
              wx.showToast({ title: (result && result.message) || '接单失败', icon: 'none' });
              return;
            }
            wx.showToast({ title: '接单成功', icon: 'success' });
            this.loadList();
          }.bind(this));
        }.bind(this)
      });
      return;
    }
    wx.navigateTo({
      url: '/packages/workorder/action/index?id=' + encodeURIComponent(id) + '&type=' + encodeURIComponent(action)
    });
  }
});
