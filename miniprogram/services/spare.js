const { request, asList } = require('./request');
const spareMock = require('../mock/spare');

function listUsages(filter, scope, query) {
  return request({
    url: '/spare/usages',
    data: Object.assign({ filter: filter, scope: scope || 'org' }, query || {}),
    mockHandler: function (data) {
      const q = data || {};
      return spareMock.listUsages(
        q.filter || filter,
        q.scope || scope || 'org',
        q
      );
    }
  }).then(asList);
}

function getUsage(id) {
  return request({
    url: '/spare/usages/' + id,
    mockHandler: function () {
      return spareMock.getUsage(id);
    }
  });
}

function getSpare(idOrCode) {
  return request({
    url: '/spare/materials/' + encodeURIComponent(idOrCode || ''),
    mockHandler: function () {
      return spareMock.getSpare(idOrCode);
    }
  });
}

function listSelectableSpares() {
  return request({
    url: '/spare/materials',
    mockHandler: function () {
      return spareMock.listSelectableSpares();
    }
  }).then(asList);
}

function getApplyOptions() {
  return request({
    url: '/spare/apply-options',
    mockHandler: function () {
      return {
        spares: spareMock.listSelectableSpares(),
        orgs: spareMock.getOrgOptionsForApply(),
        regions: spareMock.getRegionOptionsForApply(),
        canAdd: spareMock.canAddUsage()
      };
    }
  });
}

function submitUsage(payload) {
  return request({
    url: '/spare/usages',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return spareMock.submitUsage(data || payload);
    }
  });
}

function auditUsage(id, payload) {
  return request({
    url: '/spare/usages/' + id + '/audit',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return spareMock.auditUsage(id, data || payload);
    }
  });
}

function canAddUsage() {
  const env = require('../config/env');
  if (env.useMock) {
    return Promise.resolve(spareMock.canAddUsage());
  }
  return request({ url: '/spare/can-add' }).then(function (data) {
    return !!data;
  }).catch(function () {
    return false;
  });
}

module.exports = {
  listUsages: listUsages,
  getUsage: getUsage,
  getSpare: getSpare,
  listSelectableSpares: listSelectableSpares,
  getApplyOptions: getApplyOptions,
  submitUsage: submitUsage,
  auditUsage: auditUsage,
  canAddUsage: canAddUsage
};
