const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待审批', label: '待审批' },
  { id: '已派单（生成工单）', label: '已派单' },
  { id: '驳回报修(无需维修)', label: '已驳回' }
];

const FAULT_LEVEL_OPTIONS = [
  { value: '', label: '全部故障等级' },
  { value: '紧急', label: '紧急' },
  { value: '一般', label: '一般' },
  { value: '轻微', label: '轻微' }
];

const METHOD_OPTIONS = [
  { value: '', label: '全部报修方式' },
  { value: '手动填报', label: '手动填报' },
  { value: '扫码填报', label: '扫码填报' }
];

function emptyQuery() {
  return {
    faultLevel: '',
    faultLevelIndex: 0,
    reportMethod: '',
    methodIndex: 0,
    keyword: ''
  };
}

function hasActiveQuery(form) {
  if (!form) return false;
  return !!(form.faultLevel || form.reportMethod || String(form.keyword || '').trim());
}

Page({
  data: {
    scope: 'org',
    status: 'all',
    statusFilters: STATUS_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showFilterPanel: false,
    queryActive: false,
    queryForm: emptyQuery(),
    faultLevelOptions: FAULT_LEVEL_OPTIONS,
    methodOptions: METHOD_OPTIONS
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadList();
  },

  onLoad(options) {
    options = options || {};
    const patch = {};
    if (options.scope === 'mine' || options.scope === 'org') {
      patch.scope = options.scope;
    }
    if (options.status) {
      const ok = STATUS_FILTERS.some(function (f) { return f.id === options.status; });
      if (ok) patch.status = options.status;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  onScopeChange(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.scope) return;
    this.setData({ scope: scope });
    this.loadList();
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.status) return;
    this.setData({ status: status });
    this.loadList();
  },

  openFilterPanel() {
    this.setData({ showFilterPanel: true });
  },

  closeFilterPanel() {
    this.setData({ showFilterPanel: false });
  },

  preventClose() {},

  onFaultLevelPick(e) {
    const index = Number(e.detail.value) || 0;
    const opt = FAULT_LEVEL_OPTIONS[index] || FAULT_LEVEL_OPTIONS[0];
    this.setData({
      'queryForm.faultLevelIndex': index,
      'queryForm.faultLevel': opt.value
    });
  },

  onMethodPick(e) {
    const index = Number(e.detail.value) || 0;
    const opt = METHOD_OPTIONS[index] || METHOD_OPTIONS[0];
    this.setData({
      'queryForm.methodIndex': index,
      'queryForm.reportMethod': opt.value
    });
  },

  onQueryKeywordInput(e) {
    this.setData({ 'queryForm.keyword': e.detail.value });
  },

  resetQuery() {
    this.setData({
      queryForm: emptyQuery(),
      queryActive: false,
      showFilterPanel: false
    });
    this.loadList();
  },

  applyQuery() {
    const form = this.data.queryForm;
    this.setData({
      queryActive: hasActiveQuery(form),
      showFilterPanel: false
    });
    this.loadList();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().then(function () {
      this.setData({ refreshing: false });
    }.bind(this)).catch(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    const form = this.data.queryForm || emptyQuery();
    const status = this.data.status || 'all';
    return assetService.listRepairs(status, this.data.scope, {
      status: status,
      faultLevel: form.faultLevel,
      reportMethod: form.reportMethod,
      keyword: form.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  preventBubble() {},

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/packages/device/repair-detail/index?id=' + id });
  },

  handleActionResult(res) {
    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: res.message || '操作成功', icon: 'success' });
    this.loadList();
  },

  onApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/packages/device/repair-approve/index?id=' + encodeURIComponent(id || '')
    });
  },

  onWithdraw(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '撤回报修',
      content: '确定撤回该报修申请吗？撤回后将删除该报修记录。',
      success: function (modal) {
        if (!modal.confirm) return;
        assetService.withdrawRepair(id).then(that.handleActionResult.bind(that));
      }
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除报修',
      content: '确定删除该驳回报修记录吗？',
      success: function (modal) {
        if (!modal.confirm) return;
        assetService.deleteRepair(id).then(that.handleActionResult.bind(that));
      }
    });
  }
});
