const mockUsers = require('../config/mock-users');
const dataScope = require('./data-scope');

function normalizeUser(user) {
  if (!user) return null;
  const profile = user.id ? mockUsers[user.id] : null;
  const merged = profile ? Object.assign({}, profile, user) : Object.assign({}, user);
  if (!merged.name) merged.name = merged.nickName || merged.userName || merged.username || '';
  if (!merged.id) merged.id = merged.username || merged.userName || merged.personCode || '';
  if (!merged.role) merged.role = merged.roleName || '普通用户';
  merged.dataScope = merged.dataScope || dataScope.resolveDataScope(merged);
  return merged;
}

function getMockUser(userId) {
  return mockUsers[userId] ? Object.assign({}, mockUsers[userId]) : null;
}

module.exports = {
  normalizeUser,
  getMockUser
};
