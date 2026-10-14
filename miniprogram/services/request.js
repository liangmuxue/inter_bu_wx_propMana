const env = require('../config/env');
const session = require('../store/session');

function isSuccessCode(code) {
  return code === 200 || code === 0 || code === '200' || code === '0';
}

function toQuery(data) {
  if (!data || typeof data !== 'object') return '';
  const parts = [];
  Object.keys(data).forEach(function (key) {
    const value = data[key];
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'object') {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(value)));
    } else {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });
  return parts.join('&');
}

function failMessage(res) {
  const body = res && res.data;
  return (body && (body.msg || body.message)) || '请求失败';
}

function request(options) {
  const { url, method = 'GET', data, mockHandler, header } = options;
  if (env.useMock && mockHandler) {
    return Promise.resolve(mockHandler(data));
  }
  const prefix = env.apiPrefix || '';
  let fullUrl = (env.apiBaseUrl || '') + prefix + url;
  const verb = String(method || 'GET').toUpperCase();
  let payload = data;
  if (verb === 'GET' && data && typeof data === 'object') {
    const qs = toQuery(data);
    if (qs) fullUrl += (fullUrl.indexOf('?') >= 0 ? '&' : '?') + qs;
    payload = undefined;
  }
  return new Promise(function (resolve, reject) {
    wx.request({
      url: fullUrl,
      method: verb,
      data: payload,
      header: Object.assign({
        'Content-Type': 'application/json',
        Authorization: session.getToken() ? 'Bearer ' + session.getToken() : ''
      }, header || {}),
      success(res) {
        const body = res.data || {};
        const code = body.code;
        if (res.statusCode === 401 || code === 401) {
          session.clear();
          wx.reLaunch({ url: '/pages/login/index' });
          reject(new Error('未登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && isSuccessCode(code)) {
          if (Object.prototype.hasOwnProperty.call(body, 'data')) {
            resolve(body.data);
          } else {
            resolve(body);
          }
          return;
        }
        reject(new Error(failMessage(res)));
      },
      fail: function (err) {
        reject(new Error((err && err.errMsg) || '网络异常'));
      }
    });
  });
}

module.exports = { request, asList };

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  return [];
}
