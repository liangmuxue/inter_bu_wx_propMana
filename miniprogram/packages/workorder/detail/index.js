const workorderService = require('../../../services/workorder');
const pageAccess = require('../../../utils/page-access');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const workorderDetailView = require('../../../utils/workorder-detail-view');

function applyDetailView(order) {
  return workorderDetailView.buildDetailView(order);
}

Page({
  data: {
    order: null,
    notFound: false,
    loading: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.orderId = options.id || '';
    this.loadDetail();
  },

  onShow() {
    if (this.orderId) this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    workorderService.getWorkOrder(this.orderId).then(function (order) {
      if (!order) {
        this.setData({ notFound: true, loading: false, order: null });
        return;
      }
      this.setData({
        order: applyDetailView(order),
        loading: false,
        notFound: false
      });
      wx.setNavigationBarTitle({ title: '工单详情' });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action;
    const id = this.orderId;
    if (!action || !id) return;
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
            this.loadDetail();
          }.bind(this));
        }.bind(this)
      });
      return;
    }
    wx.navigateTo({
      url: '/packages/workorder/action/index?id=' + encodeURIComponent(id) + '&type=' + encodeURIComponent(action)
    });
  },

  previewReportImage(e) {
    const order = this.data.order;
    if (!order || !order.reportImages || !order.reportImages.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    patrolIssueMedia.previewIssueImages(order.reportImages, index);
  },

  playReportVideo(e) {
    const order = this.data.order;
    if (!order || !order.reportVideos || !order.reportVideos.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const vid = order.reportVideos[index];
    if (!vid || !vid.url) {
      wx.showToast({ title: '暂无视频可播放', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(vid.url) +
        '&title=' + encodeURIComponent(vid.name || '上报视频')
    });
  },

  previewFeedbackImage(e) {
    const order = this.data.order;
    if (!order || !order.feedbackImages || !order.feedbackImages.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    patrolIssueMedia.previewIssueImages(order.feedbackImages, index);
  },

  playFeedbackVideo(e) {
    const order = this.data.order;
    if (!order || !order.feedbackVideos || !order.feedbackVideos.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const vid = order.feedbackVideos[index];
    if (!vid || !vid.url) {
      wx.showToast({ title: '暂无视频可播放', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(vid.url) +
        '&title=' + encodeURIComponent(vid.name || '反馈视频')
    });
  },

  openFeedbackAttachment(e) {
    const order = this.data.order;
    if (!order || !order.feedbackFiles || !order.feedbackFiles.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const file = order.feedbackFiles[index];
    if (!file) return;
    wx.showModal({
      title: file.name || '附件',
      content: file.previewText || file.url || '暂无可预览内容',
      showCancel: false
    });
  },

  openReportAttachment(e) {
    const order = this.data.order;
    if (!order || !order.reportFiles || !order.reportFiles.length) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const file = order.reportFiles[index];
    if (!file) return;
    wx.showModal({
      title: file.name || '附件',
      content: file.previewText || '演示附件，原型环境无可下载文件。',
      showCancel: false
    });
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
        '&title=' + encodeURIComponent(vid.name || '工单附件')
    });
  },

  openTimelineAttachment(e) {
    const order = this.data.order;
    if (!order || !order.timeline) return;
    const nodeIndex = Number(e.currentTarget.dataset.nodeIndex) || 0;
    const fileIndex = Number(e.currentTarget.dataset.fileIndex) || 0;
    const node = order.timeline[nodeIndex];
    const file = node && node.fileAttachments ? node.fileAttachments[fileIndex] : null;
    if (!file) return;
    wx.showModal({
      title: file.name || '附件',
      content: file.previewText || '演示附件，原型环境无可下载文件。',
      showCancel: false
    });
  }
});
