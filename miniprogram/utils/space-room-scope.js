/**
 * 会议室数据权限（对齐 PC space-management.js · isRoomInDataScope）
 * 开放组织 ∩ 当前角色组织数据权限；scope.all 可见全部；无组织权限则不可见。
 */
function getAccessibleOrgIdSet(scope) {
  scope = scope || { all: false, orgIds: [], regionIds: [] };
  if (scope.all) return null;
  const ids = scope.orgIds || [];
  if (!ids.length) return {};
  const set = {};
  ids.forEach(function (id) {
    set[String(id)] = true;
  });
  return set;
}

function isRoomInDataScope(room, scope) {
  if (!room) return false;
  const set = getAccessibleOrgIdSet(scope);
  if (set == null) return true;
  const orgIds = room.orgIds || [];
  if (!orgIds.length) return false;
  for (let i = 0; i < orgIds.length; i++) {
    if (set[String(orgIds[i])]) return true;
  }
  return false;
}

function filterRoomsInDataScope(rooms, scope) {
  return (rooms || []).filter(function (room) {
    return isRoomInDataScope(room, scope);
  });
}

function filterBookingsByRoomScope(bookings, rooms, scope) {
  const scopedRoomIds = {};
  filterRoomsInDataScope(rooms, scope).forEach(function (room) {
    scopedRoomIds[room.id] = true;
  });
  return (bookings || []).filter(function (booking) {
    return scopedRoomIds[booking.roomId];
  });
}

module.exports = {
  getAccessibleOrgIdSet: getAccessibleOrgIdSet,
  isRoomInDataScope: isRoomInDataScope,
  filterRoomsInDataScope: filterRoomsInDataScope,
  filterBookingsByRoomScope: filterBookingsByRoomScope
};
