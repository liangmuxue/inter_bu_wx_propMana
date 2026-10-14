const spaceService = require('../../../services/space');
const pageAccess = require('../../../utils/page-access');

const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '未开始', label: '未开始' },
  { id: '进行中', label: '进行中' },
  { id: '已结束', label: '已结束' },
  { id: '已取消', label: '已取消' }
];

const SEARCH_DEBOUNCE_MS = 300;

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function hasDateFilter(from, to) {
  return !!(String(from || '').trim() || String(to || '').trim());
}

Page({
  data: {
    statusFilters: STATUS_FILTERS,
    status: 'all',
    keyword: '',
    dateFrom: '',
    dateTo: '',
    draftDateFrom: '',
    draftDateTo: '',
    pickerDateFrom: todayStr(),
    pickerDateTo: todayStr(),
    showDateFilter: false,
    dateFilterActive: false,
    list: [],
    loading: true,
    refreshing: false
  },

  onLoad() {
    this._searchTimer = null;
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
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
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(function () {
      this.loadList();
    }.bind(this), SEARCH_DEBOUNCE_MS);
  },

  onToggleDateFilter() {
    const open = !this.data.showDateFilter;
    if (open) {
      const draftFrom = this.data.dateFrom || '';
      const draftTo = this.data.dateTo || '';
      const today = todayStr();
      this.setData({
        showDateFilter: true,
        draftDateFrom: draftFrom,
        draftDateTo: draftTo,
        pickerDateFrom: draftFrom || today,
        pickerDateTo: draftTo || today
      });
      return;
    }
    this.setData({ showDateFilter: false });
  },

  onDraftDateFromChange(e) {
    const value = e.detail.value || '';
    this.setData({
      draftDateFrom: value,
      pickerDateFrom: value || todayStr()
    });
  },

  onDraftDateToChange(e) {
    const value = e.detail.value || '';
    this.setData({
      draftDateTo: value,
      pickerDateTo: value || todayStr()
    });
  },

  onResetDateFilter() {
    const today = todayStr();
    this.setData({
      draftDateFrom: '',
      draftDateTo: '',
      dateFrom: '',
      dateTo: '',
      pickerDateFrom: today,
      pickerDateTo: today,
      dateFilterActive: false,
      showDateFilter: false
    });
    this.loadList();
  },

  onApplyDateFilter() {
    const dateFrom = String(this.data.draftDateFrom || '').trim();
    const dateTo = String(this.data.draftDateTo || '').trim();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      wx.showToast({ title: '会议开始不能晚于会议结束', icon: 'none' });
      return;
    }
    this.setData({
      dateFrom: dateFrom,
      dateTo: dateTo,
      dateFilterActive: hasDateFilter(dateFrom, dateTo),
      showDateFilter: false
    });
    this.loadList();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadList().finally(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  loadList() {
    this.setData({ loading: true });
    return spaceService.listRecords({
      status: this.data.status,
      keyword: this.data.keyword,
      dateFrom: this.data.dateFrom || undefined,
      dateTo: this.data.dateTo || undefined
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
    wx.navigateTo({
      url: '/packages/space/booking-detail/index?id=' + encodeURIComponent(id)
    });
  }
});
