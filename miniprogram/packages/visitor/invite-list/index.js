const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '待完善', label: '待完善' },
  { id: '待审批', label: '待审批' },
  { id: '审批通过', label: '已通过' },
  { id: '已超时', label: '已超时' },
  { id: '已驳回', label: '已驳回' }
];

function canAddInvite() {
  const user = userDisplay.normalizeUser(session.getUser());
  const role = (user && user.role) || '';
  return pagePerm.canPageAction(role, 'vis2-invite-staff', 'add');
}

Page({
  data: {
    tab: 'org',
    status: 'all',
    statusFilters: STATUS_FILTERS,
    list: [],
    loading: true,
    refreshing: false,
    showCreateSheet: false,
    keyword: '',
    canCreate: false
  },

  _keywordTimer: null,

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.setData({ canCreate: canAddInvite() });
    this.loadList();
  },

  onUnload() {
    if (this._keywordTimer) {
      clearTimeout(this._keywordTimer);
      this._keywordTimer = null;
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.tab) return;
    this.setData({ tab: tab });
    this.loadList();
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.id;
    if (status === this.data.status) return;
    this.setData({ status: status });
    this.loadList();
  },

  onKeywordInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword: keyword });
    if (this._keywordTimer) clearTimeout(this._keywordTimer);
    const page = this;
    this._keywordTimer = setTimeout(function () {
      page.loadList();
    }, 280);
  },

  onKeywordConfirm() {
    if (this._keywordTimer) {
      clearTimeout(this._keywordTimer);
      this._keywordTimer = null;
    }
    this.loadList();
  },

  clearKeyword() {
    if (this._keywordTimer) {
      clearTimeout(this._keywordTimer);
      this._keywordTimer = null;
    }
    this.setData({ keyword: '' });
    this.loadList();
  },

  openCreateSheet() {
    if (!this.data.canCreate) {
      wx.showToast({ title: '无邀约权限', icon: 'none' });
      return;
    }
    this.setData({ showCreateSheet: true });
  },

  closeCreateSheet() {
    this.setData({ showCreateSheet: false });
  },

  goCreate(e) {
    const raw = String((e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'normal');
    const mode = (raw === '快速' || raw === 'quick') ? 'quick' : 'normal';
    this.setData({ showCreateSheet: false });
    wx.navigateTo({
      url: '/packages/visitor/invite-create/index?mode=' + mode
    });
  },

  preventClose() {},

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().then(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    return visitorService.listInvites({
      tab: this.data.tab,
      status: this.data.status,
      keyword: this.data.keyword
    }).then(function (list) {
      this.setData({ list: list || [], loading: false });
    }.bind(this)).catch(function () {
      this.setData({ list: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const item = (this.data.list || []).find(function (row) { return row.id === id; });
    if (item && item.status === '审批通过') {
      wx.navigateTo({
        url: '/packages/visitor/visitor-detail/index?id=' + encodeURIComponent(id)
      });
      return;
    }
    wx.navigateTo({
      url: '/packages/visitor/flow-detail/index?id=' + encodeURIComponent(id)
    });
  }
});
