const spaceService = require('../../../services/space');
const spaceBooking = require('../../../utils/space-booking');
const pageAccess = require('../../../utils/page-access');

const SEARCH_DEBOUNCE_MS = 300;

Page({
  data: {
    loading: true,
    refreshing: false,
    keyword: '',
    selectedDate: '',
    monthKey: '',
    monthLabel: '',
    dateStrip: [],
    dateScrollIntoView: '',
    rooms: []
  },

  onLoad() {
    this._searchTimer = null;
    this._stripViewportWidth = 0;
    this._stripScrollLeft = 0;
    this._stripScrollWidth = 0;
    this._monthJumpLock = false;
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
  },

  onReady() {
    this.measureStripViewport();
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) {
      this.setData({ loading: false, rooms: [] });
      return;
    }
    this.loadBoard();
  },

  loadBoard(override) {
    override = override || {};
    this.setData({ loading: true });
    try {
      const date = override.date || this.data.selectedDate || spaceBooking.formatDate(new Date());
      const monthKey = override.monthKey || this.data.monthKey || spaceBooking.monthKeyFromDate(date);
      const keyword = override.keyword != null ? override.keyword : this.data.keyword;
      return Promise.all([
        spaceService.listBoardMeta({ date: date, monthKey: monthKey }),
        spaceService.listBoardRooms({ date: date, keyword: keyword })
      ]).then(function (results) {
        const meta = results[0] || {};
        const selectedDate = meta.selectedDate || date;
        this.setData({
          selectedDate: selectedDate,
          monthKey: meta.monthKey || monthKey,
          monthLabel: meta.monthLabel || '',
          dateStrip: meta.dateStrip || [],
          dateScrollIntoView: spaceBooking.dateScrollId(selectedDate),
          rooms: results[1] || [],
          loading: false
        });
      }.bind(this)).catch(function () {
        this.setData({ rooms: [], loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }.bind(this)).finally(function () {
        this.measureStripViewport();
      }.bind(this));
    } catch (e) {
      this.setData({ rooms: [], loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
      return Promise.resolve();
    }
  },

  measureStripViewport() {
    wx.createSelectorQuery().in(this).select('.space-home-date-strip').boundingClientRect(function (rect) {
      if (rect && rect.width) this._stripViewportWidth = rect.width;
    }.bind(this)).exec();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadBoard().finally(function () {
      this.setData({ refreshing: false });
    }.bind(this));
  },

  onKeywordInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword: keyword });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(function () {
      this.loadBoard({ keyword: keyword });
    }.bind(this), SEARCH_DEBOUNCE_MS);
  },

  onPickDate(e) {
    const date = e.currentTarget.dataset.date;
    if (!date || date === this.data.selectedDate) return;
    const monthKey = spaceBooking.monthKeyFromDate(date);
    this.setData({
      selectedDate: date,
      monthKey: monthKey,
      dateScrollIntoView: spaceBooking.dateScrollId(date)
    });
    this.loadBoard({ date: date, monthKey: monthKey });
  },

  isStripAtEnd() {
    const vw = this._stripViewportWidth || 0;
    const scrollLeft = this._stripScrollLeft || 0;
    const scrollWidth = this._stripScrollWidth || 0;
    if (!vw || !scrollWidth) return false;
    return scrollLeft + vw >= scrollWidth - 16;
  },

  isStripAtStart() {
    return (this._stripScrollLeft || 0) <= 16;
  },

  jumpMonthFromStrip(offset) {
    offset = Number(offset || 0);
    if (!offset || this._monthJumpLock) return;
    this._monthJumpLock = true;
    const baseMonthKey = this.data.monthKey ||
      spaceBooking.monthKeyFromDate(this.data.selectedDate || spaceBooking.formatDate(new Date()));
    const monthKey = spaceBooking.shiftMonthKey(baseMonthKey, offset);
    const days = spaceBooking.buildDateStripDays('', monthKey);
    if (!days.length) {
      this._monthJumpLock = false;
      return;
    }
    const selectedDate = offset > 0 ? days[0].date : days[days.length - 1].date;
    this._stripScrollLeft = offset > 0 ? 0 : Number.MAX_SAFE_INTEGER;
    this.setData({
      monthKey: monthKey,
      selectedDate: selectedDate,
      dateScrollIntoView: spaceBooking.dateScrollId(selectedDate)
    });
    this.loadBoard({ date: selectedDate, monthKey: monthKey }).finally(function () {
      this._monthJumpLock = false;
    }.bind(this));
  },

  onStripScroll(e) {
    if (!this.data.dateStrip.length || this._monthJumpLock) return;
    const detail = e.detail || {};
    this._stripScrollLeft = detail.scrollLeft || 0;
    this._stripScrollWidth = detail.scrollWidth || 0;
    if (detail.isDrag) {
      const atEnd = this.isStripAtEnd();
      const atStart = this.isStripAtStart();
      if (atEnd && detail.deltaX < -12) {
        this.jumpMonthFromStrip(1);
      } else if (atStart && detail.deltaX > 12) {
        this.jumpMonthFromStrip(-1);
      }
    }
  },

  onMonthShift(e) {
    const offset = Number(e.currentTarget.dataset.offset || 0);
    this.jumpMonthFromStrip(offset);
  },

  onDateStripScroll(e) {
    const offset = Number(e.currentTarget.dataset.offset || 0);
    if (!offset) return;

    if (offset > 0 && this.isStripAtEnd()) {
      this.jumpMonthFromStrip(1);
      return;
    }
    if (offset < 0 && this.isStripAtStart()) {
      this.jumpMonthFromStrip(-1);
      return;
    }

    const strip = this.data.dateStrip || [];
    const idx = strip.findIndex(function (item) {
      return item.date === this.data.selectedDate;
    }.bind(this));

    if (offset > 0) {
      if (idx >= 0 && idx < strip.length - 1) {
        this.onPickDate({ currentTarget: { dataset: { date: strip[idx + 1].date } } });
        return;
      }
      this.jumpMonthFromStrip(1);
      return;
    }

    if (idx > 0) {
      this.onPickDate({ currentTarget: { dataset: { date: strip[idx - 1].date } } });
      return;
    }
    this.jumpMonthFromStrip(-1);
  },

  onOpenRecords() {
    wx.navigateTo({ url: '/packages/space/record-list/index' });
  },

  onOpenRoom(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const date = this.data.selectedDate || '';
    wx.navigateTo({
      url: '/packages/space/room-detail/index?id=' + encodeURIComponent(id) +
        (date ? '&date=' + encodeURIComponent(date) : '')
    });
  }
});
