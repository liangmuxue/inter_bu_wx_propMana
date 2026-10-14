const assetService = require('../../../services/asset');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    repair: null,
    notFound: false,
    loading: true,
    // 从工单点报修单号进入时不展示「工单编号」跳转，避免来回套娃
    showWorkOrderLink: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.repairId = options.id || options.code || '';
    const from = String(options.from || '').trim();
    this.setData({
      showWorkOrderLink: from !== 'workorder'
    });
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    assetService.getRepair(this.repairId).then(function (repair) {
      if (!repair) {
        this.setData({ notFound: true, loading: false, repair: null });
        return;
      }
      this.setData({ repair: repair, loading: false, notFound: false });
      wx.setNavigationBarTitle({ title: repair.code || '报修详情' });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  previewImage(e) {
    const repair = this.data.repair;
    if (!repair) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    // 系统预览：点按图片退出，不再叠加「关闭」与页面返回
    patrolIssueMedia.previewIssueImages(repair.faultImages || [], index);
  },

  playVideo() {
    const repair = this.data.repair;
    if (!repair || !repair.hasVideo) return;
    const url = repair.videoUrl || '';
    const title = repair.videoName || '故障视频';
    if (!url) {
      wx.showToast({ title: '暂无视频可播放', icon: 'none' });
      return;
    }
    // 独立预览页：仅保留导航栏返回，退出视频
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(url) + '&title=' + encodeURIComponent(title)
    });
  },

  openWorkOrder(e) {
    const code = (e.currentTarget.dataset.code || '').trim();
    if (!code) {
      wx.showToast({ title: '工单编号无效', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/device/repair-workorder-detail/index?id=' +
        encodeURIComponent(code) + '&from=repair'
    });
  }
});
