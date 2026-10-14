const session = require('../store/session');
const dataScope = require('../utils/data-scope');
const spaceScope = require('../utils/space-room-scope');
const spaceBooking = require('../utils/space-booking');
const seedData = require('../utils/space-seed-data');

let _bookingsCache = null;

function allBookings() {
  if (!_bookingsCache) _bookingsCache = seedData.createBookings();
  return _bookingsCache.slice();
}

function scopedContext() {
  const user = session.getUser();
  const scope = dataScope.resolveDataScope(user);
  const rooms = spaceScope.filterRoomsInDataScope(seedData.rooms, scope);
  const bookings = spaceScope.filterBookingsByRoomScope(allBookings(), seedData.rooms, scope);
  return { user: user, scope: scope, rooms: rooms, bookings: bookings, categories: seedData.categories };
}

function decorateRoom(room, ctx, date) {
  date = date || spaceBooking.formatDate(new Date());
  const status = spaceBooking.roomDisplayStatusMeta(room, ctx.bookings);
  return Object.assign({}, room, {
    statusLabel: status.label,
    statusClass: status.className,
    slotGrid: spaceBooking.buildSlotGrid(room, date, ctx.bookings, ctx.categories, { compact: true }),
    bookingCount: spaceBooking.listBookingsForRoomDate(room.id, date, ctx.bookings).length,
    facilitiesText: (room.facilities || []).join(' · ')
  });
}

function decorateBooking(booking, ctx) {
  const room = spaceBooking.findRoom(booking.roomId, ctx.rooms) ||
    spaceBooking.findRoom(booking.roomId, seedData.rooms);
  const status = spaceBooking.getBookingStatus(booking);
  const meta = spaceBooking.statusMeta(status);
  const roomLine = [
    room ? room.name : '',
    room ? room.regionName : '',
    room ? room.location : ''
  ].filter(Boolean).join(' · ') || '—';
  return Object.assign({}, booking, {
    roomName: room ? room.name : '—',
    regionName: room ? room.regionName : '—',
    location: room ? room.location : '',
    roomLine: roomLine,
    facilities: room && room.facilities ? room.facilities.slice() : [],
    status: status,
    statusLabel: meta.label,
    statusClass: meta.tagClass,
    cardTone: meta.cardTone,
    heroTone: meta.cardTone,
    dateText: spaceBooking.formatDateCN(booking.date),
    timeText: spaceBooking.formatMin(spaceBooking.bookingStartMin(booking)) + '-' +
      spaceBooking.formatMin(spaceBooking.bookingEndMin(booking))
  });
}

function listBoardRooms(query) {
  query = query || {};
  const ctx = scopedContext();
  let rooms = ctx.rooms.slice();
  const keyword = String(query.keyword || '').trim().toLowerCase();
  if (keyword) {
    rooms = rooms.filter(function (room) {
      const hay = [
        room.name, room.regionName, room.location,
        (room.facilities || []).join(' ')
      ].join(' ').toLowerCase();
      return hay.indexOf(keyword) >= 0;
    });
  }
  const date = query.date || spaceBooking.formatDate(new Date());
  return rooms.map(function (room) {
    return decorateRoom(room, ctx, date);
  });
}

function listBoardMeta(query) {
  query = query || {};
  const ctx = scopedContext();
  const date = query.date || spaceBooking.formatDate(new Date());
  const monthKey = query.monthKey || spaceBooking.monthKeyFromDate(date);
  return {
    selectedDate: date,
    monthKey: monthKey,
    monthLabel: spaceBooking.formatMonthCN(monthKey + '-01'),
    dateStrip: spaceBooking.buildDateStripDays(date, monthKey),
    scopeHint: ctx.scope.all
      ? '当前为全部组织数据权限'
      : '按开放组织 ∩ 角色组织权限展示会议室（对齐 PC）',
    roomOptions: [{ id: '', name: '全部会议室' }].concat(ctx.rooms.map(function (r) {
      return { id: r.id, name: r.name + (r.status === '停用' ? '（停用）' : '') };
    }))
  };
}

