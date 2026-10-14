const spareService = require('../../../services/spare');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    usage: null,
    notFound: false,
    loading: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.usageId = options.id || options.code || '';
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadDetail();
  },

  loadDetail() {
    if (!this.usageId) {
      this.setData({ notFound: true, loading: false });
      return;
    }
    this.setData({ loading: true });
    spareService.getUsage(this.usageId).then(function (usage) {
      if (!usage) {
        this.setData({ notFound: true, loading: false, usage: null });
        return;
      }
      this.setData({ usage: usage, notFound: false, loading: false });
      wx.setNavigationBarTitle({ title: '领用详情 — ' + (usage.code || '') });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onApprove() {
    const usage = this.data.usage;
    if (!usage || !usage.canApprove) return;
    wx.navigateTo({
      url: '/packages/device/spare-approve/index?id=' + encodeURIComponent(usage.id || '')
    });
  },

  openSpareMaterial(e) {
    const id = (e.currentTarget.dataset.id || '').trim();
    const code = (e.currentTarget.dataset.code || '').trim();
    const key = id || code;
    if (!key) {
      wx.showToast({ title: '物料信息不完整', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/device/spare-material/index?id=' + encodeURIComponent(key)
    });
  }
});
