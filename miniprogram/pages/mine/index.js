const session = require('../../store/session');
const userDisplay = require('../../utils/user-display');
const env = require('../../config/env');
const mockDemoFlags = require('../../utils/mock-demo-flags');

Page({
  data: {
    user: null,
    showMockTools: false,
    denyAllModules: false
  },

  onShow() {
    this.setData({
      user: userDisplay.normalizeUser(session.getUser()),
      showMockTools: !!env.useMock,
      denyAllModules: env.useMock ? mockDemoFlags.isDenyAllModules() : false
    });
  },

  goChangePassword() {
    wx.navigateTo({ url: '/pages/mine/change-password' });
  },

  toggleDenyAllModules() {
    if (!env.useMock) return;
    const next = !mockDemoFlags.isDenyAllModules();
    mockDemoFlags.setDenyAllModules(next);
    this.setData({ denyAllModules: next });
    wx.showToast({
      title: next ? '已开启：模拟所有模块无权限' : '已关闭：已恢复模块权限',
      icon: 'none',
      duration: 3500
    });
  },

  logout() {
    mockDemoFlags.clear();
    session.clear();
    wx.reLaunch({ url: '/pages/login/index' });
  }
});
