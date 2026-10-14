const assetService = require('../../../services/asset');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    order: null,
    notFound: false,
    loading: true,
    // 从报修详情点工单编号进入时不展示「报修单号」跳转，避免来回套娃
    showRepairLink: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.orderId = options.id || options.code || '';
    const from = String(options.from || '').trim();
    this.setData({
      showRepairLink: from !== 'repair'
    });
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    assetService.getWorkOrder(this.orderId).then(function (order) {
      if (!order) {
        this.setData({ notFound: true, loading: false, order: null });
        return;
      }
      this.setData({ order: order, loading: false, notFound: false });
      wx.setNavigationBarTitle({
        title: '工单详情 — ' + (order.code || '')
      });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  previewTimelineImage(e) {
    const order = this.data.order;
    if (!order || !order.timeline) return;
    const nodeIndex = Number(e.currentTarget.dataset.nodeIndex) || 0;
    const imgIndex = Number(e.currentTarget.dataset.imgIndex) || 0;
    const node = order.timeline[nodeIndex];
    if (!node || !node.displayImages || !node.displayImages.length) return;
    patrolIssueMedia.previewIssueImages(node.displayImages, imgIndex);
  },

  playTimelineVideo(e) {
    const order = this.data.order;
    if (!order || !order.timeline) return;
    const nodeIndex = Number(e.currentTarget.dataset.nodeIndex) || 0;
    const vidIndex = Number(e.currentTarget.dataset.vidIndex) || 0;
    const node = order.timeline[nodeIndex];
    const vid = node && node.displayVideos ? node.displayVideos[vidIndex] : null;
    if (!vid || !vid.url) {
      wx.showToast({ title: '暂无视频可播放', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(vid.url) +
        '&title=' + encodeURIComponent(vid.name || '维修附件')
    });
  },

  openRepairDetail(e) {
    const id = (e.currentTarget.dataset.id || '').trim();
    const code = (e.currentTarget.dataset.code || '').trim();
    const target = id || code;
    if (!target) {
      wx.showToast({ title: '报修单号无效', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/device/repair-detail/index?id=' + encodeURIComponent(target) + '&from=workorder'
    });
  }
});
