const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

function filterWorkers(workers, keyword) {
  const kw = String(keyword || '').trim().toLowerCase();
  if (!kw) return workers.slice();
  return workers.filter(function (w) {
    const blob = [w.account, w.name, w.org].join(' ').toLowerCase();
    return blob.indexOf(kw) >= 0;
  });
}

function buildDisplayGroups(workers) {
  const groups = {};
  const order = [];
  (workers || []).forEach(function (w) {
    const org = w.org || '未分配组织';
    if (!groups[org]) {
      groups[org] = [];
      order.push(org);
    }
    groups[org].push(w);
  });
  return order.map(function (org) {
    return { org: org, workers: groups[org] };
  });
}

Page({
  data: {
    order: null,
    notFound: false,
    loading: true,
    workers: [],
    displayGroups: [],
    selectedCount: 0,
    keyword: '',
    transferRemark: '',
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (!pagePerm.canPageAction(currentRole(), 'repair-workorder', 'transfer')) {
      pageAccess.denyNavigate('当前账号无「转派」权限');
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 300);
      return;
    }
    this.orderId = options.id || options.code || '';
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loading: true });
    assetService.getWorkOrder(this.orderId).then(function (order) {
      if (!order || order.status !== '已派单') {
        this.setData({ notFound: true, loading: false, order: null });
        return;
      }
      return assetService.listRepairWorkers({
        assetId: order.assetId,
        assetCode: order.assetCode
      }).then(function (workerRes) {
        const selected = {};
        (order.assignees || []).forEach(function (a) {
          if (a && a.account) selected[a.account] = true;
        });
        const raw = (workerRes && workerRes.list) || workerRes || [];
        const workers = (Array.isArray(raw) ? raw : []).map(function (w) {
          return {
            account: w.account,
            name: w.name,
            org: w.org || '—',
            checked: !!selected[w.account]
          };
        });
        // 已指派但不在权限列表中的人仍保留勾选展示
        (order.assignees || []).forEach(function (a) {
          if (!a || !a.account) return;
          if (workers.some(function (w) { return w.account === a.account; })) return;
          workers.push({
            account: a.account,
            name: a.name || a.account,
            org: a.org || '—',
            checked: true
          });
        });
        const selectedCount = workers.filter(function (w) { return w.checked; }).length;
        this.setData({
          order: order,
          workers: workers,
          displayGroups: buildDisplayGroups(workers),
          selectedCount: selectedCount,
          loading: false,
          notFound: false,
          keyword: '',
          transferRemark: ''
        });
        wx.setNavigationBarTitle({
          title: '转派工单 — ' + (order.code || '')
        });
      }.bind(this));
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  onKeywordInput(e) {
    const keyword = e.detail.value;
    const displayWorkers = filterWorkers(this.data.workers, keyword);
    this.setData({
      keyword: keyword,
      displayGroups: buildDisplayGroups(displayWorkers)
    });
  },

  toggleWorker(e) {
    const account = e.currentTarget.dataset.account;
    const workers = (this.data.workers || []).map(function (w) {
      if (w.account !== account) return w;
      return Object.assign({}, w, { checked: !w.checked });
    });
    const selectedCount = workers.filter(function (w) { return w.checked; }).length;
    const displayWorkers = filterWorkers(workers, this.data.keyword);
    this.setData({
      workers: workers,
      displayGroups: buildDisplayGroups(displayWorkers),
      selectedCount: selectedCount
    });
  },

  onRemarkInput(e) {
    this.setData({ transferRemark: e.detail.value });
  },

  onCancel() {
    wx.navigateBack({ fail: function () {} });
  },

  submitTransfer() {
    if (this.data.submitting) return;
    const accounts = (this.data.workers || [])
      .filter(function (w) { return w.checked; })
      .map(function (w) { return w.account; });
    if (!accounts.length) {
      wx.showToast({ title: '请至少选择一名维修人员', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    assetService.transferWorkOrder(this.orderId, {
      assigneeAccounts: accounts,
      transferRemark: this.data.transferRemark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '转派失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '工单已转派', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '转派失败', icon: 'none' });
    }.bind(this));
  }
});
