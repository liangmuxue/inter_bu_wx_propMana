const passwordUtil = require('../../utils/password');
const auth = require('../../services/auth');

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    submitting: false,
    newPasswordPlaceholder: passwordUtil.PLACEHOLDER
  },

  onOldInput(e) {
    this.setData({ oldPassword: e.detail.value });
  },

  onNewInput(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onConfirmInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  submit() {
    const oldPassword = (this.data.oldPassword || '').trim();
    const newPassword = (this.data.newPassword || '').trim();
    const confirmPassword = (this.data.confirmPassword || '').trim();

    if (!oldPassword) {
      wx.showToast({ title: '请输入原密码', icon: 'none' });
      return;
    }
    const pwdCheck = passwordUtil.validateNewPassword(newPassword);
    if (!pwdCheck.ok) {
      wx.showToast({ title: pwdCheck.message, icon: 'none' });
      return;
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
      return;
    }
    if (oldPassword === newPassword) {
      wx.showToast({ title: '新密码不能与原密码相同', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    auth.changePassword(oldPassword, newPassword).then(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '密码修改成功', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack();
      }, 800);
    }.bind(this)).catch(function (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '修改失败', icon: 'none' });
    }.bind(this));
  }
});
