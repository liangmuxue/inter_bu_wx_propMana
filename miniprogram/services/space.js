const { request, asList } = require('./request');
const spaceMock = require('../mock/space');

function listBoardRooms(query) {
  return request({
    url: '/space/board/rooms',
    data: query || {},
    mockHandler: function (data) {
      return spaceMock.listBoardRooms(data || query || {});
    }
  }).then(asList);
}

function listBoardMeta(query) {
  return request({
    url: '/space/board/meta',
    data: query || {},
    mockHandler: function (data) {
      return spaceMock.listBoardMeta(data || query || {});
    }
  });
}

function listRecords(query) {
  return request({
    url: '/space/records/list',
    data: query || {},
    mockHandler: function (data) {
      return spaceMock.listRecords(data || query || {});
    }
  }).then(asList);
}

function getBooking(id) {
  return request({
    url: '/space/records/' + encodeURIComponent(id || ''),
    data: { id: id },
    mockHandler: function () {
      return spaceMock.getBooking(id);
    }
  });
}

function listFeeStats(query) {
  return request({
    url: '/space/fee-stats',
    data: query || {},
    mockHandler: function (data) {
      return spaceMock.listFeeStats(data || query || {});
    }
  });
}

function getRoomDetail(query) {
  query = query || {};
  return request({
    url: '/space/rooms/' + encodeURIComponent(query.id || ''),
    data: query,
    mockHandler: function (data) {
      const q = data || query || {};
      return spaceMock.getRoomDetail(q.id, q.date);
    }
  });
}

module.exports = {
  listBoardRooms: listBoardRooms,
  listBoardMeta: listBoardMeta,
  listRecords: listRecords,
  listFeeStats: listFeeStats,
  getBooking: getBooking,
  getRoomDetail: getRoomDetail
};
