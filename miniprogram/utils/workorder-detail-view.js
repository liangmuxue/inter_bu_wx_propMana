const workorderTimeline = require('./workorder-timeline');
const workorderMedia = require('./workorder-media');

function timelineResultTagClass(result) {
  var s = String(result || '');
  if (s === '已完结') return 'tag-success';
  if (s === '已撤回') return 'tag-muted';
  if (s === '处理中' || s === '待派单（退回）') return 'tag-warning';
  if (s === '已派单' || s === '待派单') return 'tag-info';
  return 'tag-info';
}

function timelineDotClass(result) {
  var s = String(result || '');
  if (s === '已完结') return 'is-pass';
  if (s === '已撤回') return 'is-reject';
  if (s === '处理中' || s === '已派单' || s === '待派单（退回）') return 'is-rectify';
  return 'is-discover';
}

function formatOperatorLine(node) {
  var name = (node && node.operatorName) || '—';
  var parts = [];
  if (node && node.operatorAccount) parts.push(node.operatorAccount);
  if (node && node.operatorOrg) parts.push(node.operatorOrg);
  return parts.length ? name + '（' + parts.join(' · ') + '）' : name;
}

function nodeRemarkVisible(node) {
  if (!node || !node.remark) return false;
  if (node.contentText && node.remark === node.contentText) return false;
  return !(node.fields || []).some(function (f) {
    return f && String(f.value || '') === String(node.remark || '');
  });
}

function enrichDisplayTimeline(timeline) {
  return (timeline || []).map(function (node) {
    var item = Object.assign({}, node);
    item.result = workorderTimeline.normalizeWosTimelineResult(item.stage, item.result);
    item.resultTagClass = timelineResultTagClass(item.result);
    item.dotClass = timelineDotClass(item.result);
    item.operatorLine = formatOperatorLine(item);
    item.showRemark = nodeRemarkVisible(item);
    item.hasBody = !!(
      (item.fields && item.fields.length) ||
      item.contentText ||
      item.showRemark ||
      item.hasImages ||
      item.hasVideos ||
      (item.fileAttachments && item.fileAttachments.length)
    );
    return item;
  });
}

function buildDetailView(order) {
  if (!order) return order;
  var view = Object.assign({}, order);
  view.displayTimeline = enrichDisplayTimeline(order.timeline);
  view.hasReportMedia = view.hasReportImages || view.hasReportVideos || (view.reportFiles && view.reportFiles.length);
  var feedbackImages = workorderMedia.normalizeNodeImages(view.feedbackImages, '反馈图');
  var feedbackAttachments = workorderMedia.normalizeNodeAttachments(view.feedbackAttachments);
  view.feedbackImages = feedbackImages;
  view.feedbackAttachments = feedbackAttachments;
  view.feedbackVideos = feedbackAttachments.filter(function (f) { return f.type === 'video'; });
  view.feedbackFiles = feedbackAttachments.filter(function (f) { return f.type !== 'video'; });
  view.hasFeedbackImages = feedbackImages.length > 0;
  view.hasFeedbackVideos = view.feedbackVideos.length > 0;
  view.hasFeedbackFiles = view.feedbackFiles.length > 0;
  view.hasFeedbackInfo = !!(
    view.feedbackAt ||
    view.feedbackRemark ||
    view.hasFeedbackImages ||
    view.hasFeedbackVideos ||
    view.hasFeedbackFiles
  );
  view.hasFeedback = view.hasFeedbackInfo;
  view.feedbackByText = view.feedbackBy || view.starterName || '—';
  return view;
}

module.exports = {
  buildDetailView: buildDetailView
};
