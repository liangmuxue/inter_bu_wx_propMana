/** 巡检问题处理流程历史（支持多次整改/复检） */
const patrolIssueCreator = require('./patrol-issue-creator');

function dash() {
  return '—';
}

function normalizeMediaList(list) {
  return (list || []).map(function (item) {
    item = item || {};
    const url = item.path || item.previewUrl || item.url || '';
    return Object.assign({}, item, {
      path: item.path || url,
      previewUrl: item.previewUrl || url,
      url: url
    });
  });
}

function cloneFlowLogs(logs) {
  return (logs || []).map(function (log) {
    return Object.assign({}, log, {
      images: normalizeMediaList(log.images),
      attachments: normalizeMediaList(log.attachments)
    });
  });
}

function appendFlowLog(raw, entry) {
  raw = raw || {};
  entry = entry || {};
  if (!Array.isArray(raw.flowLogs)) raw.flowLogs = [];
  raw._flowLogSeq = (raw._flowLogSeq || 0) + 1;
  const seq = raw._flowLogSeq;
  raw.flowLogs.push(Object.assign({}, entry, {
    seq: seq,
    key: entry.key || (entry.type || 'log') + '-' + seq,
    images: normalizeMediaList(entry.images),
    attachments: normalizeMediaList(entry.attachments)
  }));
}

function appendRectifyLog(raw) {
  if (!raw || !raw.rectifyAt) return;
  appendFlowLog(raw, {
    type: 'rectify',
    time: raw.rectifyAt,
    actor: raw.rectifyBy || dash(),
    desc: raw.rectifyDesc || '',
    images: raw.rectifyImages,
    attachments: raw.rectifyFiles
  });
}

function appendReinspectLog(raw, creatorName) {
  if (!raw || !raw.reinspectAt) return;
  const result = raw.reinspectResult || '';
  appendFlowLog(raw, {
    type: 'reinspect',
    time: raw.reinspectAt,
    actor: patrolIssueCreator.resolveReinspectActor(
      raw,
      creatorName,
      raw.reinspectBy
    ) || dash(),
    result: result,
    desc: (result ? '复检结果：' + result + '。' : '') + (raw.reinspectRemark || ''),
    images: raw.reinspectImages,
    attachments: raw.reinspectFiles
  });
}

function legacyFlowLogs(issue, creatorName, handlerName) {
  issue = issue || {};
  creatorName = creatorName || dash();
  handlerName = handlerName || dash();
  const logs = [];
  if (issue.rectifyAt) {
    logs.push({
      type: 'rectify',
      key: 'rectify-legacy',
      time: issue.rectifyAt,
      actor: issue.rectifyBy || handlerName,
      desc: issue.rectifyDesc || '',
      images: normalizeMediaList(issue.rectifyImages),
      attachments: normalizeMediaList(issue.rectifyFiles)
    });
  }
  if (issue.reinspectAt) {
    const result = issue.reinspectResult || '';
    logs.push({
      type: 'reinspect',
      key: 'reinspect-legacy',
      time: issue.reinspectAt,
      actor: patrolIssueCreator.resolveReinspectActor(
        issue,
        creatorName,
        issue.reinspectBy
      ) || dash(),
      result: result,
      desc: (result ? '复检结果：' + result + '。' : '') + (issue.reinspectRemark || ''),
      images: normalizeMediaList(issue.reinspectImages),
      attachments: normalizeMediaList(issue.reinspectFiles)
    });
  }
  return sortFlowLogs(logs);
}

function sortFlowLogs(logs) {
  return (logs || []).slice().sort(function (a, b) {
    const timeCmp = (a.time || '').localeCompare(b.time || '');
    if (timeCmp !== 0) return timeCmp;
    return (a.seq || 0) - (b.seq || 0);
  });
}

function resolveFlowLogs(issue, creatorName, handlerName) {
  issue = issue || {};
  const stored = Array.isArray(issue.flowLogs) ? issue.flowLogs : [];
  if (stored.length) return sortFlowLogs(cloneFlowLogs(stored));
  return legacyFlowLogs(issue, creatorName, handlerName);
}

function flowLogToTimelineNode(log, index) {
  log = log || {};
  const nodeKey = log.key || ((log.type || 'log') + '-' + ((index || 0) + 1));
  if (log.type === 'rectify') {
    return {
      key: nodeKey,
      time: log.time || '',
      actor: log.actor || dash(),
      action: '已整改',
      actionTone: 'rectify',
      desc: log.desc || '',
      images: normalizeMediaList(log.images),
      attachments: normalizeMediaList(log.attachments),
      imagesLabel: '整改图片',
      attachmentLabel: '整改附件'
    };
  }
  if (log.type === 'reinspect') {
    const result = log.result || '';
    return {
      key: nodeKey,
      time: log.time || '',
      actor: log.actor || dash(),
      action: result === '合格' ? '复检通过' : (result ? '复检打回' : '复检'),
      actionTone: result === '合格' ? 'pass' : 'reject',
      desc: log.desc || '',
      images: normalizeMediaList(log.images),
      attachments: normalizeMediaList(log.attachments),
      imagesLabel: '复检图片',
      attachmentLabel: '复检附件'
    };
  }
  return null;
}

module.exports = {
  appendFlowLog: appendFlowLog,
  appendRectifyLog: appendRectifyLog,
  appendReinspectLog: appendReinspectLog,
  legacyFlowLogs: legacyFlowLogs,
  resolveFlowLogs: resolveFlowLogs,
  sortFlowLogs: sortFlowLogs,
  flowLogToTimelineNode: flowLogToTimelineNode,
  cloneFlowLogs: cloneFlowLogs
};
