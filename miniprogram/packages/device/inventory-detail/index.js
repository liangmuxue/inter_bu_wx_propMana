const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const ITEM_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '未盘', label: '未盘' },
  { id: '相符', label: '相符' },
  { id: '异常', label: '异常' },
  { id: '盘亏', label: '盘亏' },
  { id: '盘盈', label: '盘盈' }
];

Page({
  data: {
    loading: true,
    task: null,
    allItems: [],
    displayItems: [],
    itemFilter: 'all',
    itemFilters: ITEM_FILTERS,
    keyword: ''
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.id || '';
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中' });
    return assetService.getInventoryDetail(this.taskId).then(function (res) {
      wx.hideLoading();
      if (!res || !res.ok) {
        this.setData({ loading: false, task: null });
        wx.showToast({ title: (res && res.message) || '无法查看明细', icon: 'none' });
        setTimeout(function () {
          wx.navigateBack({ fail: function () {} });
        }, 1200);
        return;
      }
      this.setData({
        loading: false,
        task: res.task,
        allItems: res.items || []
      });
      this.applyFilter();
    }.bind(this)).catch(function () {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onItemFilterChange(e) {
    this.setData({ itemFilter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  onSearch() {
    this.applyFilter();
  },

  onReset() {
    this.setData({ keyword: '', itemFilter: 'all' });
    this.applyFilter();
  },

  applyFilter() {
    const filter = this.data.itemFilter;
    const kw = String(this.data.keyword || '').trim().toLowerCase();
    let items = this.data.allItems || [];
    if (filter && filter !== 'all') {
      items = items.filter(function (it) { return it.invStatus === filter; });
    }
    if (kw) {
      items = items.filter(function (it) {
        const blob = [
          it.assetCode, it.assetName, it.categoryName, it.orgName, it.regionName,
          it.invStatus, it.invRemark, it.operatorName, it.snapshotStatus, it.purchaseMethod
        ].join(' ').toLowerCase();
        return blob.indexOf(kw) >= 0;
      });
    }
    this.setData({ displayItems: items });
  },

  previewInvImages(e) {
    const assetId = e.currentTarget.dataset.assetId;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const item = (this.data.displayItems || []).find(function (it) {
      return it.assetId === assetId;
    }) || (this.data.allItems || []).find(function (it) {
      return it.assetId === assetId;
    });
    const urls = (item && item.invImageUrls) || [];
    if (!urls.length) return;
    wx.previewImage({ current: urls[index] || urls[0], urls: urls });
  },

  openAsset(e) {
    const code = e.currentTarget.dataset.code;
    if (!code) return;
    wx.navigateTo({
      url: '/packages/device/asset-detail/index?code=' + encodeURIComponent(code) + '&from=inventory'
    });
  }
});