function listRecords(query) {
  query = query || {};
  const ctx = scopedContext();
  let list = ctx.bookings.slice();
  const status = query.status && query.status !== 'all' ? query.status : '';
  const roomId = query.roomId || '';
  const keyword = String(query.keyword || '').trim().toLowerCase();

  if (status) {
    list = list.filter(function (b) {
      return spaceBooking.getBookingStatus(b) === status;
    });
  }
  if (roomId) {
    list = list.filter(function (b) { return b.roomId === roomId; });
  }
  if (query.dateFrom) {
    list = list.filter(function (b) { return b.date >= query.dateFrom; });
  }
  if (query.dateTo) {
    list = list.filter(function (b) { return b.date <= query.dateTo; });
  }
  if (keyword) {
    list = list.filter(function (b) {
      const room = spaceBooking.findRoom(b.roomId, ctx.rooms) ||
        spaceBooking.findRoom(b.roomId, seedData.rooms);
      const hay = [
        b.code, b.subject, b.userName, b.userOrg,
        room ? room.name : '', room ? room.regionName : '', room ? room.location : ''
      ].join(' ').toLowerCase();
      return hay.indexOf(keyword) >= 0;
    });
  }

  list.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return spaceBooking.bookingStartMin(b) - spaceBooking.bookingStartMin(a);
  });

  return list.map(function (item) {
    return decorateBooking(item, ctx);
  });
}

function getBooking(id) {
  const ctx = scopedContext();
  const booking = ctx.bookings.find(function (b) { return b.id === id; });
  if (!booking) return null;
  const detail = decorateBooking(booking, ctx);
  const infoRows = [
    { label: '预约编号', value: detail.code || detail.id || '—' },
    { label: '会议室', value: detail.roomName },
    { label: '会议日期', value: detail.dateText },
    { label: '会议时间', value: detail.timeText },
    { label: '会议主题', value: detail.subject || '—' },
    { label: '预约人', value: detail.userName || '—' },
    { label: '所属组织', value: detail.userOrg || '—' },
    { label: '创建时间', value: detail.submitAt || '—' },
    { label: '状态', value: detail.statusLabel, isStatus: true }
  ];
  if (detail.status === '已取消') {
    infoRows.push({ label: '取消时间', value: detail.cancelAt || '—' });
    infoRows.push({ label: '取消操作人', value: detail.cancelBy || '—' });
    infoRows.push({ label: '取消原因', value: detail.cancelReason || '—' });
  }
  if (detail.remark) {
    infoRows.push({ label: '备注', value: detail.remark });
  }
  detail.infoRows = infoRows;
  return detail;
}

function buildRulesText(room, categories, date) {
  const cfg = spaceBooking.getRoomSlotConfig(room, categories, date);
  return spaceBooking.formatMin(cfg.dayStart) + '-' + spaceBooking.formatMin(cfg.dayEnd) +
    ' · 间隔 ' + cfg.slotMinutes + ' 分钟 · 可提前 ' + cfg.advanceDays + ' 天';
}

function decorateRoomDetail(room, ctx, date) {
  const status = spaceBooking.roomDisplayStatusMeta(room, ctx.bookings);
  const images = (room.images && room.images.length)
    ? room.images.slice()
    : (room.imageUrl ? [room.imageUrl] : []);
  // 预约看板仍只计有效预约；预约信息列表含当日已取消
  const activeDayBookings = spaceBooking.listBookingsForRoomDate(room.id, date, ctx.bookings);
  const dayBookings = spaceBooking.listBookingsForRoomDate(room.id, date, ctx.bookings, { includeCancelled: true })
    .slice()
    .sort(function (a, b) {
      const cancelledDiff = Number(spaceBooking.isBookingCancelled(a)) - Number(spaceBooking.isBookingCancelled(b));
      if (cancelledDiff) return cancelledDiff; // 有效预约在前，已取消靠后
      return spaceBooking.bookingStartMin(a) - spaceBooking.bookingStartMin(b);
    })
    .map(function (item) {
      return decorateBooking(item, ctx);
    });
  return {
    id: room.id,
    name: room.name,
    categoryName: room.categoryName || '—',
    capacity: room.capacity,
    regionName: room.regionName || '—',
    location: room.location || '',
    status: room.status,
    statusLabel: status.label,
    statusClass: status.className,
    facilities: (room.facilities || []).slice(),
    intro: room.intro || '',
    imageUrl: room.imageUrl || images[0] || '',
    images: images,
    metaLine: [
      (room.capacity != null ? room.capacity + ' 人' : ''),
      room.regionName || '',
      room.location || ''
    ].filter(Boolean).join(' · '),
    rulesText: buildRulesText(room, ctx.categories, date),
    date: date,
    dateText: spaceBooking.formatDateCN(date),
    slotGrid: spaceBooking.buildSlotGrid(room, date, ctx.bookings, ctx.categories, { compact: false }),
    bookingCount: activeDayBookings.length,
    dayBookings: dayBookings
  };
}

