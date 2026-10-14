/** 问题复检辅助（对齐 PC getPatrolIssueCheckMethod / buildPatrolIssueReinspectMetaHtml） */
const taskStore = require('../mock/patrol-task-store');
const patrolIssueAction = require('./patrol-issue-action');
const patrolRefImage = require('./patrol-ref-image');

function formatCheckMethodLabel(method) {
  const map = { '现场': '现场巡检', '远程': '远程巡检', '自动': '自动巡检' };
  return map[method] || '现场巡检';
}

function getGuardPointIds(issue) {
  issue = issue || {};
  if (issue.guardPoints && issue.guardPoints.length) {
    return issue.guardPoints.slice();
  }
  const spec = taskStore.getItemSpec(issue.itemId);
  if (spec && spec.guardConfig && spec.guardConfig.pointIds) {
    return spec.guardConfig.pointIds.slice();
  }
  return [];
}

function getAiSpec(issue) {
  issue = issue || {};
  const spec = taskStore.getItemSpec(issue.itemId) || {};
  return {
    model: spec.aiModel || issue.aiModel || '—',
    channels: spec.aiChannels || issue.aiChannels || '—'
  };
}

function buildAutoReinspectResult(issue, pass) {
  issue = issue || {};
  const ai = getAiSpec(issue);
  pass = pass !== false;
  return {
    model: ai.model,
    channels: ai.channels,
    conclusion: pass ? '正常' : '异常',
    confidence: pass ? '0.94' : '0.87',
    detail: pass
      ? '关联通道最新监测数据已恢复正常，指标满足检查标准。'
      : '关联通道仍存在指标异常，建议退回继续整改。',
    result: pass ? '合格' : '不合格',
    remark: pass ? '系统自动复检通过，指标已恢复正常。' : '系统自动复检未通过，请退回继续整改。'
  };
}

function resolveMethod(issue) {
  return patrolIssueAction.resolveCheckMethod(issue);
}

function getRemoteContext(issue) {
  issue = issue || {};
  const spec = taskStore.getItemSpec(issue.itemId) || {};
  const deviceIds = spec.videoDevices || issue.videoDevices || [];
  const devices = taskStore.resolveDevices(deviceIds);
  return {
    standard: spec.standard || issue.standard || '—',
    refImage: patrolRefImage.resolve(issue.itemId, issue.itemName),
    devices: devices,
    deviceLabels: devices.map(function (d) { return d.id + ' ' + d.name; })
  };
}

/** 临时上报 + 现场巡检项：复检结果在巡更点列表页填报，不要求全部打卡 */
function isTempReportOnsiteIssue(issue) {
  issue = issue || {};
  return issue.source === '临时上报' && resolveMethod(issue) === '现场';
}

function requiresAllGuardCheckinsForReinspect(issue) {
  return resolveMethod(issue) === '现场' && !isTempReportOnsiteIssue(issue);
}

module.exports = {
  formatCheckMethodLabel: formatCheckMethodLabel,
  getGuardPointIds: getGuardPointIds,
  getAiSpec: getAiSpec,
  buildAutoReinspectResult: buildAutoReinspectResult,
  resolveMethod: resolveMethod,
  getRemoteContext: getRemoteContext,
  isTempReportOnsiteIssue: isTempReportOnsiteIssue,
  requiresAllGuardCheckinsForReinspect: requiresAllGuardCheckinsForReinspect
};
