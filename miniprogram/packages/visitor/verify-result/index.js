const visitorService = require('../../../services/visitor');
const visitorScan = require('../../../utils/visitor-scan');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    scanning: false,
    errorMsg: ''
  },

  onLoad(options) {
    options = options || {};
    const code = visitorService.normalizePassCode(options.code || '');
    const visitId = String(options.id || options.visitId || '').trim();
    if (code || visitId) {
      this.resolveAndOpen({ code: code, visitId: visitId });
    }
  },

  onShow() {
    pageAccess.ensureCurrentPageAccess();
  },

  resolveAndOpen(payload) {
    const page = this;
    this.setData({ scanning: true, errorMsg: '' });
    visitorService.resolveScan(payload || {}).then(function (res) {
      page.setData({ scanning: false });
      const result = res || {};
      if (!result.ok || !result.visit || !result.visit.id) {
        page.setData({ errorMsg: result.message || '未识别到有效通行凭证' });
        wx.showToast({ title: result.message || '识别失败', icon: 'none' });
        return;
      }
      wx.redirectTo({
        url: '/packages/visitor/visitor-detail/index?id=' +
          encodeURIComponent(result.visit.id) + '&from=scan'
      });
    }).catch(function () {
      page.setData({ scanning: false, errorMsg: '识别失败，请重试' });
      wx.showToast({ title: '识别失败', icon: 'none' });
    });
  },

  onScan() {
    if (this.data.scanning) return;
    const page = this;
    this.setData({ errorMsg: '' });
    visitorScan.scanVisitorCode({
      title: '模拟扫码核验'
    }).then(function (code) {
      page.resolveAndOpen({ code: code });
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      page.setData({ scanning: false, errorMsg: '扫码失败，请重试' });
      wx.showToast({ title: '扫码失败', icon: 'none' });
    });
  }
});
