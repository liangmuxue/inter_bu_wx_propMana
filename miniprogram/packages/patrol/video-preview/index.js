const patrolAttachment = require('../../../utils/patrol-attachment');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    src: '',
    title: '视频附件',
    durationSec: 0,
    isDemo: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const title = options.title ? decodeURIComponent(options.title) : '视频附件';
    let src = options.src ? decodeURIComponent(options.src) : '';
    const isDemo = options.demo === '1';

    if (!src && isDemo) {
      src = patrolAttachment.DEMO_VIDEO_SRC;
    }

    wx.setNavigationBarTitle({ title: title });
    this.setData({
      src: src,
      title: title,
      durationSec: Number(options.duration) || 0,
      isDemo: isDemo
    });
  },

  onVideoError() {
    wx.showToast({ title: '视频加载失败', icon: 'none' });
  }
});
