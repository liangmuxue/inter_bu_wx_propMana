/** 班组排班（对齐 PC getGuardScheduleDutyUserIds / collectGuardScheduleRecentMonthRows） */
const dataScope = require('./data-scope');

const MODE_LABELS = {
  cycle: '循环轮班',
  week: '按周排班',
  month: '按月排班'
};

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDateYMD(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function parseDateYMD(str) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function weekDayKey(date) {
  const d = date.getDay();
  return d === 0 ? '7' : String(d);
}

function normalizeUserId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') return (value.id || '').trim();
  return String(value).trim();
}

/** 解析当日值班人 ID 列表（兼容单值 / 数组 / 逗号串） */
function normalizeDutyUserIds(val) {
  if (val == null || val === '') return [];
  let arr = [];
  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === 'string') {
    arr = val.split(/[,，]/);
  } else if (typeof val === 'object' && val.id) {
    arr = [val.id];
  } else {
    arr = [val];
  }
  const seen = {};
  const out = [];
  arr.forEach(function (x) {
    const id = normalizeUserId(x);
    if (!id || seen[id]) return;
    seen[id] = true;
    out.push(id);
  });
  return out;
}

function normalizeCycleMember(m) {
  if (!m) return null;
  if (typeof m === 'string') {
    return { ids: [m], days: 1 };
  }
  let ids = [];
  if (Array.isArray(m.ids) && m.ids.length) {
    ids = normalizeDutyUserIds(m.ids);
  } else {
    const single = normalizeUserId(m.id || m);
    if (single) ids = [single];
  }
  if (!ids.length) return null;
  return { ids: ids, days: parseInt(m.days, 10) || 1 };
}

function getCycleDutyUserIds(config, date) {
  const members = ((config.cycle && config.cycle.members) || []).map(normalizeCycleMember).filter(Boolean);
  const startDate = (config.cycle && config.cycle.startDate) || '';
  if (!members.length || !startDate) return [];
  const start = parseDateYMD(startDate);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (!start) return [];
  const diffDays = Math.floor((target - start) / 86400000);
  const totalCycle = members.reduce(function (sum, m) {
    return sum + (parseInt(m.days, 10) || 1);
  }, 0);
  if (!totalCycle) return [];
  let pos = ((diffDays % totalCycle) + totalCycle) % totalCycle;
  for (let i = 0; i < members.length; i++) {
    const days = parseInt(members[i].days, 10) || 1;
    if (pos < days) return members[i].ids.slice();
    pos -= days;
  }
  return members[0].ids.slice();
}

function getDutyUserIds(config, date) {
  config = config || {};
  const mode = config.mode || 'cycle';
  if (mode === 'week') {
    const week = config.week || {};
    return normalizeDutyUserIds(week[weekDayKey(date)]);
  }
  if (mode === 'month') {
    const month = config.month || {};
    return normalizeDutyUserIds(month[String(date.getDate())]);
  }
  return getCycleDutyUserIds(config, date);
}

/** 兼容旧调用：取第一位值班人 */
function getDutyUserId(config, date) {
  return getDutyUserIds(config, date)[0] || '';
}

function formatUserName(userId, formatUser) {
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  return userId ? formatUser(userId) : '—';
}

function formatDutyUserNames(ids, formatUser) {
  const list = normalizeDutyUserIds(ids);
  if (!list.length) return '—';
  return list.map(function (id) { return formatUserName(id, formatUser); }).join('、');
}

function userInScheduleConfig(userId, config) {
  userId = userId || '';
  config = config || {};
  const mode = config.mode || 'cycle';
  if (mode === 'week') {
    const week = config.week || {};
    return Object.keys(week).some(function (k) {
      return normalizeDutyUserIds(week[k]).indexOf(userId) >= 0;
    });
  }
  if (mode === 'month') {
    const month = config.month || {};
    return Object.keys(month).some(function (k) {
      return normalizeDutyUserIds(month[k]).indexOf(userId) >= 0;
    });
  }
  const members = ((config.cycle && config.cycle.members) || []).map(normalizeCycleMember).filter(Boolean);
  return members.some(function (m) { return m.ids.indexOf(userId) >= 0; });
}

function buildMonthPreview(config, userId, days, formatUser) {
  days = days || 30;
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = 0; i < days; i++) {
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() + i);
    const dutyUserIds = getDutyUserIds(config, cursor);
    const wk = parseInt(weekDayKey(cursor), 10) - 1;
    rows.push({
      date: formatDateYMD(cursor),
      weekDay: WEEK_LABELS[wk] || '',
      dutyUserId: dutyUserIds[0] || '',
      dutyUserIds: dutyUserIds,
      dutyUserName: formatDutyUserNames(dutyUserIds, formatUser),
      isMe: dutyUserIds.indexOf(userId) >= 0,
      isToday: i === 0
    });
  }
  return rows;
}

