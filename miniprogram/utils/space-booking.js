/**
 * 会议室预约领域工具（移动端展示用，对齐员工端 space-domain 核心口径）
 */
const seedData = require('./space-seed-data');

function pad(n) {
  return seedData.pad(n);
}

function formatDate(d) {
  return seedData.formatDate(d instanceof Date ? d : new Date(String(d)));
}

function addDays(dateStr, delta) {
  return seedData.addDays(dateStr, delta);
}

function formatMin(min) {
  min = Number(min);
  if (isNaN(min)) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return pad(h) + ':' + pad(m);
}

function formatDateCN(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
  return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
}

function formatMonthCN(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length < 2) return dateStr;
  return parts[0] + '年' + Number(parts[1]) + '月';
}

function weekdayLabel(dateStr) {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(String(dateStr) + 'T12:00:00');
  return labels[d.getDay()];
}

function isToday(dateStr) {
  return dateStr === formatDate(new Date());
}

function findCategory(id, categories) {
  categories = categories || seedData.categories;
  return categories.find(function (c) { return c.id === id; }) || categories[0];
}

function findRoom(id, rooms) {
  rooms = rooms || seedData.rooms;
  return rooms.find(function (r) { return r.id === id; }) || null;
}

const categoryRules = require('./space-category-rules');

function getRoomSlotConfig(room, categories, dateStr) {
  categories = categories || seedData.categories;
  const cat = findCategory(room && room.categoryId, categories);
  return categoryRules.buildRoomSlotConfig({
    category: cat,
    room: room || {},
    dateStr: dateStr || '',
    parseTimeToMin: seedData.parseTime
  });
}

function bookingStartMin(b) {
  if (!b) return 0;
  return Number(b.startMin != null ? b.startMin : 0);
}

function bookingEndMin(b) {
  if (!b) return 0;
  return Number(b.endMin != null ? b.endMin : 0);
}

function isBookingCancelled(b) {
  return !!(b && (b.status === '已取消' || b.cancelled));
}

function getBookingStatus(booking, now) {
  if (!booking || !booking.date) return '未开始';
  if (isBookingCancelled(booking)) return '已取消';
  now = now || new Date();
  const startMin = bookingStartMin(booking);
  const endMin = bookingEndMin(booking);
  const startAt = new Date(booking.date + 'T00:00:00');
  startAt.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const endAt = new Date(booking.date + 'T00:00:00');
  endAt.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
  if (now.getTime() < startAt.getTime()) return '未开始';
  if (now.getTime() >= endAt.getTime()) return '已结束';
  return '进行中';
}

function statusMeta(status) {
  const map = {
    '未开始': { label: '未开始', tone: 'info', cardTone: 'is-info', tagClass: 'tone-blue' },
    '进行中': { label: '进行中', tone: 'success', cardTone: 'is-success', tagClass: 'tone-green' },
    '已结束': { label: '已结束', tone: 'muted', cardTone: 'is-muted', tagClass: 'tone-slate' },
    '已取消': { label: '已取消', tone: 'warning', cardTone: 'is-warning', tagClass: 'tone-amber' }
  };
  return map[status] || { label: status || '—', tone: 'muted', cardTone: 'is-muted', tagClass: 'tone-slate' };
}

function isRoomBookable(room) {
  return !!(room && room.status === '启用');
}

function getBookableDateRange(cfg) {
  const today = formatDate(new Date());
  return {
    min: today,
    max: addDays(today, cfg && cfg.advanceDays != null ? cfg.advanceDays : 7)
  };
}

function isDateOutOfBookableRange(dateStr, cfg) {
  if (!dateStr) return true;
  const range = getBookableDateRange(cfg);
  return dateStr < range.min || dateStr > range.max;
}

function isSlotInPast(dateStr, slotMin) {
  if (!dateStr || slotMin == null || isNaN(slotMin)) return false;
  const startAt = new Date(dateStr + 'T00:00:00');
  startAt.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0);
  return startAt.getTime() < Date.now();
}

