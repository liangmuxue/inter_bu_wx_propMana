var LOCAL_BASE_URL = 'http://localhost:8080';
var PUBLISH_BASE_URL = 'http://jizhi-pay.ss-cas.com:8211';

/** develop=开发者工具与预览；trial=体验版；release=正式版 */
function isLocalDebug() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion === 'develop';
  } catch (e) {
    return true;
  }
}

module.exports = {
  /** 联调真实后端时设为 false；本地无后端时可改回 true 走原型 Mock */
  useMock: false,
  /** 本地调试走本机，上传后的体验版和正式版走服务器 */
  apiBaseUrl: isLocalDebug() ? LOCAL_BASE_URL : PUBLISH_BASE_URL,
  apiPrefix: '/mini/ops',
  /** 仅 useMock=true 时生效 */
  mockUserId: 'lisi'
};
