const mockUsers = require('../config/mock-users');
const orgPerm = require('../config/org-permissions');

function getUserProfile(userId) {
  return mockUsers[userId] ? Object.assign({}, mockUsers[userId]) : null;
}

function getAllUserProfiles() {
  return Object.keys(mockUsers).map(function (id) {
    return getUserProfile(id);
  });
}

function unionIds(list) {
  const set = {};
  (list || []).forEach(function (id) {
    if (id) set[id] = true;
  });
  return Object.keys(set);
}

function getRoleScope(roleName) {
  const scope = orgPerm.ROLE_ORG_SCOPES[roleName];
  if (!scope) return { all: false, orgIds: [], regionIds: [] };
  if (scope.all) return { all: true, orgIds: [], regionIds: [] };
  return {
    all: false,
    orgIds: (scope.orgIds || []).slice(),
    regionIds: (scope.regionIds || []).slice()
  };
}

function mergeScopes(scopes) {
  if (scopes.some(function (s) { return s.all; })) {
    return { all: true, orgIds: [], regionIds: [] };
  }
  return {
    all: false,
    orgIds: unionIds(scopes.reduce(function (acc, s) {
      return acc.concat(s.orgIds || []);
    }, [])),
    regionIds: unionIds(scopes.reduce(function (acc, s) {
      return acc.concat(s.regionIds || []);
    }, []))
  };
}

/** 解析用户角色 + 用户组继承角色的组织/区域数据权限并集（对齐 PC） */
function resolveDataScope(user) {
  if (!user) return { all: false, orgIds: [], regionIds: [] };
  const profile = getUserProfile(user.id || user.account) || user;
  const scopes = [getRoleScope(profile.role)];
  (profile.userGroups || []).forEach(function (groupName) {
    const groupRole = orgPerm.USER_GROUP_ROLE[groupName];
    if (groupRole) scopes.push(getRoleScope(groupRole));
  });
  return mergeScopes(scopes);
}

/**
 * 同 PC matchesCurrentUserDataScope：
 * - all → true
 * - 角色无组织且无区域 → false
 * - 行上同时有组织+区域且角色两边都配了 → AND
 * - 行上组织/区域都没有 → true
 */
function matchesDataScope(scope, opts) {
  opts = opts || {};
  scope = scope || { all: false, orgIds: [], regionIds: [] };
  if (scope.all) return true;
  const hasOrgScope = (scope.orgIds || []).length > 0;
  const hasRegionScope = (scope.regionIds || []).length > 0;
  if (!hasOrgScope && !hasRegionScope) return false;

  let orgOk = true;
  let regionOk = true;
  if (hasOrgScope) {
    if (opts.orgId) orgOk = (scope.orgIds || []).indexOf(opts.orgId) >= 0;
    else if (opts.orgName) {
      orgOk = Object.keys(orgPerm.ORGS).some(function (id) {
        return orgPerm.ORGS[id].name === opts.orgName &&
          (scope.orgIds || []).indexOf(id) >= 0;
      });
    } else orgOk = true;
  }
  if (hasRegionScope) {
    if (opts.regionId) regionOk = (scope.regionIds || []).indexOf(opts.regionId) >= 0;
    else if (opts.regionName) {
      const rid = orgPerm.findRegionIdByName(opts.regionName);
      regionOk = rid
        ? (scope.regionIds || []).indexOf(rid) >= 0
        : Object.keys(orgPerm.REGIONS || {}).some(function (id) {
          return orgPerm.REGIONS[id].name === opts.regionName &&
            (scope.regionIds || []).indexOf(id) >= 0;
        });
    } else regionOk = true;
  }

  const hasRowOrg = !!(opts.orgId || opts.orgName);
  const hasRowRegion = !!(opts.regionId || opts.regionName);
  if (hasOrgScope && hasRowOrg && hasRegionScope && hasRowRegion) {
    return orgOk && regionOk;
  }
  if (hasOrgScope && hasRowOrg) return orgOk && (!hasRegionScope || regionOk);
  if (hasRegionScope && hasRowRegion) return regionOk && (!hasOrgScope || orgOk);
  return true;
}

function matchesAssetDataScope(scope, asset) {
  if (!asset) return false;
  return matchesDataScope(scope, {
    orgId: asset.orgId || '',
    orgName: asset.orgName || '',
    regionId: asset.regionId || '',
    regionName: asset.regionName || ''
  });
}

function isUserInOrgScope(targetUserId, scope) {
  if (scope.all) return true;
  const target = getUserProfile(targetUserId);
  if (!target) return false;
  if (target.orgId === 'ORG-ROOT') return scope.all;
  return (scope.orgIds || []).indexOf(target.orgId) >= 0;
}

function getAccessibleUserIds(user) {
  const scope = resolveDataScope(user);
  if (scope.all) {
    return getAllUserProfiles().map(function (u) { return u.id; });
  }
  return getAllUserProfiles()
    .filter(function (u) { return isUserInOrgScope(u.id, scope); })
    .map(function (u) { return u.id; });
}

function canAccessUserData(currentUser, targetUserId) {
  if (!targetUserId) return false;
  if (currentUser && currentUser.id === targetUserId) return true;
  const scope = resolveDataScope(currentUser);
  return isUserInOrgScope(targetUserId, scope);
}

function isOrgInScope(orgId, scope) {
  if (!scope) return false;
  if (scope.all) return true;
  if (!orgId || orgId === 'ORG-ROOT') return !!scope.all;
  return (scope.orgIds || []).indexOf(orgId) >= 0;
}

function isOrgNameInScope(orgName, scope) {
  if (!scope) return false;
  if (scope.all) return true;
  const name = String(orgName || '').trim();
  if (!name) return true;
  return Object.keys(orgPerm.ORGS).some(function (id) {
    return orgPerm.ORGS[id].name === name && isOrgInScope(id, scope);
  });
}

function isTeamAccessible(user, team) {
  if (!team) return false;
  const profile = typeof user === 'string' ? getUserProfile(user) : user;
  const scope = resolveDataScope(profile || user);
  if (scope.all) return true;
  const orgId = team.orgId || '';
  if (!orgId) return true;
  return isOrgInScope(orgId, scope);
}

/** 含部门（问题处理人等场景） */
function formatUserDisplay(userId) {
  const user = getUserProfile(userId);
  if (!user) return userId || '—';
  if (user.id === 'admin') return user.name;
  return user.name + ' · ' + user.dept;
}

/** 巡检计划/任务执行人：仅姓名，不带部门（与 PC 一致） */
function formatExecutorDisplay(userId) {
  const user = getUserProfile(userId);
  if (!user) return userId || '—';
  return user.name || userId || '—';
}

module.exports = {
  resolveDataScope,
  matchesDataScope,
  matchesAssetDataScope,
  getAccessibleUserIds,
  canAccessUserData,
  isOrgInScope,
  isOrgNameInScope,
  isTeamAccessible,
  formatUserDisplay,
  formatExecutorDisplay,
  getUserProfile,
  getAllUserProfiles
};
