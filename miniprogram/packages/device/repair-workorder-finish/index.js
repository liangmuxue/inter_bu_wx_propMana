const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const MAX_FINISH_IMAGES = 4;
const ALLOWED_STATUS = {
  '维修处理中': true
};

const CONCLUSION_OPTIONS = [
  { value: '维修完成（已完结）', label: '维修完成（已完结）' },
  { value: '维修失败（无法处理）', label: '维修失败（无法处理）' }
];

Page({
  data: {
    order: null,
    notFound: false,
    loading: true,
    repairConclusion: '',
    conclusionOptions: CONCLUSION_OPTIONS,
    conclusionIndex: -1,
    finishContent: '',
    finishImages: [],
    maxImages: MAX_FINISH_IMAGES,
    videoAttachment: null,
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.orderId = options.id || options.code || '';
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    assetService.getWorkOrder(this.orderId).then(function (order) {
      if (!order || !ALLOWED_STATUS[order.status] || !order.canFinish) {
        this.setData({ notFound: true, loading: false, order: null });
        return;
      }
      this.setData({
        order: order,
        loading: false,
        notFound: false,
        repairConclusion: '',
        conclusionIndex: -1,
        finishContent: '',
        finishImages: [],
        videoAttachment: null
      });
      wx.setNavigationBarTitle({
        title: '维修完工 — ' + (order.code || '')
      });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onContentInput(e) {
    this.setData({ finishContent: e.detail.value });
  },

  onConclusionChange(e) {
    const idx = Number(e.detail.value);
    const opt = CONCLUSION_OPTIONS[idx];
    this.setData({
      conclusionIndex: idx,
      repairConclusion: opt ? opt.value : ''
    });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.finishImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxImages + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const images = this.data.finishImages.slice();
        (res.tempFiles || []).forEach(function (file) {
          images.push({
            path: file.tempFilePath,
            name: '维修图' + (images.length + 1)
          });
        });
        this.setData({ finishImages: images });
      }.bind(this)
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.finishImages.slice();
    images.splice(index, 1);
    this.setData({ finishImages: images });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.finishImages.map(function (img) { return img.path; });
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
            name: '维修视频.mp4',
            durationSec: Math.ceil((file.duration || 0) / 1000)
          }
        });
      }.bind(this)
    });
  },

  removeVideo() {
    this.setData({ videoAttachment: null });
  },

  onCancel() {
    wx.navigateBack({ fail: function () {} });
  },

  submitFinish() {
    if (this.data.submitting) return;
    const conclusion = String(this.data.repairConclusion || '').trim();
    if (!conclusion) {
      wx.showToast({ title: '请选择维修结论', icon: 'none' });
      return;
    }
    const content = String(this.data.finishContent || '').trim();
    if (!content) {
      wx.showToast({ title: '请填写维修内容', icon: 'none' });
      return;
    }
    const finishImages = (this.data.finishImages || []).map(function (img, idx) {
      return {
        name: img.name || ('维修图' + (idx + 1)),
        path: img.path,
        url: img.path
      };
    });
    const video = this.data.videoAttachment;
    const finishAttachments = video
      ? [{ type: 'video', name: video.name || '维修视频.mp4', path: video.path, url: video.path }]
      : [];

    this.setData({ submitting: true });
    assetService.finishWorkOrder(this.orderId, {
      repairConclusion: conclusion,
      finishContent: content,
      finishImages: finishImages,
      finishAttachments: finishAttachments
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '工单已完工', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败', icon: 'none' });
    }.bind(this));
  }
});
