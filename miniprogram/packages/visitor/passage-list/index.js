const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');

const RESULT_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '成功', label: '成功' },
  { id: '失败', label: '失败' }
];

function emptyQuery() {
  return { keyword: '', dir: '', method: '' };
}

function hasActiveQuery(form) {
  if (!form) return false;
  return !!(String(form.keyword || '').trim() || form.dir || form.method);
}

Page({
  data: {
    result: 'all',
    resultFilters: RESULT_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: emptyQuery(),
    dirOptions: ['', '进', '出'],
    methodOptions: ['', '人脸', '身份证', '二维码']
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
  },

  onResultChange(e) {
    const result = e.currentTarget.dataset.result;
    if (result === this.data.result) return;
    this.setData({ result: result });
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

  onDirChange(e) {
    const idx = Number(e.detail.value);
    const opts = this.data.dirOptions;
    this.setData({ 'queryForm.dir': opts[idx] || '' });
  },

  onMethodChange(e) {
    const idx = Number(e.detail.value);
    const opts = this.data.methodOptions;
    this.setData({ 'queryForm.method': opts[idx] || '' });
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
    return visitorService.listPassage({
      result: this.data.result === 'all' ? '' : this.data.result,
      dir: form.dir || '',
      method: form.method || '',
      keyword: form.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onOpenOrder(e) {
    const order = e.currentTarget.dataset.order;
    if (!order || order === '—') return;
    wx.navigateTo({
      url: '/packages/visitor/visitor-detail/index?id=' + encodeURIComponent(order)
    });
  }
});
