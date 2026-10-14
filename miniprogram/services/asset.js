const { request, asList } = require('./request');
const assetMock = require('../mock/asset');

function listInventories(filter, scope, query) {
  return request({
    url: '/asset/inventories',
    data: Object.assign({ filter: filter, scope: scope || 'org' }, query || {}),
    mockHandler: function (data) {
      const q = data || {};
      return assetMock.listInventories(
        q.filter || filter,
        q.scope || scope || 'org',
        q
      );
    }
  });
}

function getInventory(id) {
  return request({
    url: '/asset/inventories/' + id,
    mockHandler: function () {
      return assetMock.getInventory(id);
    }
  });
}

function getInventoryDetail(id) {
  return request({
    url: '/asset/inventories/' + id + '/detail',
    mockHandler: function () {
      return assetMock.getInventoryDetail(id);
    }
  });
}

function getInventoryReport(id, opts) {
  return request({
    url: '/asset/inventories/' + id + '/report',
    data: opts || {},
    mockHandler: function (data) {
      return assetMock.getInventoryReport(id, data || opts || {});
    }
  });
}

function auditInventoryItem(payload) {
  return request({
    url: '/asset/inventories/audit-item',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.auditInventoryItem(data || payload);
    }
  });
}

function submitInventoryResult(payload) {
  return request({
    url: '/asset/inventories/result',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.submitInventoryResult(data || payload);
    }
  });
}

function deleteInventorySurplus(payload) {
  return request({
    url: '/asset/inventories/surplus-delete',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.deleteInventorySurplus(data || payload);
    }
  });
}

function getInventorySurplusOptions() {
  return request({
    url: '/asset/inventories/surplus-options',
    mockHandler: function () {
      return assetMock.getInventorySurplusOptions();
    }
  });
}

function addInventorySurplus(payload) {
  return request({
    url: '/asset/inventories/surplus',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.addInventorySurplus(data || payload);
    }
  });
}

function listAssets(keyword) {
  return request({
    url: '/asset/ledger',
    data: { keyword: keyword },
    mockHandler: function () {
      return assetMock.listAssets(keyword);
    }
  }).then(asList);
}

function getAsset(idOrCode, purpose) {
  return request({
    url: '/asset/ledger/' + encodeURIComponent(idOrCode || ''),
    data: { purpose: purpose || 'view' },
    mockHandler: function () {
      return assetMock.resolveAccessibleAsset(idOrCode, purpose || 'view');
    }
  }).then(function (data) {
    if (data && data.asset && !data.code) return data.asset;
    return data;
  });
}

function resolveScanCode(raw, purpose) {
  return request({
    url: '/asset/resolve-scan',
    method: 'POST',
    data: { code: raw, purpose: purpose || 'view' },
    mockHandler: function () {
      return assetMock.resolveAccessibleAsset(raw, purpose || 'view');
    }
  });
}

function createRepair(payload) {
  return request({
    url: '/asset/repairs',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.createRepair(data || payload);
    }
  });
}

function listRepairs(filter, scope, query) {
  return request({
    url: '/asset/repairs',
    data: Object.assign({ filter: filter, scope: scope || 'org' }, query || {}),
    mockHandler: function (data) {
      const q = data || {};
      return assetMock.listRepairs(
        q.filter || filter,
        q.scope || scope || 'org',
        q
      );
    }
  }).then(asList);
}

function getRepair(id) {
  return request({
    url: '/asset/repairs/' + encodeURIComponent(id || ''),
    mockHandler: function () {
      return assetMock.getRepair(id);
    }
  });
}

function listWorkOrders(filter, scope, query) {
  return request({
    url: '/asset/repair-workorders',
    data: Object.assign({ filter: filter, scope: scope || 'org' }, query || {}),
    mockHandler: function (data) {
      const q = data || {};
      return assetMock.listWorkOrders(
        q.filter || filter,
        q.scope || scope || 'org',
        q
      );
    }
  }).then(asList);
}

function getWorkOrder(id) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || ''),
    mockHandler: function () {
      return assetMock.getWorkOrder(id);
    }
  });
}

function listRepairWorkers(opts) {
  return request({
    url: '/asset/repair-workers',
    data: opts || {},
    mockHandler: function (data) {
      return assetMock.listRepairWorkers(data || opts || {});
    }
  }).then(asList);
}

function approveRepairPass(id, payload) {
  return request({
    url: '/asset/repairs/' + encodeURIComponent(id || '') + '/approve-pass',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.approveRepairPass(id, data || payload);
    }
  });
}

function approveRepairReject(id, payload) {
  return request({
    url: '/asset/repairs/' + encodeURIComponent(id || '') + '/approve-reject',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.approveRepairReject(id, data || payload);
    }
  });
}

function withdrawRepair(id) {
  return request({
    url: '/asset/repairs/' + encodeURIComponent(id || '') + '/withdraw',
    method: 'POST',
    mockHandler: function () {
      return assetMock.withdrawRepair(id);
    }
  });
}

function deleteRepair(id) {
  return request({
    url: '/asset/repairs/' + encodeURIComponent(id || ''),
    method: 'DELETE',
    mockHandler: function () {
      return assetMock.deleteRepair(id);
    }
  });
}

function acceptWorkOrder(id) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || '') + '/accept',
    method: 'POST',
    mockHandler: function () {
      return assetMock.acceptWorkOrder(id);
    }
  });
}

function transferWorkOrder(id, payload) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || '') + '/transfer',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.transferWorkOrder(id, data || payload);
    }
  });
}

function voidWorkOrder(id, payload) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || '') + '/void',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.voidWorkOrder(id, data || payload);
    }
  });
}

function finishWorkOrder(id, payload) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || '') + '/finish',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.finishWorkOrder(id, data || payload);
    }
  });
}

function acceptWorkOrderResult(id, payload) {
  return request({
    url: '/asset/repair-workorders/' + encodeURIComponent(id || '') + '/acceptance',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return assetMock.acceptWorkOrderResult(id, data || payload);
    }
  });
}

module.exports = {
  listInventories: listInventories,
  getInventory: getInventory,
  getInventoryDetail: getInventoryDetail,
  getInventoryReport: getInventoryReport,
  auditInventoryItem: auditInventoryItem,
  submitInventoryResult: submitInventoryResult,
  deleteInventorySurplus: deleteInventorySurplus,
  getInventorySurplusOptions: getInventorySurplusOptions,
  addInventorySurplus: addInventorySurplus,
  listAssets: listAssets,
  getAsset: getAsset,
  resolveScanCode: resolveScanCode,
  createRepair: createRepair,
  listRepairs: listRepairs,
  getRepair: getRepair,
  listWorkOrders: listWorkOrders,
  getWorkOrder: getWorkOrder,
  listRepairWorkers: listRepairWorkers,
  approveRepairPass: approveRepairPass,
  approveRepairReject: approveRepairReject,
  withdrawRepair: withdrawRepair,
  deleteRepair: deleteRepair,
  acceptWorkOrder: acceptWorkOrder,
  transferWorkOrder: transferWorkOrder,
  voidWorkOrder: voidWorkOrder,
  finishWorkOrder: finishWorkOrder,
  acceptWorkOrderResult: acceptWorkOrderResult
};
