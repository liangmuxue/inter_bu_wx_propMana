const spaceService = require('../../../services/space');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    detail: null
  },

  onLoad(options) {
    this.roomId = options && options.id ? decodeURIComponent(options.id) : '';
    this.queryDate = options && options.date ? decodeURIComponent(options.date) : '';
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadDetail();
  },

  loadDetail() {
    if (!this.roomId) {
      this.setData({ loading: false, detail: null });
      return;
    }
    this.setData({ loading: true });
    return spaceService.getRoomDetail({
      id: this.roomId,
      date: this.queryDate
    }).then(function (detail) {
      if (detail && detail.name) {
        wx.setNavigationBarTitle({ title: detail.name });
      }
      this.setData({ detail: detail, loading: false });
    }.bind(this)).catch(function () {
      this.setData({ detail: null, loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onOpenBooking(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/packages/space/booking-detail/index?id=' + encodeURIComponent(id)
    });
  }
});
