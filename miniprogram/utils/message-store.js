const env = require('../config/env');
const dataScope = require('./data-scope');

var STORAGE_KEY = 'patrol_station_messages_v2';
var LEGACY_STORAGE_KEYS = ['patrol_station_messages_v1'];
var DEDUPE_KEY = 'patrol_station_message_dedupe_v1';
var POPUP_KEY = 'patrol_message_popup_shown_v1';
var PC_INGESTED_KEY = 'patrol_wxapp_pc_messages_ingested_v1';

var TYPE_LABELS = {
  task_remind: '任务提醒',
  task_urge: '任务催办',
  task_overdue: '任务超时',
  task_reassign: '任务转派',
  workorder_remind: '工单催办',
  meeting_booking_cancel: '会议预约取消'
};

function nowStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}

function genId(prefix) {
  return (prefix || 'msg') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

function getUserId(user) {
  user = user || {};
  return user.id || env.mockUserId || 'lisi';
}

function loadLegacyStorageList() {
  var i;
  for (i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
    try {
      var legacyRaw = wx.getStorageSync(LEGACY_STORAGE_KEYS[i]);
      if (legacyRaw && Array.isArray(legacyRaw) && legacyRaw.length) return legacyRaw;
    } catch (e) { /* ignore */ }
  }
  return null;
}

function workorderRemindSeedMessages(userId) {
  userId = userId || env.mockUserId || 'lisi';
  return [
    {
      id: 'msg-wx-wos-001',
      type: 'workorder_remind',
      title: '工单流程催办 · 派单',
      content: 'WO-20260818-001 待派单，请尽快处理',
      detail: '工单「15F茶水间水龙头漏水…」（WO-20260818-001）已进入派单环节超过提醒间隔，请区域调度管理员尽快派单或直接完结。',
      read: false,
      createdAt: '2026-08-18 11:30:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { orderId: 'WO-20260818-001', stage: '派单', stageId: 'dispatch', path: '/packages/workorder/detail/index' }
    },
    {
      id: 'msg-wx-wos-002',
      type: 'workorder_remind',
      title: '工单流程催办 · 接单',
      content: 'WO-20260818-002 待接单，请尽快处理',
      detail: '工单「15F会议室指示牌松动…」（WO-20260818-002）已派单超过提醒间隔，被指派处理人请尽快接单。',
      read: false,
      createdAt: '2026-08-18 10:10:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { orderId: 'WO-20260818-002', stage: '接单', stageId: 'accept', path: '/packages/workorder/detail/index' }
    },
    {
      id: 'msg-wx-wos-003',
      type: 'workorder_remind',
      title: '工单流程催办 · 处理',
      content: 'WO-20260817-018 处理中，请尽快完工',
      detail: '工单「地下车库入口感应灯不亮」（WO-20260817-018）处理中已超过提醒间隔，实际处理人请尽快提交完工。',
      read: false,
      createdAt: '2026-08-18 09:05:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { orderId: 'WO-20260817-018', stage: '处理', stageId: 'process', path: '/packages/workorder/detail/index' }
    },
    {
      id: 'msg-wx-wos-004',
      type: 'workorder_remind',
      title: '工单流程催办 · 完工',
      content: 'WO-20260816-031 已完结',
      detail: '工单「15F电梯厅异响，请排查。」（WO-20260816-031）已完结。',
      read: true,
      createdAt: '2026-08-17 10:20:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { orderId: 'WO-20260816-031', stage: '验收', stageId: 'evaluate', path: '/packages/workorder/detail/index' }
    }
  ];
}

function ensureWorkorderRemindMessages(list, userId) {
  if (!Array.isArray(list)) return list;
  userId = userId || env.mockUserId || 'lisi';
  var ids = {};
  list.forEach(function (m) { if (m && m.id) ids[m.id] = true; });
  var added = false;
  workorderRemindSeedMessages(userId).forEach(function (msg) {
    if (!ids[msg.id]) {
      list.unshift(msg);
      added = true;
    }
  });
  if (added) saveAll(list);
  return list;
}

function loadAll() {
  var userId = env.mockUserId || 'lisi';
  try {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (raw && Array.isArray(raw)) {
      ensureWorkorderRemindMessages(raw, userId);
      return raw;
    }
    var legacyList = loadLegacyStorageList();
    if (legacyList) {
      ensureWorkorderRemindMessages(legacyList, userId);
      saveAll(legacyList);
      return legacyList;
    }
  } catch (e) { /* ignore */ }
  var seeded = seedMessages();
  saveAll(seeded);
  return seeded;
}

function saveAll(list) {
  wx.setStorageSync(STORAGE_KEY, list);
}

function loadDedupe() {
  try {
    var raw = wx.getStorageSync(DEDUPE_KEY);
    if (raw && typeof raw === 'object') return raw;
  } catch (e) { /* ignore */ }
  return {};
}

function saveDedupe(map) {
  wx.setStorageSync(DEDUPE_KEY, map);
}

function seedMessages() {
  var userId = env.mockUserId || 'lisi';
  return [
    {
      id: 'msg-wx-001',
      type: 'task_remind',
      title: '巡检任务即将开始',
      content: 'B2 机房日检 将于 08:00 开始',
      detail: '计划「B2 机房日检」将于 2026-05-30 08:00 开始，请提前准备巡检工具并确认巡检项。',
      read: false,
      createdAt: '2026-05-30 07:30:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { taskId: 'TK-20260530-100', planName: 'B2 机房日检', scheduled: '2026-05-30 08:00' }
    },
    {
      id: 'msg-wx-002',
      type: 'task_urge',
      title: '巡检任务催办',
      content: 'B2 机房日检 待完成，请尽快处理',
      detail: '系统管理员 向您催办巡检任务「B2 机房日检」（TK-20260530-100），任务开始时间 2026-05-30 08:00，当前状态：待完成。',
      read: false,
      createdAt: '2026-05-30 08:20:00',
      recipientId: userId,
      senderId: 'admin',
      senderName: '系统管理员',
      payload: { taskId: 'TK-20260530-100', planName: 'B2 机房日检', scheduled: '2026-05-30 08:00' }
    },
    {
      id: 'msg-wx-003',
      type: 'task_overdue',
      title: '巡检任务已超时',
      content: 'B2 机房日检 已超过计划完成时间',
      detail: '任务「B2 机房日检」已开始但未完成，请尽快处理。',
      read: true,
      createdAt: '2026-05-29 11:30:00',
      recipientId: userId,
      senderId: 'system',
      senderName: '系统',
      payload: { taskId: 'TK-20260529-204', planName: 'B2 机房日检', scheduled: '2026-05-29 11:00' }
    }
  ].concat(workorderRemindSeedMessages(userId));
}

function listForUser(user) {
  var userId = getUserId(user);
  return loadAll()
    .filter(function (m) { return !m.recipientId || m.recipientId === userId; })
    .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
}

function getUnreadCount(user) {
  return listForUser(user).filter(function (m) { return !m.read; }).length;
}

function getMessage(id) {
  return loadAll().find(function (m) { return m.id === id; }) || null;
}

function markRead(id) {
  var list = loadAll();
  var changed = false;
  list.forEach(function (m) {
    if (m.id === id && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveAll(list);
}

function markAllRead(user) {
  var userId = getUserId(user);
  var list = loadAll();
  var changed = false;
  list.forEach(function (m) {
    if ((!m.recipientId || m.recipientId === userId) && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveAll(list);
}

function addMessage(msg, options) {
  options = options || {};
  var list = loadAll();
  var item = Object.assign({
    id: genId('msg'),
    read: false,
    createdAt: nowStr(),
    senderId: 'system',
    senderName: '系统'
  }, msg);
  list.unshift(item);
  saveAll(list);
  return { item: item, isNew: true };
}

function addOnce(dedupeKey, msg) {
  var dedupe = loadDedupe();
  if (dedupe[dedupeKey]) return null;
  dedupe[dedupeKey] = true;
  saveDedupe(dedupe);
  return addMessage(msg).item;
}

function resolveExecutorIds(taskInfo) {
  taskInfo = taskInfo || {};
  if (Array.isArray(taskInfo.executorIds) && taskInfo.executorIds.length) {
    const seen = {};
    return taskInfo.executorIds.map(function (id) {
      return String(id || '').trim();
    }).filter(function (id) {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }
  if (taskInfo.executorId) return [String(taskInfo.executorId).trim()];
  return [];
}

function pushTaskUrge(taskInfo, senderUser) {
  taskInfo = taskInfo || {};
  senderUser = senderUser || { id: 'admin', name: '系统管理员' };
  const executorIds = resolveExecutorIds(taskInfo);
  if (!executorIds.length) return null;
  var last = null;
  executorIds.forEach(function (executorId) {
    last = addMessage({
      type: 'task_urge',
      title: '巡检任务催办',
      content: (taskInfo.planName || '巡检任务') + ' 待完成，请尽快处理',
      detail: (senderUser.name || '管理员') + ' 向您催办巡检任务「' + (taskInfo.planName || '—') + '」（' +
        (taskInfo.taskId || '—') + '），任务开始时间 ' + (taskInfo.scheduled || '—') + '，当前状态：' +
        (taskInfo.status || '待完成') + '。',
      recipientId: executorId,
      senderId: senderUser.id,
      senderName: senderUser.name,
      payload: {
        taskId: taskInfo.taskId,
        planName: taskInfo.planName,
        scheduled: taskInfo.scheduled
      }
    }).item;
  });
  return last;
}

function pushTaskRemind(taskInfo) {
  taskInfo = taskInfo || {};
  const executorIds = resolveExecutorIds(taskInfo);
  if (!executorIds.length) return null;
  var last = null;
  executorIds.forEach(function (executorId) {
    last = addOnce('remind:' + (taskInfo.taskId || '') + ':' + executorId, {
      type: 'task_remind',
      title: '巡检任务即将开始',
      content: (taskInfo.planName || '巡检任务') + ' 将于 ' + (taskInfo.scheduledShort || taskInfo.scheduled || '') + ' 开始',
      detail: '计划「' + (taskInfo.planName || '—') + '」将于 ' + (taskInfo.scheduled || '—') +
        ' 开始，请提前准备巡检工具并确认巡检项。',
      recipientId: executorId,
      senderId: 'system',
      senderName: '系统',
      payload: {
        taskId: taskInfo.taskId,
        planName: taskInfo.planName,
        scheduled: taskInfo.scheduled
      }
    });
  });
  return last;
}

/** 超时未完成提醒：扇出全部可执行人 */
function pushTaskOverdue(taskInfo) {
  taskInfo = taskInfo || {};
  const executorIds = resolveExecutorIds(taskInfo);
  if (!executorIds.length) return null;
  var last = null;
  executorIds.forEach(function (executorId) {
    last = addOnce('overdue:' + (taskInfo.taskId || '') + ':' + executorId, {
      type: 'task_overdue',
      title: '巡检任务已超时',
      content: (taskInfo.planName || '巡检任务') + ' 已超过计划完成时间',
      detail: '任务「' + (taskInfo.planName || '—') + '」（' + (taskInfo.taskId || '—') +
        '）已于 ' + (taskInfo.scheduled || '—') + ' 开始，当前仍未完成，请尽快处理或申请转派。',
      recipientId: executorId,
      senderId: 'system',
      senderName: '系统',
      payload: {
        taskId: taskInfo.taskId,
        planName: taskInfo.planName,
        scheduled: taskInfo.scheduled
      }
    });
  });
  return last;
}

/** 转派通知：新执行人 + 原执行人 */
function pushTaskReassign(taskInfo, senderUser) {
  taskInfo = taskInfo || {};
  senderUser = senderUser || { id: 'admin', name: '系统管理员' };
  var newId = String(taskInfo.newExecutorId || taskInfo.executorId || '').trim();
  var prevIds = Array.isArray(taskInfo.prevExecutorIds) ? taskInfo.prevExecutorIds : [];
  var seen = {};
  var recipients = [];
  function add(id) {
    id = String(id || '').trim();
    if (!id || seen[id]) return;
    seen[id] = true;
    recipients.push(id);
  }
  add(newId);
  prevIds.forEach(add);
  if (!recipients.length) return null;
  var planName = taskInfo.planName || '巡检任务';
  var taskId = taskInfo.taskId || '—';
  var last = null;
  recipients.forEach(function (recipientId) {
    var isNew = recipientId === newId;
    last = addMessage({
      type: 'task_reassign',
      title: isNew ? '巡检任务已转派给您' : '巡检任务已转派',
      content: isNew
        ? (planName + ' 已转派给您，请继续执行')
        : (planName + ' 已转派给其他执行人'),
      detail: (senderUser.name || '管理员') + (isNew
        ? (' 将巡检任务「' + planName + '」（' + taskId + '）转派给您，请继续执行剩余巡检项。')
        : (' 将巡检任务「' + planName + '」（' + taskId + '）转派，您不再是该任务执行人。')),
      recipientId: recipientId,
      senderId: senderUser.id,
      senderName: senderUser.name,
      payload: {
        taskId: taskInfo.taskId,
        planName: taskInfo.planName,
        scheduled: taskInfo.scheduled,
        newExecutorId: newId,
        prevExecutorIds: prevIds,
        type: 'task_reassign'
      }
    }).item;
  });
  return last;
}

function pushWorkorderRemind(info) {
  info = info || {};
  var recipientIds = Array.isArray(info.recipientIds) && info.recipientIds.length
    ? info.recipientIds.filter(Boolean)
    : (info.recipientId ? [info.recipientId] : [getUserId()]);
  var stage = info.stage || '流程';
  var orderId = info.orderId || '—';
  var contentPreview = info.contentPreview || '';
  var lastItem = null;
  recipientIds.forEach(function (recipientId) {
    lastItem = addOnce('wos-remind:' + orderId + ':' + (info.stageId || stage) + ':' + recipientId, {
      type: 'workorder_remind',
      title: '工单流程催办 · ' + stage,
      content: orderId + ' ' + (info.statusHint || '待处理'),
      detail: '工单「' + (contentPreview || '—') + '」（' + orderId + '）在「' + stage +
        '」环节已超过提醒间隔，请当前责任人尽快处理。',
      recipientId: recipientId,
      senderId: 'system',
      senderName: '系统',
      payload: {
        orderId: orderId,
        stage: stage,
        stageId: info.stageId || '',
        path: '/packages/workorder/detail/index'
      }
    });
  });
  return lastItem;
}

function typeLabel(type) {
  return TYPE_LABELS[type] || '系统消息';
}

function getLatestUnread(user) {
  return listForUser(user).find(function (m) { return !m.read; }) || null;
}

function shouldShowPopup(id) {
  try {
    var shown = wx.getStorageSync(POPUP_KEY) || {};
    return !shown[id];
  } catch (e) {
    return true;
  }
}

function markPopupShown(id) {
  try {
    var shown = wx.getStorageSync(POPUP_KEY) || {};
    shown[id] = true;
    wx.setStorageSync(POPUP_KEY, shown);
  } catch (e) { /* ignore */ }
}

function loadPcIngested() {
  try {
    var raw = wx.getStorageSync(PC_INGESTED_KEY);
    if (raw && typeof raw === 'object') return raw;
  } catch (e) { /* ignore */ }
  return {};
}

function hasIngestedPcMessage(id) {
  if (!id) return false;
  return !!loadPcIngested()[id];
}

function markIngestedPcMessage(id) {
  if (!id) return;
  try {
    var map = loadPcIngested();
    map[id] = true;
    wx.setStorageSync(PC_INGESTED_KEY, map);
  } catch (e) { /* ignore */ }
}

module.exports = {
  TYPE_LABELS: TYPE_LABELS,
  typeLabel: typeLabel,
  listForUser: listForUser,
  getUnreadCount: getUnreadCount,
  getMessage: getMessage,
  markRead: markRead,
  markAllRead: markAllRead,
  addMessage: addMessage,
  pushTaskUrge: pushTaskUrge,
  pushTaskRemind: pushTaskRemind,
  pushTaskOverdue: pushTaskOverdue,
  pushTaskReassign: pushTaskReassign,
  pushWorkorderRemind: pushWorkorderRemind,
  getLatestUnread: getLatestUnread,
  shouldShowPopup: shouldShowPopup,
  markPopupShown: markPopupShown,
  hasIngestedPcMessage: hasIngestedPcMessage,
  markIngestedPcMessage: markIngestedPcMessage
};
