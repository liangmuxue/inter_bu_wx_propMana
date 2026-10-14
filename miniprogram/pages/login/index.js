const session = require('../../store/session');
const auth = require('../../services/auth');

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onLoad() {
    if (session.getToken()) {
      wx.switchTab({ url: '/pages/workbench/index' });
    }
  },

  onUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onLogin() {
    const username = (this.data.username || '').trim();
    const password = this.data.password || '';
    if (!username) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    auth.login(username, password).then(function () {
      this.setData({ loading: false });
      wx.switchTab({ url: '/pages/workbench/index' });
    }.bind(this)).catch(function (err) {
      this.setData({ loading: false });
      wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
    }.bind(this));
  }
});
