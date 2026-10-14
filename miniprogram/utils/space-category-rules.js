/**
 * 会议室分类 · 按查询日期解析开放时段与预定间隔（与 shared/space-category-rules.js 同步）
 */
var DEFAULT_SLOT_MINUTES = 30;
var ALLOWED = [15, 30, 60];

function normalizeSlotMinutes(n, fallback) {
  n = Number(n != null ? n : fallback);
  if (isNaN(n) || ALLOWED.indexOf(n) < 0) {
    n = Number(fallback) || DEFAULT_SLOT_MINUTES;
    if (ALLOWED.indexOf(n) < 0) n = DEFAULT_SLOT_MINUTES;
  }
  return n;
}

function resolveCategoryRule(category, dateStr) {
  if (!category) {
    return {
      slotMinutes: DEFAULT_SLOT_MINUTES,
      timeStart: '08:00',
      timeEnd: '18:00',
      advanceDays: 7
    };
  }
  var versions = category.ruleVersions;
  if (!versions || !versions.length) {
    return {
      slotMinutes: category.slotMinutes,
      timeStart: category.timeStart,
      timeEnd: category.timeEnd,
      advanceDays: category.advanceDays
    };
  }
  var sorted = versions.slice().sort(function (a, b) {
    var da = String(a.effectiveFrom || '');
    var db = String(b.effectiveFrom || '');
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  });
  var date = String(dateStr || '');
  var picked = sorted[0];
  for (var i = 0; i < sorted.length; i++) {
    if (!date || date >= String(sorted[i].effectiveFrom || '')) {
      picked = sorted[i];
    } else {
      break;
    }
  }
  return picked;
}

function buildRoomSlotConfig(options) {
  options = options || {};
  var category = options.category || {};
  var room = options.room || {};
  var dateStr = options.dateStr || '';
  var parseTime = options.parseTimeToMin || options.parseTime;
  if (typeof parseTime !== 'function') {
    parseTime = function (text) {
      var parts = String(text || '08:00').split(':');
      return Number(parts[0]) * 60 + Number(parts[1] || 0);
    };
  }
  var rule = resolveCategoryRule(category, dateStr);
  var slotMinutes = normalizeSlotMinutes(rule.slotMinutes, category.slotMinutes);
  var dayStart = parseTime(rule.timeStart || category.timeStart || '08:00');
  var dayEnd = parseTime(rule.timeEnd || category.timeEnd || '18:00');
  if (dayEnd <= dayStart) dayEnd = dayStart + 60;
  var advanceDays = Number(rule.advanceDays != null ? rule.advanceDays : category.advanceDays);
  if (isNaN(advanceDays) || advanceDays < 0) advanceDays = 7;

  var slots = [];
  for (var t = dayStart; t + slotMinutes <= dayEnd; t += slotMinutes) {
    slots.push(t);
  }
  if (slots.length) {
    var lastFullEnd = slots[slots.length - 1] + slotMinutes;
    if (lastFullEnd < dayEnd) slots.push(lastFullEnd);
  } else if (dayEnd > dayStart) {
    slots.push(dayStart);
  }

  return {
    categoryName: category.name || room.categoryName || '—',
    advanceDays: advanceDays,
    dayStart: dayStart,
    dayEnd: dayEnd,
    slotMinutes: slotMinutes,
    slots: slots,
    ruleEffectiveFrom: rule.effectiveFrom || '',
    queryDate: dateStr || ''
  };
}

module.exports = {
  resolveCategoryRule: resolveCategoryRule,
  buildRoomSlotConfig: buildRoomSlotConfig,
  DEFAULT_SLOT_MINUTES: DEFAULT_SLOT_MINUTES
};
