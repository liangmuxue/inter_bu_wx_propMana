const { request, asList } = require('./request');
const visitorMock = require('../mock/visitor');

function listVisitorPass(query) {
  return request({
    url: '/visitor/pass/list',
    data: query || {},
    mockHandler: function (data) {
      return visitorMock.listVisitorPass(data || query || {});
    }
  }).then(asList);
}

function listAppointments(query) {
  return request({
    url: '/visitor/appointment/list',
    data: query || {},
    mockHandler: function (data) {
      return visitorMock.listAppointments(data || query || {});
    }
  }).then(asList);
}

function listInvites(query) {
  return request({
    url: '/visitor/invite/list',
    data: query || {},
    mockHandler: function (data) {
      return visitorMock.listInvites(data || query || {});
    }
  }).then(asList);
}

function listAccessibleOrgs() {
  return request({
    url: '/visitor/orgs',
    mockHandler: function () {
      return visitorMock.listAccessibleOrgs();
    }
  }).then(asList);
}

function listPermissionGroups(query) {
  return request({
    url: '/visitor/permission-groups',
    data: query || {},
    mockHandler: function () {
      return visitorMock.listPermissionGroups ? visitorMock.listPermissionGroups() : [];
    }
  }).then(asList);
}

function createInvite(payload) {
  return request({
    url: '/visitor/invite/create',
    method: 'POST',
    data: payload || {},
    mockHandler: function (data) {
      return visitorMock.createInvite(data || payload || {});
    }
  });
}

function decideAppointment(payload) {
  return request({
    url: '/visitor/appointment/decide',
    method: 'POST',
    data: payload || {},
    mockHandler: function (data) {
      return visitorMock.decideAppointment(data || payload || {});
    }
  });
}

function voidVisitorPass(payload) {
  return request({
    url: '/visitor/pass/void',
    method: 'POST',
    data: payload || {},
    mockHandler: function (data) {
      return visitorMock.voidVisitorPass(data || payload || {});
    }
  });
}

function listPassage(query) {
  return request({
    url: '/visitor/passage/list',
    data: query || {},
    mockHandler: function (data) {
      return visitorMock.listPassage(data || query || {});
    }
  }).then(asList);
}

function getPassage(id) {
  return request({
    url: '/visitor/passage/' + encodeURIComponent(id || ''),
    data: { id: id },
    mockHandler: function () {
      return visitorMock.getPassage(id);
    }
  });
}

function getVisit(id, opts) {
  return request({
    url: '/visitor/pass/' + encodeURIComponent(id || ''),
    data: Object.assign({ id: id }, opts || {}),
    mockHandler: function (data) {
      return visitorMock.getVisit(id, data || opts || {});
    }
  });
}

function lookupPassCode(code) {
  return request({
    url: '/visitor/security/lookup',
    data: { code: code },
    mockHandler: function (data) {
      return visitorMock.lookupPassCode((data && data.code) || code);
    }
  });
}

function resolveScan(payload) {
  return request({
    url: '/visitor/security/scan',
    method: 'POST',
    data: payload || {},
    mockHandler: function (data) {
      return visitorMock.resolveScan(data || payload || {});
    }
  });
}

function confirmPresence(payload) {
  return request({
    url: '/visitor/security/presence',
    method: 'POST',
    data: payload || {},
    mockHandler: function (data) {
      return visitorMock.confirmPresence(data || payload || {});
    }
  });
}

function getDemoScanChoices() {
  return visitorMock.getDemoScanChoices();
}

function normalizePassCode(raw) {
  return visitorMock.normalizePassCode(raw);
}

module.exports = {
  listVisitorPass: listVisitorPass,
  listAppointments: listAppointments,
  listInvites: listInvites,
  listAccessibleOrgs: listAccessibleOrgs,
  listPermissionGroups: listPermissionGroups,
  createInvite: createInvite,
  decideAppointment: decideAppointment,
  voidVisitorPass: voidVisitorPass,
  listPassage: listPassage,
  getPassage: getPassage,
  getVisit: getVisit,
  lookupPassCode: lookupPassCode,
  resolveScan: resolveScan,
  confirmPresence: confirmPresence,
  getDemoScanChoices: getDemoScanChoices,
  normalizePassCode: normalizePassCode,
  /** 兼容 */
  listTodayPending: listVisitorPass,
  listRecords: listPassage,
  verifyAndCheckIn: resolveScan
};