function getRoomDetail(roomId, date) {
  const ctx = scopedContext();
  const queryDate = date || spaceBooking.formatDate(new Date());
  const room = ctx.rooms.find(function (r) { return r.id === roomId; });
  if (!room) return null;
  return decorateRoomDetail(room, ctx, queryDate);
}

function money(n) {
  const x = Math.round((Number(n) || 0) * 100) / 100;
  return '¥' + x.toFixed(2);
}

function listFeeStats(query) {
  query = query || {};
  const rows = listRecords(query) || [];
  const statuses = Array.isArray(query.statuses) ? query.statuses : [];
  const filtered = rows.filter(function (row) {
    if (statuses.length && statuses.indexOf(row.statusLabel || row.status) < 0) return false;
    if (query.roomId && String(row.roomId) !== String(query.roomId)) return false;
    if (query.userOrg && String(row.userOrg || '') !== String(query.userOrg)) return false;
    return true;
  }).map(function (row) {
    const roomFee = Number(row.roomFee) || 0;
    const serviceFee = Number(row.serviceFee) || 0;
    const totalFee = Number(row.totalFee) || (roomFee + serviceFee);
    return Object.assign({}, row, {
      roomFee: roomFee,
      serviceFee: serviceFee,
      totalFee: totalFee,
      roomFeeText: row.roomFeeText || money(roomFee),
      serviceFeeText: row.serviceFeeText || money(serviceFee),
      totalFeeText: row.totalFeeText || money(totalFee)
    });
  });
  let roomFee = 0;
  let serviceFee = 0;
  let totalFee = 0;
  const orgMap = {};
  filtered.forEach(function (row) {
    roomFee += row.roomFee;
    serviceFee += row.serviceFee;
    totalFee += row.totalFee;
    const org = row.userOrg || '—';
    if (!orgMap[org]) orgMap[org] = { orgName: org, count: 0, roomFee: 0, serviceFee: 0, totalFee: 0 };
    orgMap[org].count += 1;
    orgMap[org].roomFee += row.roomFee;
    orgMap[org].serviceFee += row.serviceFee;
    orgMap[org].totalFee += row.totalFee;
  });
  const orgList = Object.keys(orgMap).map(function (key) {
    const row = orgMap[key];
    row.roomFeeText = money(row.roomFee);
    row.serviceFeeText = money(row.serviceFee);
    row.totalFeeText = money(row.totalFee);
    row.periodText = '全部时段';
    return row;
  });
  const ctx = scopedContext();
  return {
    summary: {
      count: filtered.length,
      roomFeeText: money(roomFee),
      serviceFeeText: money(serviceFee),
      totalFeeText: money(totalFee),
      periodText: '全部时段'
    },
    list: filtered,
    orgList: orgList,
    roomOptions: [{ id: '', name: '全部会议室' }].concat((ctx.rooms || []).map(function (room) {
      return { id: room.id, name: room.name };
    })),
    orgOptions: [{ id: '', name: '全部组织' }]
  };
}

module.exports = {
  listBoardRooms: listBoardRooms,
  listBoardMeta: listBoardMeta,
  listRecords: listRecords,
  listFeeStats: listFeeStats,
  getBooking: getBooking,
  getRoomDetail: getRoomDetail,
  scopedContext: scopedContext
};
