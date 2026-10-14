const session = require('./store/session');
const env = require('./config/env');

var patrolRuntimeTimer = null;

function runPatrolJobsSafe() {
  if (!env.useMock) return;
  try {
    const messageService = require('./services/message');
    if (typeof messageService.ingestPendingPcMessages === 'function') {
      messageService.ingestPendingPcMessages();
    }
  } catch (e0) { /* ignore */ }
  try {
    const patrolMock = require('./mock/patrol');
    if (typeof patrolMock.runPatrolRuntimeJobs === 'function') {
      patrolMock.runPatrolRuntimeJobs();
    } else if (typeof patrolMock.simulateOverdueNotifications === 'function') {
      patrolMock.applyPendingTaskPatches();
      patrolMock.simulateOverdueNotifications();
    }
  } catch (e) { /* ignore */ }
}

function startPatrolRuntimeTimer() {
  if (patrolRuntimeTimer || !env.useMock) return;
  patrolRuntimeTimer = setInterval(function () {
    if (!session.getToken()) return;
    runPatrolJobsSafe();
  }, 60 * 1000);
}

function scheduleBackgroundJobs() {
  setTimeout(function () {
    try {
      runPatrolJobsSafe();
      startPatrolRuntimeTimer();
    } catch (e0) { /* ignore */ }
    try {
      const messageService = require('./services/message');
      messageService.syncTabBadge();
    } catch (e1) { /* ignore */ }
    try {
      const todoService = require('./services/todo');
      todoService.syncTabBadge();
    } catch (e2) { /* ignore */ }
  }, 0);
}

App({
  globalData: {
    version: '1.0.0'
  },

  onLaunch() {
    session.restore();
    this.checkLogin();
    scheduleBackgroundJobs();
  },

  onShow() {
    if (!session.getToken()) return;
    scheduleBackgroundJobs();
    this.showLatestMessagePopup();
  },

  showLatestMessagePopup() {
    try {
      const messageService = require('./services/message');
      messageService.checkNewMessagePopup().then(function (msg) {
        if (!msg) return;
        wx.showModal({
          title: msg.title || '新消息',
          content: msg.content || '',
          confirmText: '查看',
          cancelText: '稍后',
          success: function (res) {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/message/detail?id=' + msg.id });
            }
          }
        });
      });
    } catch (e) { /* ignore */ }
  },

  checkLogin() {
    if (!session.getToken()) {
      const pages = getCurrentPages();
      const route = pages.length ? pages[pages.length - 1].route : '';
      if (route !== 'pages/login/index') {
        wx.reLaunch({ url: '/pages/login/index' });
      }
    }
  }
});
