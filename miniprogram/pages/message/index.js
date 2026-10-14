const messageService = require('../../services/message');

Page({
  data: {
    list: [],
    unread: 0,
    filter: 'all'
  },

  onShow() {
    this.loadMessages();
    messageService.syncTabBadge();
  },

  loadMessages() {
    messageService.listMessages().then(function (data) {
      data = data || { list: [], unread: 0 };
      this.applyFilter(data.list || [], data.unread || 0);
    }.bind(this)).catch(function () {
      this.setData({ list: [], unread: 0 });
    }.bind(this));
  },

  applyFilter(allList, unread) {
    var filter = this.data.filter;
    var list = filter === 'unread'
      ? (allList || []).filter(function (item) { return !item.read; })
      : (allList || []);
    this.setData({ list: list, unread: unread, allList: allList || [] });
  },

  onFilterTap(e) {
    var filter = e.currentTarget.dataset.filter;
    if (!filter || filter === this.data.filter) return;
    this.setData({ filter: filter });
    this.applyFilter(this.data.allList || [], this.data.unread);
  },

  onMarkAllRead() {
    messageService.markAllRead().then(function () {
      this.loadMessages();
      wx.showToast({ title: '已全部标为已读', icon: 'success' });
    }.bind(this));
  },

  openDetail(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/message/detail?id=' + id });
  },

  onPullDownRefresh() {
    this.loadMessages();
    wx.stopPullDownRefresh();
  }
});
