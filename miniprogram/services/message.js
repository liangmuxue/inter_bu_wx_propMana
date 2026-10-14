const session = require('../store/session');
const { request } = require('./request');
const messageStore = require('../utils/message-store');

function getPatrolMock() {
  return require('../mock/patrol');
}

function getCurrentUser() {
  return session.getUser() || { id: require('../config/env').mockUserId };
}

function applyUnreadBadge(n) {
  n = Number(n) || 0;
  try {
    if (n > 0) {
      wx.setTabBarBadge({ index: 2, text: n > 99 ? '99+' : String(n) });
    } else {
      wx.removeTabBarBadge({ index: 2 });
    }
  } catch (e) { /* ignore */ }
}

function syncTabBadge() {
  const env = require('../config/env');
  if (!env.useMock) {
    return request({
      url: '/messages',
      mockHandler: function () {
        return { list: [], unread: 0 };
      }
    }).then(function (data) {
      applyUnreadBadge(data && data.unread);
      return data;
    }).catch(function () {
      applyUnreadBadge(0);
    });
  }
  applyUnreadBadge(messageStore.getUnreadCount(getCurrentUser()));
}

function decorateList(list) {
  return (list || []).map(function (item) {
    return Object.assign({}, item, {
      typeLabel: messageStore.typeLabel(item.type)
    });
  });
}

module.exports = {
  listMessages() {
    return request({
      url: '/messages',
      mockHandler: function () {
        var user = getCurrentUser();
        var list = messageStore.listForUser(user);
        return {
          list: decorateList(list),
          unread: messageStore.getUnreadCount(user)
        };
      }
    }).then(function (data) {
      data = data || { list: [], unread: 0 };
      data.list = decorateList(data.list);
      syncTabBadge();
      return data;
    });
  },

  getMessage(id) {
    return request({
      url: '/messages/' + id,
      mockHandler: function () {
        var msg = messageStore.getMessage(id);
        if (!msg) return null;
        return Object.assign({}, msg, { typeLabel: messageStore.typeLabel(msg.type) });
      }
    });
  },

  markRead(id) {
    return request({
      url: '/messages/' + id + '/read',
      method: 'POST',
      mockHandler: function () {
        messageStore.markRead(id);
        syncTabBadge();
        return { ok: true };
      }
    });
  },

  markAllRead() {
    return request({
      url: '/messages/read-all',
      method: 'POST',
      mockHandler: function () {
        messageStore.markAllRead(getCurrentUser());
        syncTabBadge();
        return { ok: true };
      }
    });
  },

  syncTabBadge: syncTabBadge,

  checkNewMessagePopup() {
    const env = require('../config/env');
    if (!env.useMock) {
      return request({ url: '/messages/popup' }).catch(function () { return null; });
    }
    var user = getCurrentUser();
    var latest = messageStore.getLatestUnread(user);
    if (!latest || !messageStore.shouldShowPopup(latest.id)) return Promise.resolve(null);
    messageStore.markPopupShown(latest.id);
    return Promise.resolve(latest);
  },

  pushTaskUrge(taskInfo, senderUser) {
    messageStore.pushTaskUrge(taskInfo, senderUser);
    syncTabBadge();
  },

  pushTaskOverdue(taskInfo) {
    messageStore.pushTaskOverdue(taskInfo);
    syncTabBadge();
  },

  pushTaskReassign(taskInfo, senderUser) {
    messageStore.pushTaskReassign(taskInfo, senderUser);
    syncTabBadge();
  },

  /** PC 转派桥接：写入小程序本地补丁并立即应用 */
  applyTaskReassignPatch(patch) {
    getPatrolMock().enqueueTaskReassignPatch(patch || {});
  },

  /**
   * 注入 PC 侧消息（含转派时同步任务补丁）
   * 同一 id 只入库一次，避免启动重复拉取
   */
  ingestPcMessage(msg) {
    if (!msg) return false;
    var id = msg.id || '';
    if (id && messageStore.hasIngestedPcMessage && messageStore.hasIngestedPcMessage(id)) {
      return false;
    }
    if (id && messageStore.markIngestedPcMessage) {
      messageStore.markIngestedPcMessage(id);
    }
    messageStore.addMessage(msg);
    var payload = msg.payload || {};
    if (msg.type === 'task_reassign' || payload.type === 'task_reassign') {
      getPatrolMock().enqueueTaskReassignPatch({
        type: 'task_reassign',
        taskId: payload.taskId,
        executorId: payload.newExecutorId || payload.executorId,
        executorIds: payload.newExecutorId ? [payload.newExecutorId] : payload.executorIds,
        reassignedFrom: payload.prevExecutorIds || [],
        at: msg.createdAt
      });
    }
    syncTabBadge();
    return true;
  },

  /** 启动/回前台：拉取 PC 桥接队列（localStorage / 打包 JSON / wx 缓存） */
  ingestPendingPcMessages() {
    var PC_MSG_KEY = 'patrol_wxapp_pc_messages_v1';
    var list = [];

    function merge(arr) {
      (arr || []).forEach(function (m) {
        if (!m) return;
        list.push(m);
      });
    }

    try {
      var bundled = require('../mock/patrol-pc-messages.json');
      if (Array.isArray(bundled)) merge(bundled);
    } catch (e0) { /* ignore */ }

    try {
      var raw = wx.getStorageSync(PC_MSG_KEY);
      if (raw && typeof raw === 'string') raw = JSON.parse(raw);
      if (Array.isArray(raw)) merge(raw);
    } catch (e1) { /* ignore */ }

    try {
      if (typeof localStorage !== 'undefined') {
        var pcRaw = localStorage.getItem(PC_MSG_KEY);
        if (pcRaw) {
          var pcList = JSON.parse(pcRaw);
          if (Array.isArray(pcList)) merge(pcList);
        }
      }
    } catch (e2) { /* ignore */ }

    try {
      if (typeof window !== 'undefined' && Array.isArray(window.__PATROL_LATEST_PC_MESSAGES__)) {
        merge(window.__PATROL_LATEST_PC_MESSAGES__);
      }
    } catch (e3) { /* ignore */ }

    var seen = {};
    var unique = [];
    list.forEach(function (m) {
      var key = m.id || (String(m.type || '') + ':' + String((m.payload && m.payload.taskId) || '') + ':' + String(m.createdAt || '') + ':' + String(m.recipientId || ''));
      if (seen[key]) return;
      seen[key] = true;
      unique.push(m);
    });

    var n = 0;
    var self = this;
    unique.forEach(function (msg) {
      if (self.ingestPcMessage(msg)) n += 1;
    });

    // 同步规则参数桥（若 PC 已写入）
    try {
      var remoteRules = require('../utils/patrol-remote-rules');
      var rulesRaw = null;
      try {
        rulesRaw = wx.getStorageSync(remoteRules.RULES_STORAGE_KEY);
      } catch (e4) { /* ignore */ }
      if (!rulesRaw && typeof localStorage !== 'undefined') {
        var r = localStorage.getItem(remoteRules.RULES_STORAGE_KEY);
        if (r) rulesRaw = JSON.parse(r);
      }
      if (rulesRaw && typeof rulesRaw === 'object') {
        remoteRules.ingestPatrolRuleParams(rulesRaw);
      }
    } catch (e5) { /* ignore */ }

    if (n > 0) syncTabBadge();
    return n;
  }
};