const CLEANING_BUFFER_MINUTES = 30;

function bookingOccupiedEndMin(b) {
  return bookingEndMin(b) + CLEANING_BUFFER_MINUTES;
}

function minuteInBooking(roomId, date, min, bookings) {
  return (bookings || []).some(function (b) {
    if (b.roomId !== roomId || b.date !== date || isBookingCancelled(b)) return false;
    return bookingStartMin(b) <= min && bookingOccupiedEndMin(b) > min;
  });
}

function isSlotStartFree(room, date, slotMin, bookings, categories) {
  if (!room) return false;
  const cfg = getRoomSlotConfig(room, categories, date);
  if (!isRoomBookable(room)) return false;
  if (isDateOutOfBookableRange(date, cfg)) return false;
  if (minuteInBooking(room.id, date, slotMin + 1, bookings)) return false;
  if (isSlotInPast(date, slotMin)) return false;
  return true;
}

function getMaxContinuousAvailableMinutes(room, date, bookings, categories) {
  if (!room || !date) return 0;
  const cfg = getRoomSlotConfig(room, categories, date);
  if (!isRoomBookable(room) || isDateOutOfBookableRange(date, cfg)) return 0;
  let maxRun = 0;
  let run = 0;
  cfg.slots.forEach(function (slotMin) {
    if (isSlotStartFree(room, date, slotMin, bookings, categories)) {
      run += cfg.slotMinutes;
      if (run > maxRun) maxRun = run;
    } else {
      run = 0;
    }
  });
  return maxRun;
}

function canBookRoomOnDate(room, date, bookings, categories) {
  if (!room || !isRoomBookable(room)) return false;
  const cfg = getRoomSlotConfig(room, categories, date);
  if (isDateOutOfBookableRange(date, cfg)) return false;
  return getMaxContinuousAvailableMinutes(room, date, bookings, categories) >= cfg.slotMinutes;
}

function getSlotVisualState(room, date, slotMin, bookings, categories) {
  if (!room) return 'blocked';
  const cfg = getRoomSlotConfig(room, categories, date);
  if (!isRoomBookable(room)) return 'blocked';
  // 看板：已有预约优先展示（含不可预约日期上的历史预约，对齐员工端/PC）
  if (isBookingBoardTick(room.id, date, slotMin, bookings)) return 'booked';
  if (isCleaningTick(room.id, date, slotMin, bookings)) return 'cleaning';
  if (isDateOutOfBookableRange(date, cfg)) return 'blocked';
  if (isSlotInPast(date, slotMin)) return 'blocked';
  return 'available';
}

function roomHasOngoingBooking(roomId, bookings) {
  return (bookings || []).some(function (b) {
    return b.roomId === roomId && getBookingStatus(b) === '进行中';
  });
}

/** 会议室当前状态（与员工端 getRoomDisplayStatus 一致，不随查询日期变化） */
function roomDisplayStatusMeta(room, bookings) {
  if (!room) return { label: '—', className: 'is-muted' };
  if (room.status === '停用') return { label: '停用', className: 'is-danger' };
  if (roomHasOngoingBooking(room.id, bookings)) return { label: '使用中', className: 'is-warning' };
  return { label: '空闲', className: 'is-success' };
}

function listBookingsForRoomDate(roomId, date, bookings, options) {
  const includeCancelled = !!(options && options.includeCancelled);
  return (bookings || []).filter(function (b) {
    if (!b || b.roomId !== roomId || b.date !== date) return false;
    if (!includeCancelled && isBookingCancelled(b)) return false;
    return true;
  });
}

function isBookingBoardTick(roomId, date, tickMin, bookings) {
  return (bookings || []).some(function (b) {
    if (b.roomId !== roomId || b.date !== date || isBookingCancelled(b)) return false;
    return bookingStartMin(b) <= tickMin && bookingEndMin(b) > tickMin;
  });
}

