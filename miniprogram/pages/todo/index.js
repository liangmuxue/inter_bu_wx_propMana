const todoService = require('../../services/todo');
const todoNav = require('../../utils/todo-nav');
const env = require('../../config/env');
const session = require('../../store/session');
const userDisplay = require('../../utils/user-display');

Page({
  data: {
    sections: [],
    totalCount: 0,
    loading: true
  },

  onShow() {
    if (!session.getToken() && env.useMock) {
      const profile = userDisplay.getMockUser(env.mockUserId) || userDisplay.getMockUser('lisi');
      session.setSession('mock-token', profile);
    }
    if (!session.getToken() && !env.useMock) {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    this.loadSections();
  },

  loadSections() {
    this.setData({ loading: true });
    todoService.getTodoSections().then(function (res) {
      const sections = (res && res.sections) || [];
      this.setData({
        sections: sections,
        totalCount: (res && res.totalCount) || 0,
        loading: false
      });
      todoService.syncTabBadge();
    }.bind(this)).catch(function () {
      this.setData({ sections: [], totalCount: 0, loading: false });
    }.bind(this));
  },

  onSectionLink(e) {
    const sectionId = e.currentTarget.dataset.section;
    if (!sectionId) return;
    todoNav.openSectionLink(sectionId);
  },

  onStatTap(e) {
    const sectionId = e.currentTarget.dataset.section;
    const itemKey = e.currentTarget.dataset.key;
    if (!sectionId || !itemKey) return;
    todoNav.openStat(sectionId, itemKey);
  },

  onPullDownRefresh() {
    this.loadSections();
    wx.stopPullDownRefresh();
  }
});
