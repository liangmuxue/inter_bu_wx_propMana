const messageService = require('../../services/message');

Page({
  data: {
    loading: true,
    message: null
  },

  onLoad(options) {
    this.msgId = options.id || '';
  },

  onShow() {
    if (!this.msgId) {
      this.setData({ loading: false, message: null });
      return;
    }
    messageService.getMessage(this.msgId).then(function (msg) {
      this.setData({ loading: false, message: msg });
      if (msg && !msg.read) {
        messageService.markRead(msg.id);
      }
    }.bind(this)).catch(function () {
      this.setData({ loading: false, message: null });
    }.bind(this));
  },

  goTask() {
    var taskId = this.data.message && this.data.message.payload
      ? this.data.message.payload.taskId
      : '';
    if (!taskId) return;
    wx.navigateTo({ url: '/packages/patrol/task-detail/index?taskId=' + taskId });
  },

  goWorkorder() {
    var orderId = this.data.message && this.data.message.payload
      ? this.data.message.payload.orderId
      : '';
    if (!orderId) return;
    wx.navigateTo({ url: '/packages/workorder/detail/index?id=' + encodeURIComponent(orderId) });
  }
});
