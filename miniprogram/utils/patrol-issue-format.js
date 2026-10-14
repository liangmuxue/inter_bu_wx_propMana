/** 巡检问题展示字段与处理流程（对齐 PC buildPatrolIssueDetailContentHtml） */
const patrolIssueCreator = require('./patrol-issue-creator');
const patrolIssueFlowLog = require('./patrol-issue-flow-log');

function dash() {
  return '—';
}

function issueStatusTagClass(status) {
  if (status === '待整改') return 'tag-warning';
  if (status === '待复检') return 'tag-info';
  if (status === '已完成') return 'tag-success';
  return 'tag-info';
}

function formatObjectLabel(issue) {
  issue = issue || {};
  if (!issue.objectId && !issue.objectName) return dash();
  if (issue.objectId && issue.objectName) {
    return issue.objectId + ' · ' + issue.objectName;
  }
  return issue.objectName || issue.objectId;
}

function formatItemLabel(issue) {
  issue = issue || {};
  if (!issue.itemId && !issue.itemName) return dash();
  if (issue.itemId && issue.itemName) {
    return issue.itemId + ' · ' + issue.itemName;
  }
  return issue.itemName || issue.itemId;
}

function formatTaskLabel(issue) {
  issue = issue || {};
  if (!issue.taskId) return dash();
  if (issue.taskPlanName) {
    return issue.taskId + ' · ' + issue.taskPlanName;
  }
  return issue.taskId;
}

function resolveMediaUrl(item) {
  item = item || {};
  return item.path || item.previewUrl || item.url || '';
}

function normalizeMediaList(list) {
  return (list || []).map(function (item) {
    item = item || {};
    const url = resolveMediaUrl(item);
    return Object.assign({}, item, {
      path: item.path || url,
      previewUrl: item.previewUrl || url,
      url: url
    });
  });
}

const ITEM_IMAGE_SAMPLES = {
  'PI-002': { tone: 'env', label: '现场参考图', caption: '配电室环境监控异常画面' },
  'PI-006': { tone: 'ups', label: '现场参考图', caption: 'UPS 运行指标超限告警截图' },
  'PI-007': { tone: 'garage', label: '现场参考图', caption: 'B1 车库通道杂物堆放' },
  'PI-008': { tone: 'env', label: '现场参考图', caption: '主入口监控异常画面' },
  'PI-004': { tone: 'hydrant', label: '现场参考图', caption: '箱门完好，水带、栓口及标识齐全' }
};

function defaultImagesForIssue(issue) {
  issue = issue || {};
  const existing = issue.images || [];
  if (existing.length) return normalizeMediaList(existing);
  const sample = ITEM_IMAGE_SAMPLES[issue.itemId];
  if (!sample) return [];
  return normalizeMediaList([Object.assign({}, sample)]);
}

function buildIssueItems(issue) {
  issue = issue || {};
  if (issue.issues && issue.issues.length) {
    return issue.issues.map(function (item) {
      return Object.assign({}, item, {
        issueNo: item.issueNo || issue.issueNo,
        images: normalizeMediaList(item.images && item.images.length
          ? item.images
          : defaultImagesForIssue(Object.assign({}, issue, item))),
        attachments: normalizeMediaList(item.attachments)
      });
    });
  }
  return [{
    issueNo: issue.issueNo,
    desc: issue.title || issue.desc || '',
    images: defaultImagesForIssue(issue),
    attachments: normalizeMediaList(issue.attachments)
  }];
}

function buildTimeline(issue, creatorName, handlerName) {
  issue = issue || {};
  const items = buildIssueItems(issue);
  const first = items[0] || {};
  const nodes = [{
    key: 'discover',
    time: issue.createdAt || '',
    actor: creatorName || dash(),
    action: '发现问题',
    actionTone: 'discover',
    desc: first.desc || issue.title || '',
    images: first.images || [],
    attachments: first.attachments || [],
    imagesLabel: '问题图片',
    attachmentLabel: '问题附件'
  }];

  const logs = patrolIssueFlowLog.resolveFlowLogs(issue, creatorName, handlerName);
  logs.forEach(function (log, index) {
    const node = patrolIssueFlowLog.flowLogToTimelineNode(log, index);
    if (node) nodes.push(node);
  });

  return nodes;
}

