const spareService = require('../../../services/spare');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

const USAGE_APPROVED = '派发审批通过';
const USAGE_REJECTED = '派发审批驳回';

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

Page({
  data: {
    usage: null,
    notFound: false,
    loading: true,
    auditResult: USAGE_APPROVED,
    auditRemark: '',
    submitting: false,
    approvedLabel: USAGE_APPROVED,
    rejectedLabel: USAGE_REJECTED
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (!pagePerm.canPageAction(currentRole(), 'spare-usage', 'audit')) {
      pageAccess.denyNavigate('当前账号无「派发审批」权限');
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 300);
      return;
    }
    this.usageId = options.id || options.code || '';
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    spareService.getUsage(this.usageId).then(function (usage) {
      if (!usage || usage.status !== '待审批' || !usage.canApprove) {
        this.setData({ notFound: true, loading: false, usage: null });
        return;
      }
      this.setData({
        usage: usage,
        notFound: false,
        loading: false,
        auditResult: USAGE_APPROVED,
        auditRemark: ''
      });
      wx.setNavigationBarTitle({ title: '派发审批 — ' + (usage.code || '') });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onResultChange(e) {
    this.setData({ auditResult: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ auditRemark: e.detail.value });
  },

  onSubmit() {
    if (this.data.submitting) return;
    const result = this.data.auditResult;
    if (result !== USAGE_APPROVED && result !== USAGE_REJECTED) {
      wx.showToast({ title: '请选择审批结果', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    spareService.auditUsage(this.usageId, {
      auditResult: result,
      auditRemark: this.data.auditRemark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '审批失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '审批完成', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '审批失败', icon: 'none' });
    }.bind(this));
  }
});
