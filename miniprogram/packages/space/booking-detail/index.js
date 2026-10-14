const spaceService = require('../../../services/space');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    detail: null
  },

  onLoad(options) {
    this.bookingId = options && options.id ? decodeURIComponent(options.id) : '';
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadDetail();
  },

  loadDetail() {
    if (!this.bookingId) {
      this.setData({ loading: false, detail: null });
      return;
    }
    this.setData({ loading: true });
    return spaceService.getBooking(this.bookingId).then(function (detail) {
      this.setData({ detail: detail, loading: false });
    }.bind(this)).catch(function () {
      this.setData({ detail: null, loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  }
});
