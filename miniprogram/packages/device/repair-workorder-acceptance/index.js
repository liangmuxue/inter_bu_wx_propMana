const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');

const MAX_ACCEPT_IMAGES = 4;

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

Page({
  data: {
    order: null,
    notFound: false,
    loading: true,
    acceptOpinion: '',
    acceptImages: [],
    maxImages: MAX_ACCEPT_IMAGES,
    videoAttachment: null,
    submitting: false
  },

  onLoad(options) {
    pageAccess.denyNavigate('工单流程已取消验收环节');
    setTimeout(function () {
      wx.navigateBack({ fail: function () {} });
    }, 300);
  },

  loadDetail() {
    this.setData({ loading: true });
    assetService.getWorkOrder(this.orderId).then(function (order) {
      if (!order || order.status !== '待验收' || !order.canAcceptance) {
        this.setData({ notFound: true, loading: false, order: null });
        return;
      }
      this.setData({
        order: order,
        loading: false,
        notFound: false,
        acceptOpinion: '',
        acceptImages: [],
        videoAttachment: null
      });
      wx.setNavigationBarTitle({
        title: '工单验收 — ' + (order.code || '')
      });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onOpinionInput(e) {
    this.setData({ acceptOpinion: e.detail.value });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.acceptImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxImages + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const images = this.data.acceptImages.slice();
        (res.tempFiles || []).forEach(function (file) {
          images.push({
            path: file.tempFilePath,
            name: '验收图' + (images.length + 1)
          });
        });
        this.setData({ acceptImages: images });
      }.bind(this)
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.acceptImages.slice();
    images.splice(index, 1);
    this.setData({ acceptImages: images });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.acceptImages.map(function (img) { return img.path; });
    wx.previewImage({ current: urls[index], urls: urls });
  },

  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({
          videoAttachment: {
            path: file.tempFilePath,
            name: '验收视频.mp4',
            durationSec: Math.ceil((file.duration || 0) / 1000)
          }
        });
      }.bind(this)
    });
  },

  removeVideo() {
    this.setData({ videoAttachment: null });
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

  onCancel() {
    wx.navigateBack({ fail: function () {} });
  },

  submitPass() {
    this.submitAcceptance(true);
  },

  submitReject() {
    this.submitAcceptance(false);
  },

  submitAcceptance(pass) {
    if (this.data.submitting) return;
    const opinion = String(this.data.acceptOpinion || '').trim();
    if (!opinion) {
      wx.showToast({ title: '请填写验收意见', icon: 'none' });
      return;
    }
    const acceptImages = (this.data.acceptImages || []).map(function (img, idx) {
      return {
        name: img.name || ('验收图' + (idx + 1)),
        path: img.path,
        url: img.path
      };
    });
    const video = this.data.videoAttachment;
    const videoList = video
      ? [{ type: 'video', name: video.name || '验收视频.mp4', path: video.path, url: video.path }]
      : [];
    const acceptAttachments = acceptImages.map(function (img) {
      return { type: 'image', name: img.name, url: img.url, path: img.path };
    }).concat(videoList);

    this.setData({ submitting: true });
    assetService.acceptWorkOrderResult(this.orderId, {
      pass: !!pass,
      acceptOpinion: opinion,
      acceptImages: acceptImages,
      acceptAttachments: acceptAttachments
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '验收失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || (pass ? '验收通过，工单已完结' : '验收驳回，需重新维修'), icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '验收失败', icon: 'none' });
    }.bind(this));
  }
});
