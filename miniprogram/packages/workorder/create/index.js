const pageAccess = require('../../../utils/page-access');

Page({
  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    wx.showModal({
      title: '不可创建工单',
      content: '物业端仅支持查看与处理区域权限内工单，报事请使用员工端小程序发起。',
      showCancel: false,
      success: function () {
        wx.redirectTo({ url: '/packages/workorder/list/index' });
      }
    });
  }
});
