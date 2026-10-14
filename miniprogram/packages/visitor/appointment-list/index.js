const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待审批', label: '待审批' },
  { id: '审批通过', label: '已通过' },
  { id: '已驳回', label: '已驳回' },
  { id: '已超时', label: '已超时' }
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
    status: 'all',
    statusFilters: STATUS_FILTERS,
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
    this.setData({ tab: tab, status: 'all' });
    this.loadList();
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.id;
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
    return visitorService.listAppointments({
      tab: this.data.tab,
      status: this.data.status,
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
      url: '/packages/visitor/flow-detail/index?id=' + encodeURIComponent(id)
    });
  }
});
