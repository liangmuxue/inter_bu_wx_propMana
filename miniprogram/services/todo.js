const { request } = require('./request');
const todoMock = require('../mock/todo');

function getTodoSections() {
  return request({
    url: '/todo/sections',
    mockHandler: function () {
      return todoMock.getTodoSections();
    }
  });
}

function syncTabBadge() {
  return getTodoSections().then(function (res) {
    const n = (res && res.totalCount) || 0;
    try {
      if (n > 0) {
        wx.setTabBarBadge({ index: 1, text: n > 99 ? '99+' : String(n) });
      } else {
        wx.removeTabBarBadge({ index: 1 });
      }
    } catch (e) { /* ignore */ }
    return res;
  }).catch(function () {
    try {
      wx.removeTabBarBadge({ index: 1 });
    } catch (e2) { /* ignore */ }
    return { sections: [], totalCount: 0 };
  });
}

module.exports = {
  getTodoSections: getTodoSections,
  syncTabBadge: syncTabBadge
};
