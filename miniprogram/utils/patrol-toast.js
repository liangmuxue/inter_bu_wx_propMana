/** 巡检模块 Toast：success/loading 图标下 title 最多约 7 个汉字，超长自动改用 none */
const SUCCESS_ICON_MAX_LEN = 7;

function showToast(title, options) {
  options = options || {};
  title = String(title || '').trim();
  if (!title) return;

  let icon = options.icon;
  if (icon == null) {
    icon = title.length <= SUCCESS_ICON_MAX_LEN ? 'success' : 'none';
  }
  if ((icon === 'success' || icon === 'loading') && title.length > SUCCESS_ICON_MAX_LEN) {
    icon = 'none';
  }

  const duration = options.duration != null
    ? options.duration
    : (icon === 'none' && title.length > SUCCESS_ICON_MAX_LEN ? 2500 : 1500);

  wx.showToast({
    title: title,
    icon: icon,
    duration: duration,
    mask: !!options.mask
  });
}

function showSuccess(title, options) {
  showToast(title, Object.assign({ icon: 'success' }, options || {}));
}

function showError(title, options) {
  showToast(title, Object.assign({ icon: 'none', duration: 2000 }, options || {}));
}

module.exports = {
  showToast: showToast,
  showSuccess: showSuccess,
  showError: showError,
  SUCCESS_ICON_MAX_LEN: SUCCESS_ICON_MAX_LEN
};
