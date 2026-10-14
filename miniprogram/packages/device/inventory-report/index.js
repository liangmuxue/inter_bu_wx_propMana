const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    auditMode: false,
    task: null,
    stats: null,
    reportItems: [],
    pendingAudit: 0,
    showAuditSheet: false,
    auditing: null,
    auditOptions: [],
    auditOptionIndex: 0,
    auditHint: '',
    auditTitle: '',
    auditRemark: '',
    showStatusPriority: false,
    statusPriorityLevels: [],
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.id || '';
    this.auditMode = options.mode === 'audit';
    this.setData({ auditMode: this.auditMode });
    wx.setNavigationBarTitle({
      title: this.auditMode ? '审核报告' : '盘点报告'
    });
    this.loadReport();
  },

  loadReport() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中' });
    return assetService.getInventoryReport(this.taskId, {
      auditMode: this.auditMode
    }).then(function (res) {
      wx.hideLoading();
      if (!res || !res.ok) {
        this.setData({ loading: false, task: null });
        wx.showToast({ title: (res && res.message) || '无法打开报告', icon: 'none' });
        setTimeout(function () {
          wx.navigateBack({ fail: function () {} });
        }, 1200);
        return;
      }
      this.applyReport(res);
    }.bind(this)).catch(function () {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  applyReport(res) {
    this.setData({
      loading: false,
      task: res.task,
      stats: res.stats,
      reportItems: res.reportItems || [],
      pendingAudit: res.pendingAudit || 0,
      auditMode: !!res.auditMode
    });
  },

  previewInvImages(e) {
    const assetId = e.currentTarget.dataset.assetId;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const item = (this.data.reportItems || []).find(function (it) {
      return it.assetId === assetId;
    });
    const urls = (item && item.invImageUrls) || [];
    if (!urls.length) return;
    wx.previewImage({ current: urls[index] || urls[0], urls: urls });
  },

  openAuditItem(e) {
    if (!this.data.auditMode) return;
    const assetId = e.currentTarget.dataset.assetId;
    const item = (this.data.reportItems || []).find(function (it) {
      return it.assetId === assetId;
    });
    if (!item || !item.canAudit) {
      wx.showToast({ title: '该记录已审核或不允许审核', icon: 'none' });
      return;
    }
    const liveStatus = item.liveStatus || '—';
    const optionsMap = {
      '盘盈': {
        title: '审核盘盈资产',
        hint: '核准入账后系统将自动新增录入资产台账；不予核准则不处理',
        options: ['核准入账', '不予核准']
      },
      '盘亏': {
        title: '审核盘亏资产',
        hint: liveStatus === '已丢失'
          ? '当前台账已是已丢失，核准销账仅保留审核记录'
          : (liveStatus === '已报废'
            ? '当前台账已是已报废，核准销账仅保留审核记录'
            : '核准销账后系统将变更为已丢失；若台账已是更高优先级状态则保持不变'),
        options: ['核准销账', '不予核准']
      },
      '异常': {
        title: '审核异常资产',
        hint: (liveStatus === '已报废' || liveStatus === '已丢失')
          ? ('当前台账已是终态（' + liveStatus + '），核准调整仅保留审核记录')
          : '核准调整后需手动在资产台账中修改异常数据；不予核准则不处理',
        options: ['核准调整', '不予核准']
      }
    };
    const cfg = optionsMap[item.invStatus] || optionsMap['异常'];
    const levels = ['已报废', '已丢失', '维修中', '使用中'].map(function (name, idx) {
      return {
        name: name,
        order: idx + 1,
        current: liveStatus === name
      };
    });
    this.setData({
      showAuditSheet: true,
      auditing: item,
      auditTitle: cfg.title,
      auditHint: cfg.hint,
      auditOptions: cfg.options,
      auditOptionIndex: 0,
      auditRemark: '',
      showStatusPriority: item.invStatus === '盘亏',
      statusPriorityLevels: levels
    });
  },

  closeAuditSheet() {
    this.setData({
      showAuditSheet: false,
      auditing: null,
      submitting: false,
      showStatusPriority: false,
      statusPriorityLevels: []
    });
  },

  onAuditResultTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ auditOptionIndex: index });
  },

  onAuditRemarkInput(e) {
    this.setData({ auditRemark: e.detail.value || '' });
  },

  submitAudit() {
    if (this.data.submitting || !this.data.auditing) return;
    const item = this.data.auditing;
    const result = this.data.auditOptions[this.data.auditOptionIndex];
    if (!result) {
      wx.showToast({ title: '请选择审核结果', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    assetService.auditInventoryItem({
      taskId: this.taskId,
      assetId: item.assetId,
      assetCode: item.assetCode,
      auditResult: result,
      auditRemark: this.data.auditRemark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '审核失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '已保存', icon: 'success' });
      this.setData({ showAuditSheet: false, auditing: null });
      if (res.report && res.report.ok) {
        this.auditMode = !!res.report.auditMode;
        this.applyReport(res.report);
        wx.setNavigationBarTitle({
          title: this.auditMode ? '审核报告' : '盘点报告'
        });
      } else if (res.fullyAudited) {
        this.auditMode = false;
        wx.setNavigationBarTitle({ title: '盘点报告' });
        this.loadReport();
      } else {
        this.loadReport();
      }
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '审核失败', icon: 'none' });
    }.bind(this));
  },

  preventClose() {}
});
