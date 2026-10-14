const pageAccess = require('../../../utils/page-access');

Page({
  onShow() {
    pageAccess.ensureCurrentPageAccess();
  }
});