function isCleaningTick(roomId, date, tickMin, bookings) {
  return (bookings || []).some(function (b) {
    if (b.roomId !== roomId || b.date !== date || isBookingCancelled(b)) return false;
    return bookingEndMin(b) <= tickMin && bookingOccupiedEndMin(b) > tickMin;
  });
}

function buildBookedRunClasses(states) {
  return states.map(function (slotState, index) {
    if (slotState !== 'booked') return '';
    const prev = index > 0 && states[index - 1] === 'booked';
    const next = index < states.length - 1 && states[index + 1] === 'booked';
    if (!prev && !next) return 'is-run-single';
    if (!prev && next) return 'is-run-start';
    if (prev && next) return 'is-run-mid';
    return 'is-run-end';
  });
}

function dateScrollId(dateStr) {
  return 'd' + String(dateStr || '').replace(/-/g, '');
}

function buildMonthDateList(monthKey) {
  const parts = String(monthKey || '').split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  if (!y || isNaN(m)) return [];
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const list = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    list.push({
      date: dateStr,
      day: d.getDate(),
      dayText: pad(d.getDate()),
      weekday: weekdayLabel(dateStr),
      isToday: isToday(dateStr),
      scrollId: dateScrollId(dateStr)
    });
  }
  return list;
}

function monthKeyFromDate(dateStr) {
  const parts = String(dateStr || '').split('-');
  return parts[0] + '-' + parts[1];
}

function shiftMonthKey(monthKey, offset) {
  const parts = String(monthKey || '').split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1 + offset, 1);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

function buildSlotGrid(room, date, bookings, categories, options) {
  options = options || {};
  const cfg = getRoomSlotConfig(room, categories, date);
  const compact = !!options.compact;
  const slots = cfg.slots.slice();
  const maxShow = compact ? 14 : slots.length;
  const visible = slots.slice(0, maxShow);

  const states = visible.map(function (slotMin) {
    return getSlotVisualState(room, date, slotMin, bookings, categories);
  });
  const runClasses = buildBookedRunClasses(states);

  return visible.map(function (slotMin, index) {
    return {
      label: formatMin(slotMin),
      state: states[index],
      runClass: runClasses[index] || ''
    };
  });
}

function buildDateStripDays(selectedDate, monthKey) {
  return buildMonthDateList(monthKey || monthKeyFromDate(selectedDate));
}

function resolveMonthSelectedDate(monthKey, preferredDate) {
  const list = buildMonthDateList(monthKey);
  if (!list.length) return monthKey + '-01';
  const preferred = String(preferredDate || '');
  if (preferred.indexOf(monthKey) === 0) return preferred;
  const today = formatDate(new Date());
  if (today.indexOf(monthKey) === 0) return today;
  return list[0].date;
}

module.exports = {
  formatDate: formatDate,
  addDays: addDays,
  formatMin: formatMin,
  formatDateCN: formatDateCN,
  formatMonthCN: formatMonthCN,
  weekdayLabel: weekdayLabel,
  isToday: isToday,
  findRoom: findRoom,
  findCategory: findCategory,
  getRoomSlotConfig: getRoomSlotConfig,
  getBookingStatus: getBookingStatus,
  statusMeta: statusMeta,
  roomDisplayStatusMeta: roomDisplayStatusMeta,
  listBookingsForRoomDate: listBookingsForRoomDate,
  buildSlotGrid: buildSlotGrid,
  buildDateStripDays: buildDateStripDays,
  resolveMonthSelectedDate: resolveMonthSelectedDate,
  dateScrollId: dateScrollId,
  monthKeyFromDate: monthKeyFromDate,
  shiftMonthKey: shiftMonthKey,
  isBookingCancelled: isBookingCancelled,
  bookingStartMin: bookingStartMin,
  bookingEndMin: bookingEndMin
};
