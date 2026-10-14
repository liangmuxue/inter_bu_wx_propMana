const assetService = require('../../../services/asset');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

Page({
  data: {
    repair: null,
    notFound: false,
    loading: true,
    step: 'choose',
    workers: [],
    workerGroups: [],
    selectedCount: 0,
    approveRemark: '',
    submitting: false,
    showRejectModal: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (!pagePerm.canPageAction(currentRole(), 'repair-request', 'audit')) {
      pageAccess.denyNavigate('当前账号无「审批」权限');
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 300);
      return;
    }
    this.repairId = options.id || options.code || '';
    this.initialStep = options.step || 'choose';
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    Promise.all([
      assetService.getRepair(this.repairId),
      Promise.resolve(null)
    ]).then(function (pair) {
      const repair = pair[0];
      if (!repair || repair.status !== '待审批') {
        this.setData({ notFound: true, loading: false, repair: null });
        return;
      }
      return assetService.listRepairWorkers({
        assetId: repair.assetId,
        assetCode: repair.assetCode
      }).then(function (workerRes) {
        const raw = (workerRes && workerRes.list) || workerRes || [];
        const workers = (Array.isArray(raw) ? raw : []).map(function (w) {
          return {
            account: w.account,
            name: w.name,
            org: w.org || '—',
            checked: false
          };
        });
        const groups = (workerRes && workerRes.groups) || [];
        const step = this.initialStep === 'pass' || this.initialStep === 'reject'
          ? this.initialStep
          : 'choose';
        this.setData({
          repair: repair,
          workers: workers,
          workerGroups: groups.map(function (g) {
            return {
              org: g.org,
              workers: (g.workers || []).map(function (w) {
                return {
                  account: w.account,
                  name: w.name,
                  org: w.org || '—',
                  checked: false
                };
              })
            };
          }),
          selectedCount: 0,
          loading: false,
          notFound: false,
          step: step === 'reject' ? 'choose' : step,
          showRejectModal: step === 'reject',
          approveRemark: ''
        });
        wx.setNavigationBarTitle({ title: '审批报修 — ' + (repair.code || '') });
      }.bind(this));
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  goPass() {
    this.setData({
      step: 'pass',
      approveRemark: '',
      showRejectModal: false
    });
  },

  goReject() {
    this.setData({
      showRejectModal: true,
      approveRemark: '',
      submitting: false
    });
  },

  preventClose() {},

  previewImage(e) {
    const repair = this.data.repair;
    if (!repair) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
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
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(url) + '&title=' + encodeURIComponent(title)
    });
  },

  closeRejectModal() {
    if (this.data.submitting) return;
    this.setData({
      showRejectModal: false,
      approveRemark: ''
    });
  },

  backChoose() {
    this.setData({
      step: 'choose',
      approveRemark: '',
      submitting: false,
      showRejectModal: false
    });
  },

  onRemarkInput(e) {
    this.setData({
      approveRemark: e.detail.value
    });
  },

  toggleWorker(e) {
    const account = e.currentTarget.dataset.account;
    const workers = (this.data.workers || []).map(function (w) {
      if (w.account !== account) return w;
      return Object.assign({}, w, { checked: !w.checked });
    });
    const checkedMap = {};
    workers.forEach(function (w) { checkedMap[w.account] = !!w.checked; });
    const workerGroups = (this.data.workerGroups || []).map(function (g) {
      return {
        org: g.org,
        workers: (g.workers || []).map(function (w) {
          return Object.assign({}, w, { checked: !!checkedMap[w.account] });
        })
      };
    });
    const selectedCount = workers.filter(function (w) { return w.checked; }).length;
    this.setData({ workers: workers, workerGroups: workerGroups, selectedCount: selectedCount });
  },

  submitPass() {
    if (this.data.submitting) return;
    const accounts = (this.data.workers || [])
      .filter(function (w) { return w.checked; })
      .map(function (w) { return w.account; });
    if (!accounts.length) {
      wx.showToast({ title: '请至少选择一名维修人员', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    assetService.approveRepairPass(this.repairId, {
      assigneeAccounts: accounts,
      approveRemark: this.data.approveRemark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '派单失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '已派单', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '派单失败', icon: 'none' });
    }.bind(this));
  },

  submitReject() {
    if (this.data.submitting) return;
    const remark = String(this.data.approveRemark || '').trim();
    if (!remark) {
      wx.showToast({ title: '请填写审批意见', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    assetService.approveRepairReject(this.repairId, {
      approveRemark: remark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '驳回失败', icon: 'none' });
        return;
      }
      this.setData({ showRejectModal: false });
      wx.showToast({ title: res.message || '已驳回', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '驳回失败', icon: 'none' });
    }.bind(this));
  }
});
