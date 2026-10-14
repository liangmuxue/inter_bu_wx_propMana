const patrolRemoteMonitor = require('../../../utils/patrol-remote-monitor');
const pageAccess = require('../../../utils/page-access');

Page({
  data: Object.assign({}, patrolRemoteMonitor.getInitialData(), {
    monitorTab: 'live'
  }),

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    options = options || {};
    const monitorMeta = options.monitorMeta ? decodeURIComponent(options.monitorMeta) : '';
    const title = options.title ? decodeURIComponent(options.title) : '实时视频';
    this.setData({
      monitorMeta: monitorMeta,
      streamType: options.streamType || 'main',
      videoFit: options.videoFit || 'cover',
      audioOn: options.audioOn !== '0'
    });
    wx.setNavigationBarTitle({ title: title });
    this.eventChannel = this.getOpenerEventChannel();
  },

  onUnload() {
    patrolRemoteMonitor.restorePortrait();
    this.emitState();
  },

  emitState() {
    if (!this.eventChannel) return;
    this.eventChannel.emit('monitorStateChange', {
      streamType: this.data.streamType,
      monitorMeta: this.data.monitorMeta,
      videoFit: this.data.videoFit,
      audioOn: this.data.audioOn,
      monitorTab: this.data.monitorTab
    });
  },

  onExit() {
    this.emitState();
    patrolRemoteMonitor.restorePortrait();
    wx.navigateBack();
  },

  onStreamSwitch(e) {
    patrolRemoteMonitor.onStreamSwitch(this, e);
  },

  onMonitorVc(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'replay') {
      this.setData({ monitorTab: 'replay' });
      wx.showToast({ title: '已切换即时回放', icon: 'none' });
      this.onExit();
      return;
    }
    patrolRemoteMonitor.onMonitorVc(this, e);
  }
});
