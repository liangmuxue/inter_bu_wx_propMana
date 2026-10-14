const spaceService = require('../../../services/space');
const pageAccess = require('../../../utils/page-access');

const FEE_STATUS_OPTIONS = [
  { id: '未开始', label: '未开始' },
  { id: '进行中', label: '进行中' },
  { id: '已结束', label: '已结束' },
  { id: '已取消', label: '已取消' }
];

const FEE_STATUS_DEFAULT = ['未开始', '进行中', '已结束'];

function buildStatusLabel(selected) {
  const list = selected || [];
  if (!list.length) return '请选择状态';
  if (list.length === FEE_STATUS_OPTIONS.length) return '全部状态';
  if (list.length <= 2) return list.join('、');
  return '状态（' + list.length + '）';
}

function buildStatusOptions(selected) {
  const set = {};
  (selected || []).forEach(function (s) { set[s] = true; });
  return FEE_STATUS_OPTIONS.map(function (o) {
    return { id: o.id, label: o.label, checked: !!set[o.id] };
  });
}

Page({
  data: {
    loading: true,
    refreshing: false,
    viewMode: 'detail',
    dateFrom: '',
    dateTo: '',
    roomId: '',
    roomIndex: 0,
    roomOptions: [{ id: '', name: '全部会议室' }],
    userOrg: '',
    orgIndex: 0,
    orgOptions: [{ id: '', name: '全部组织' }],
    statusOptions: buildStatusOptions(FEE_STATUS_DEFAULT),
    selectedStatuses: FEE_STATUS_DEFAULT.slice(),
    statusLabel: buildStatusLabel(FEE_STATUS_DEFAULT),
    statusPanelOpen: false,
    summary: null,
    list: [],
    orgList: []
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) {
      this.setData({ loading: false, list: [], orgList: [], summary: null });
      return;
    }
    this.loadData();
  },

  loadData() {
    const query = {
      dateFrom: this.data.dateFrom,
      dateTo: this.data.dateTo,
      roomId: this.data.roomId,
      userOrg: this.data.userOrg,
      statuses: (this.data.selectedStatuses || []).slice()
    };
    this.setData({ loading: true });
    return spaceService.listFeeStats(query).then((res) => {
      const roomOptions = (res && res.roomOptions) || [{ id: '', name: '全部会议室' }];
      const orgOptions = (res && res.orgOptions) || [{ id: '', name: '全部组织' }];
      let roomIndex = 0;
      let orgIndex = 0;
      roomOptions.forEach((item, idx) => {
        if (item.id === this.data.roomId) roomIndex = idx;
      });
      orgOptions.forEach((item, idx) => {
        if (item.id === this.data.userOrg) orgIndex = idx;
      });
      this.setData({
        loading: false,
        refreshing: false,
        summary: (res && res.summary) || {
          count: 0,
          roomFeeText: '0.00 元',
          serviceFeeText: '0.00 元',
          totalFeeText: '0.00 元',
          periodText: '全部时段'
        },
        list: (res && res.list) || [],
        orgList: (res && res.orgList) || [],
        roomOptions: roomOptions,
        orgOptions: orgOptions,
        roomIndex: roomIndex,
        orgIndex: orgIndex
      });
    }).catch(() => {
      this.setData({ loading: false, refreshing: false, list: [], orgList: [], summary: null });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadData();
  },

  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode || 'detail';
    if (mode === this.data.viewMode) return;
    this.setData({ viewMode: mode, statusPanelOpen: false });
  },

  onDateFromChange(e) {
    this.setData({ dateFrom: e.detail.value || '', statusPanelOpen: false });
    this.loadData();
  },

  onDateToChange(e) {
    this.setData({ dateTo: e.detail.value || '', statusPanelOpen: false });
    this.loadData();
  },

  onRoomChange(e) {
    const index = Number(e.detail.value) || 0;
    const opt = this.data.roomOptions[index] || { id: '' };
    this.setData({ roomIndex: index, roomId: opt.id || '', statusPanelOpen: false });
    this.loadData();
  },

  onOrgChange(e) {
    const index = Number(e.detail.value) || 0;
    const opt = this.data.orgOptions[index] || { id: '' };
    this.setData({ orgIndex: index, userOrg: opt.id || '', statusPanelOpen: false });
    this.loadData();
  },

  onToggleStatusPanel() {
    this.setData({ statusPanelOpen: !this.data.statusPanelOpen });
  },

  onToggleStatus(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const selected = (this.data.selectedStatuses || []).slice();
    const idx = selected.indexOf(id);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(id);
    const ordered = FEE_STATUS_OPTIONS.map((o) => o.id).filter((s) => selected.indexOf(s) >= 0);
    this.setData({
      selectedStatuses: ordered,
      statusOptions: buildStatusOptions(ordered),
      statusLabel: buildStatusLabel(ordered)
    });
    this.loadData();
  },

  onReset() {
    this.setData({
      dateFrom: '',
      dateTo: '',
      roomId: '',
      roomIndex: 0,
      userOrg: '',
      orgIndex: 0,
      selectedStatuses: FEE_STATUS_DEFAULT.slice(),
      statusOptions: buildStatusOptions(FEE_STATUS_DEFAULT),
      statusLabel: buildStatusLabel(FEE_STATUS_DEFAULT),
      statusPanelOpen: false
    });
    this.loadData();
  },

  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/packages/space/booking-detail/index?id=' + encodeURIComponent(id)
    });
  }
});
