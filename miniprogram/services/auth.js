const { request } = require('./request');
const session = require('../store/session');

function login(username, password) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data: { username: username, password: password }
  }).then(function (res) {
    const token = res && (res.token || res.access_token);
    const user = res && res.user;
    if (!token || !user) {
      throw new Error((res && res.msg) || '登录失败');
    }
    session.setSession(token, user);
    return user;
  });
}

function fetchMe() {
  return request({ url: '/auth/me' }).then(function (user) {
    if (user) {
      session.setSession(session.getToken(), user);
    }
    return user;
  });
}

function changePassword(oldPassword, newPassword) {
  return request({
    url: '/auth/password',
    method: 'POST',
    data: { oldPassword: oldPassword, newPassword: newPassword }
  });
}

function logout() {
  session.clear();
}

module.exports = {
  login: login,
  fetchMe: fetchMe,
  changePassword: changePassword,
  logout: logout
};
