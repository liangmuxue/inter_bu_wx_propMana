/**
 * 会议室预约演示种子（对齐 shared/space-booking-seed.js）
 */
(function (root) {
  'use strict';

  var DEFAULT_DEMO_USERS = [
    { name: '张三', account: 'zhangsan', org: '工程部' },
    { name: '赵六', account: 'zhaoliu', org: '安保部' },
    { name: '陈静', account: 'chenjing', org: '客服部' },
    { name: '周敏', account: 'zhoumin', org: '物业管理部' },
    { name: '刘洋', account: 'liuyang', org: '工程部' },
    { name: '杨帆', account: 'yangfan', org: '客服部' }
  ];

  var CATEGORY_ROOM = { cat1: 'r1', cat2: 'r2', cat3: 'r3' };

  function buildAdvanceWindowBookings(ctx) {
    ctx = ctx || {};
    var rooms = ctx.rooms || [];
    var categories = ctx.categories || [];
    var formatDate = ctx.formatDate;
    var addDays = ctx.addDays;
    var parseTime = ctx.parseTimeToMin || ctx.parseTime;
    var pad = ctx.pad || function (n) { return n < 10 ? '0' + n : '' + n; };
    var demoUsers = ctx.demoUsers || DEFAULT_DEMO_USERS;
    var currentUser = ctx.currentUser || null;
    var codeSeqStart = ctx.codeSeqStart != null ? ctx.codeSeqStart : 900;

    if (!formatDate || !addDays || !parseTime) return [];

    var today = formatDate(new Date());
    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    var list = [];
    var seq = 0;

    categories.forEach(function (cat) {
      var roomId = CATEGORY_ROOM[cat.id];
      var room = rooms.find(function (r) { return r.id === roomId; });
      if (!room || room.categoryId !== cat.id) {
        room = rooms.find(function (r) { return r.categoryId === cat.id; });
        roomId = room && room.id;
      }
      if (!room || !roomId) return;

      var slotMinutes = Number(cat.slotMinutes) || 30;
      if ([15, 30, 60].indexOf(slotMinutes) < 0) slotMinutes = 30;
      var dayStart = parseTime(cat.timeStart || '08:00');
      var dayEnd = parseTime(cat.timeEnd || '18:00');
      if (dayEnd <= dayStart) dayEnd = dayStart + 60;
      var advanceDays = Number(cat.advanceDays != null ? cat.advanceDays : 7);
      if (isNaN(advanceDays) || advanceDays < 0) advanceDays = 7;

      for (var offset = 0; offset <= advanceDays; offset++) {
        var date = addDays(today, offset);
        var dayKey = date.replace(/-/g, '');
        var startMin;
        var endMin;

        if (date === today) {
          startMin = Math.max(dayStart, nowMin + slotMinutes);
          startMin = Math.ceil(startMin / slotMinutes) * slotMinutes;
          if (startMin + slotMinutes > dayEnd) {
            startMin = Math.max(dayStart, dayEnd - slotMinutes * 2);
          }
          if (startMin >= dayEnd) continue;
        } else {
          startMin = dayStart + (offset % 4) * slotMinutes;
          if (startMin + slotMinutes > dayEnd) startMin = dayStart;
        }

        endMin = startMin + slotMinutes * (slotMinutes >= 60 ? 1 : 2);
        if (endMin > dayEnd) endMin = dayEnd;
        if (endMin <= startMin) endMin = Math.min(dayEnd, startMin + slotMinutes);

        var user = demoUsers[(offset + seq) % demoUsers.length];
        var useCurrent = currentUser && offset === 1 && cat.id === 'cat1';
        var bookingUser = useCurrent ? currentUser : user;

        list.push({
          id: 'adv-' + cat.id + '-' + offset,
          code: 'MR' + dayKey + pad(codeSeqStart + seq),
          roomId: roomId,
          date: date,
          startMin: startMin,
          endMin: endMin,
          userName: bookingUser.name,
          userAccount: bookingUser.account,
          userOrg: bookingUser.org || bookingUser.orgName || '',
          subject: cat.name + ' · 提前' + offset + '天演示',
          submitAt: addDays(today, -1) + ' 09:30:00'
        });
        seq++;
      }
    });
    return list;
  }

  function filterHistoricalBookings(list, today, formatDateFn) {
    today = today || (formatDateFn ? formatDateFn(new Date()) : '');
    return (list || []).filter(function (b) {
      if (!b || !b.date) return false;
      if (String(b.id || '').indexOf('adv-') === 0) return false;
      return b.date < today;
    });
  }

  var api = {
    buildAdvanceWindowBookings: buildAdvanceWindowBookings,
    filterHistoricalBookings: filterHistoricalBookings,
    CATEGORY_ROOM: CATEGORY_ROOM
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SpaceBookingSeed = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {}));
