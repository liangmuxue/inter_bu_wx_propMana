const spareService = require('../../../services/spare');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    spare: null,
    notFound: false,
    loading: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.spareKey = options.id || options.code || '';
    this.loadDetail();
  },

  loadDetail() {
    if (!this.spareKey) {
      this.setData({ notFound: true, loading: false });
      return;
    }
    this.setData({ loading: true });
    spareService.getSpare(this.spareKey).then(function (spare) {
      if (!spare) {
        this.setData({ notFound: true, loading: false, spare: null });
        return;
      }
      this.setData({ spare: spare, notFound: false, loading: false });
      wx.setNavigationBarTitle({ title: '备品详情 — ' + (spare.code || '') });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  }
});
