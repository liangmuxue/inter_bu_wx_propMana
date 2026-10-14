/** 自动巡检问题：创建人 / 复检人均为系统 */
const SYSTEM_CREATOR_ID = 'system';
const SYSTEM_CREATOR_NAME = '系统';
const AUTO_PATROL_CREATOR_SUFFIX = '（系统自动巡检）';
const SYSTEM_AUTO_REINSPECT_ACTORS = ['系统自动复检', '系统自动复检完成', '系统'];

function isSystemAutoReinspectActor(name) {
  name = (name || '').trim();
  if (!name) return true;
  return SYSTEM_AUTO_REINSPECT_ACTORS.indexOf(name) >= 0;
}

function isAutoPatrolIssue(issue) {
  issue = issue || {};
  if (issue.source === '自动巡检') return true;
  if (issue.checkMethod === '自动') return true;
  return false;
}

function stripAutoPatrolCreatorSuffix(name) {
  name = (name || '').trim();
  if (!name) return '';
  if (name.indexOf(AUTO_PATROL_CREATOR_SUFFIX) >= 0) {
    return name.replace(AUTO_PATROL_CREATOR_SUFFIX, '').trim();
  }
  return name;
}

function resolveCreatorUserId(issue) {
  issue = issue || {};
  if (isAutoPatrolIssue(issue)) return SYSTEM_CREATOR_ID;
  return issue.creatorId || '';
}

function formatCreatorName(issue, formatUser) {
  issue = issue || {};
  if (isAutoPatrolIssue(issue)) return SYSTEM_CREATOR_NAME;
  formatUser = formatUser || function () { return '—'; };
  const userId = issue.creatorId || '';
  return userId ? formatUser(userId) : '—';
}

function syncCreatorUserId(issue) {
  issue = issue || {};
  if (isAutoPatrolIssue(issue)) {
    issue.creatorId = SYSTEM_CREATOR_ID;
  }
  return issue;
}

function resolveReinspectActor(issue, creatorName, reinspectBy) {
  if (isAutoPatrolIssue(issue)) {
    return SYSTEM_CREATOR_NAME;
  }
  if (isSystemAutoReinspectActor(reinspectBy)) {
    return creatorName || reinspectBy || '—';
  }
  return reinspectBy || creatorName || '—';
}

module.exports = {
  SYSTEM_CREATOR_ID: SYSTEM_CREATOR_ID,
  SYSTEM_CREATOR_NAME: SYSTEM_CREATOR_NAME,
  AUTO_PATROL_CREATOR_SUFFIX: AUTO_PATROL_CREATOR_SUFFIX,
  isAutoPatrolIssue: isAutoPatrolIssue,
  stripAutoPatrolCreatorSuffix: stripAutoPatrolCreatorSuffix,
  resolveCreatorUserId: resolveCreatorUserId,
  formatCreatorName: formatCreatorName,
  syncCreatorUserId: syncCreatorUserId,
  isSystemAutoReinspectActor: isSystemAutoReinspectActor,
  resolveReinspectActor: resolveReinspectActor
};
