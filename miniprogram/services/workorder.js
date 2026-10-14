const { request, asList } = require('./request');
const workorderMock = require('../mock/workorder');

function listWorkOrders(tab, status, query) {
  return request({
    url: '/workorder/list',
    data: Object.assign({ tab: tab, status: status }, query || {}),
    mockHandler: function (data) {
      const q = data || {};
      return workorderMock.listWorkOrders(q.tab, q.status, q.query || query);
    }
  }).then(asList);
}

function getWorkOrder(id) {
  return request({
    url: '/workorder/' + id,
    mockHandler: function () {
      return workorderMock.getWorkOrder(id);
    }
  });
}

function updateWorkOrderCategory(id, payload) {
  return request({
    url: '/workorder/' + id + '/category',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return workorderMock.updateWorkOrderCategory(id, data || payload);
    }
  });
}

function dispatchWorkOrder(id, payload) {
  return request({
    url: '/workorder/' + id + '/dispatch',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return workorderMock.dispatchWorkOrder(id, data || payload);
    }
  });
}

function transferWorkOrder(id, payload) {
  return request({
    url: '/workorder/' + id + '/transfer',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return workorderMock.transferWorkOrder(id, data || payload);
    }
  });
}

function acceptWorkOrder(id) {
  return request({
    url: '/workorder/' + id + '/accept',
    method: 'POST',
    mockHandler: function () {
      return workorderMock.acceptWorkOrder(id);
    }
  });
}

function finishWorkOrder(id, payload) {
  return request({
    url: '/workorder/' + id + '/finish',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return workorderMock.finishWorkOrder(id, data || payload);
    }
  });
}

function directCloseWorkOrder(id, payload) {
  return request({
    url: '/workorder/' + id + '/direct-close',
    method: 'POST',
    data: payload,
    mockHandler: function (data) {
      return workorderMock.directCloseWorkOrder(id, data || payload);
    }
  });
}

function listRegionHandlers(regionId) {
  return request({
    url: '/workorder/handlers',
    data: { regionId: regionId },
    mockHandler: function (data) {
      return workorderMock.listRegionHandlers((data && data.regionId) || regionId);
    }
  }).then(asList);
}

function listWorkOrderCategories() {
  return request({
    url: '/workorder/categories',
    mockHandler: function () {
      return workorderMock.listWorkOrderCategories();
    }
  }).then(asList);
}

module.exports = {
  listWorkOrders: listWorkOrders,
  getWorkOrder: getWorkOrder,
  updateWorkOrderCategory: updateWorkOrderCategory,
  dispatchWorkOrder: dispatchWorkOrder,
  transferWorkOrder: transferWorkOrder,
  acceptWorkOrder: acceptWorkOrder,
  finishWorkOrder: finishWorkOrder,
  directCloseWorkOrder: directCloseWorkOrder,
  listRegionHandlers: listRegionHandlers,
  listWorkOrderCategories: listWorkOrderCategories
};
