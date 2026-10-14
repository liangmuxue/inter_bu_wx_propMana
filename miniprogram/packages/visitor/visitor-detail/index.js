const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    id: '',
    fromScan: false,
    loading: true,
    visit: null,
    submitting: false
  },

  onLoad(options) {
    options = options || {};
    this.setData({
      id: String(options.id || '').trim(),
      fromScan: options.from === 'scan'
    });
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadDetail();
  },

  loadDetail() {
    const id = this.data.id;
    if (!id) {
      this.setData({ loading: false, visit: null });
      return;
    }
    this.setData({ loading: true });
    visitorService.getVisit(id).then(function (visit) {
      this.setData({ visit: visit || null, loading: false });
      if (!visit) {
        wx.showToast({ title: '单据不存在或无权限', icon: 'none' });
      }
    }.bind(this)).catch(function () {
      this.setData({ visit: null, loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onCheckIn() {
    this.confirmAction('checkIn', '确认签到', '确认对该访客执行签到？');
  },

  onCheckOut() {
    this.confirmAction('checkOut', '确认签离', '确认对该访客执行签离？签离后通行权限将收回。');
  },

  onVoidPass() {
    if (this.data.submitting) return;
    const visit = this.data.visit;
    if (!visit || !visit.canVoid) return;
    const page = this;
    wx.showModal({
      title: '作废通行授权？',
      content: '作废后该访客通行授权将失效，确认作废？',
      confirmText: '确认作废',
      confirmColor: '#E53E3E',
      success: function (res) {
        if (!res.confirm) return;
        page.setData({ submitting: true });
        visitorService.voidVisitorPass({ visitId: visit.id }).then(function (result) {
          page.setData({ submitting: false });
          if (!result || !result.ok) {
            wx.showToast({ title: (result && result.message) || '作废失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: result.message || '已作废通行授权', icon: 'success' });
          page.setData({ visit: result.visit || visit });
        }).catch(function () {
          page.setData({ submitting: false });
          wx.showToast({ title: '作废失败', icon: 'none' });
        });
      }
    });
  },

  confirmAction(action, title, content) {
    if (this.data.submitting) return;
    const visit = this.data.visit;
    if (!visit) return;
    const page = this;
    wx.showModal({
      title: title,
      content: content,
      confirmText: '确认',
      cancelText: '取消',
      success: function (res) {
        if (!res.confirm) return;
        page.submitPresence(action);
      }
    });
  },

  submitPresence(action) {
    const visit = this.data.visit;
    if (!visit) return;
    this.setData({ submitting: true });
    visitorService.confirmPresence({
      visitId: visit.id,
      action: action
    }).then(function (result) {
      this.setData({ submitting: false });
      if (!result || !result.ok) {
        wx.showToast({ title: (result && result.message) || '操作失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: result.message || '操作成功', icon: 'success' });
      this.setData({ visit: result.visit || visit });
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }.bind(this));
  },

  goScanAgain() {
    wx.redirectTo({ url: '/packages/visitor/verify-result/index' });
  }
});