function buildWeekDays(config, userId, formatUser) {
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const list = [];
  for (let i = 0; i < 7; i++) {
    const cursor = new Date(monday);
    cursor.setDate(monday.getDate() + i);
    const dutyUserIds = getDutyUserIds(config, cursor);
    list.push({
      date: formatDateYMD(cursor),
      weekDay: WEEK_LABELS[i],
      dutyUserId: dutyUserIds[0] || '',
      dutyUserIds: dutyUserIds,
      dutyUserName: formatDutyUserNames(dutyUserIds, formatUser),
      onDuty: dutyUserIds.indexOf(userId) >= 0,
      isToday: formatDateYMD(cursor) === formatDateYMD(today)
    });
  }
  return list;
}

function enrichTeam(team, userId, formatUser) {
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  const config = team.config || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDutyUserIds = getDutyUserIds(config, today);
  return Object.assign({}, team, {
    modeLabel: MODE_LABELS[config.mode] || MODE_LABELS.cycle,
    linkedPlans: team.linkedPlans || [],
    linkedPlanText: (team.linkedPlans || []).length
      ? team.linkedPlans.join('、')
      : '—',
    todayDutyUserId: todayDutyUserIds[0] || '',
    todayDutyUserIds: todayDutyUserIds,
    todayDutyUserName: formatDutyUserNames(todayDutyUserIds, formatUser),
    todayOnDuty: todayDutyUserIds.indexOf(userId) >= 0,
    weekDays: buildWeekDays(config, userId, formatUser),
    monthRows: buildMonthPreview(config, userId, 30, formatUser),
    myDutyCount30: buildMonthPreview(config, userId, 30, formatUser)
      .filter(function (r) { return r.isMe; }).length
  });
}

function isTeamAccessible(team, userId) {
  return dataScope.isTeamAccessible(userId, team);
}

function buildMyDutyRows(myTeams, userId, days, formatUser) {
  days = days || 30;
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = 0; i < days; i++) {
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() + i);
    const date = formatDateYMD(cursor);
    const wk = parseInt(weekDayKey(cursor), 10) - 1;
    const dutyTeams = (myTeams || []).filter(function (team) {
      return getDutyUserIds(team.config, cursor).indexOf(userId) >= 0;
    }).map(function (team) {
      return { id: team.id, name: team.name };
    });
    rows.push({
      date: date,
      weekDay: WEEK_LABELS[wk] || '',
      isToday: i === 0,
      onDuty: dutyTeams.length > 0,
      dutyTeams: dutyTeams,
      dutyTeamText: dutyTeams.length
        ? dutyTeams.map(function (t) { return t.name; }).join('、')
        : '—'
    });
  }
  return rows;
}

function buildMyWeekDutyRows(myTeams, userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const list = [];
  for (let i = 0; i < 7; i++) {
    const cursor = new Date(monday);
    cursor.setDate(monday.getDate() + i);
    const date = formatDateYMD(cursor);
    const dutyTeams = (myTeams || []).filter(function (team) {
      return getDutyUserIds(team.config, cursor).indexOf(userId) >= 0;
    }).map(function (team) {
      return { id: team.id, name: team.name };
    });
    list.push({
      date: date,
      weekDay: WEEK_LABELS[i],
      isToday: date === formatDateYMD(today),
      onDuty: dutyTeams.length > 0,
      dutyTeams: dutyTeams,
      dutyTeamText: dutyTeams.length
        ? dutyTeams.map(function (t) { return t.name; }).join('、')
        : '—'
    });
  }
  return list;
}

function buildScheduleView(teams, userId, formatUser) {
  formatUser = formatUser || dataScope.formatExecutorDisplay.bind(dataScope);
  const scope = dataScope.resolveDataScope({ id: userId });
  const list = (teams || []).filter(function (team) {
    return isTeamAccessible(team, userId);
  }).map(function (team) {
    return enrichTeam(team, userId, formatUser);
  });
  const myTeams = list.filter(function (team) {
    return userInScheduleConfig(userId, team.config);
  });
  return {
    teams: list,
    myTeams: myTeams,
    myWeekDays: buildMyWeekDutyRows(myTeams, userId),
    myMonthRows: buildMyDutyRows(myTeams, userId, 30, formatUser),
    myDutyCount30: buildMyDutyRows(myTeams, userId, 30, formatUser)
      .filter(function (r) { return r.onDuty; }).length,
    scopeAll: !!scope.all,
    accessibleCount: list.length,
    myTeamCount: myTeams.length
  };
}

function buildMyScheduleView(teams, userId, formatUser) {
  return buildScheduleView(teams, userId, formatUser);
}

module.exports = {
  MODE_LABELS: MODE_LABELS,
  WEEK_LABELS: WEEK_LABELS,
  formatDateYMD: formatDateYMD,
  getDutyUserId: getDutyUserId,
  getDutyUserIds: getDutyUserIds,
  userInScheduleConfig: userInScheduleConfig,
  buildMonthPreview: buildMonthPreview,
  buildWeekDays: buildWeekDays,
  enrichTeam: enrichTeam,
  isTeamAccessible: isTeamAccessible,
  buildScheduleView: buildScheduleView,
  buildMyScheduleView: buildMyScheduleView,
  buildMyDutyRows: buildMyDutyRows,
  buildMyWeekDutyRows: buildMyWeekDutyRows
};
