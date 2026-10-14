/** 与 PC 端修改密码表单一致的密码规则 */
const MIN_LENGTH = 8;
const PLACEHOLDER = '8位以上，含大小写与数字';
const FORMAT_MESSAGE = '新密码须8位以上，含大小写与数字';

function validateNewPassword(password) {
  const pwd = password || '';
  if (pwd.length < MIN_LENGTH) {
    return { ok: false, message: '新密码至少 8 位' };
  }
  if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return { ok: false, message: FORMAT_MESSAGE };
  }
  return { ok: true };
}

module.exports = {
  MIN_LENGTH,
  PLACEHOLDER,
  FORMAT_MESSAGE,
  validateNewPassword
};