function resolveImageThumbLabel(img, idx, issueDesc) {
  img = img || {};
  const label = img.label || ('图片 ' + ((idx || 0) + 1));
  const desc = (issueDesc || '').trim();
  const caption = (img.caption || '').trim();
  if (desc && (label === desc || caption === desc)) return '';
  return label;
}

function prepareDisplayImages(images, issueDesc) {
  return normalizeMediaList(images).map(function (img, idx) {
    const src = resolveMediaUrl(img);
    return Object.assign({}, img, {
      src: src,
      thumbLabel: resolveImageThumbLabel(img, idx, issueDesc),
      showUrl: !!src,
      tone: img.tone || 'default'
    });
  });
}

function prepareIssueDetailDisplay(issue) {
  issue = issue || {};
  const issues = (issue.issues || []).map(function (item) {
    const displayImages = prepareDisplayImages(item.images, item.desc);
    return Object.assign({}, item, {
      displayImages: displayImages,
      hasImages: displayImages.length > 0
    });
  });
  const timeline = (issue.timeline || []).map(function (node) {
    const displayImages = prepareDisplayImages(node.images, node.desc);
    return Object.assign({}, node, {
      displayImages: displayImages,
      hasImages: displayImages.length > 0
    });
  });
  return Object.assign({}, issue, { issues: issues, timeline: timeline });
}

function enrichIssueView(issue, formatUser, resolveTaskExecutorId) {
  issue = issue || {};
  formatUser = formatUser || function () { return dash(); };
  issue = patrolIssueCreator.syncCreatorUserId(
    Object.assign({}, issue),
    resolveTaskExecutorId
  );
  const creatorName = patrolIssueCreator.formatCreatorName(
    issue,
    formatUser,
    resolveTaskExecutorId
  );
  const handlerName = formatUser(issue.handlerId);

  return Object.assign({}, issue, {
    desc: issue.title || issue.desc || '',
    taskLabel: formatTaskLabel(issue),
    objectLabel: formatObjectLabel(issue),
    itemLabel: formatItemLabel(issue),
    creatorName: creatorName,
    handlerName: handlerName,
    statusClass: issueStatusTagClass(issue.status),
    issues: buildIssueItems(issue),
    timeline: buildTimeline(issue, creatorName, handlerName)
  });
}

/** 确保自动巡检问题创建人为系统，并按 flowLogs 刷新时间线 */
function ensureCreatorDisplay(issue, formatUser, resolveTaskExecutorId) {
  if (!issue) return issue;
  formatUser = formatUser || function () { return dash(); };
  const synced = patrolIssueCreator.syncCreatorUserId(
    Object.assign({}, issue),
    resolveTaskExecutorId
  );
  const creatorName = patrolIssueCreator.formatCreatorName(
    synced,
    formatUser,
    resolveTaskExecutorId
  );
  const handlerName = formatUser(synced.handlerId);
  const flowLogs = patrolIssueFlowLog.resolveFlowLogs(synced, creatorName, handlerName);
  const expectedNodeCount = flowLogs.length + 1;
  const needsTimelineRebuild = !issue.timeline ||
    issue.timeline.length < expectedNodeCount ||
    issue.creatorName !== creatorName;

  if (!needsTimelineRebuild) return issue;

  const merged = Object.assign({}, synced, {
    flowLogs: flowLogs,
    creatorId: synced.creatorId,
    creatorName: creatorName
  });
  return Object.assign({}, issue, {
    creatorId: synced.creatorId,
    creatorName: creatorName,
    flowLogs: flowLogs,
    timeline: buildTimeline(merged, creatorName, handlerName)
  });
}

function ensureCreatorDisplayList(list, formatUser, resolveTaskExecutorId) {
  return (list || []).map(function (item) {
    return ensureCreatorDisplay(item, formatUser, resolveTaskExecutorId);
  });
}

module.exports = {
  dash: dash,
  issueStatusTagClass: issueStatusTagClass,
  formatObjectLabel: formatObjectLabel,
  formatItemLabel: formatItemLabel,
  formatTaskLabel: formatTaskLabel,
  buildIssueItems: buildIssueItems,
  buildTimeline: buildTimeline,
  enrichIssueView: enrichIssueView,
  ensureCreatorDisplay: ensureCreatorDisplay,
  ensureCreatorDisplayList: ensureCreatorDisplayList,
  prepareIssueDetailDisplay: prepareIssueDetailDisplay,
  resolveImageThumbLabel: resolveImageThumbLabel
};
