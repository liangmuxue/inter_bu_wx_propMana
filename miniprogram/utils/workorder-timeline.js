/**
 * 物业端小程序 · 工单流程记录 enrichment（对齐 PC workorder-service.js）
 */
const workorderMedia = require('./workorder-media');

function wosPushField(fields, label, value) {
  if (value == null) return;
  var text = String(value).trim();
  if (!text || text === '—') return;
  fields.push({ label: label, value: text });
}

function normalizeWosTimelineResult(stage, result) {
  var st = String(stage || '');
  var r = String(result || '').trim();
  if (st === '申请' || r === '已提交') return '待派单';
  if (st === '派单' || st === '转派' || r === '已派单' || r === '已转派') return '已派单';
  if (st === '接单' || r === '已接单') return '处理中';
  if (st === '完工' || r === '已提交验收' || r === '待验收') return '已完结';
  if (st === '不满意反馈' || r === '待派单（退回）') return '待派单（退回）';
  if (st === '完结' || st === '直接完结' || r === '直接完结' || r === '验收通过' || r === '已完结（未评价）' || r === '已完结（已评价）') return '已完结';
  if (st === '撤回' || r === '已撤回') return '已撤回';
  if (st === '验收') {
    if (/驳回/.test(r) || r === '处理中') return '处理中';
    return '已完结';
  }
  if (r === '已完结') return '已完结';
  if (/驳回/.test(r) && st !== '不满意反馈') return '处理中';
  return r || '—';
}

function normalizeAcceptResultLabel(v) {
  var s = String(v || '').trim();
  if (!s || s === '直接完结') return '';
  if (/驳回/.test(s)) return '验收驳回';
  if (/通过/.test(s)) return '验收通过';
  return s;
}

function isDirectCloseOrder(order) {
  if (!order) return false;
  var tl = order.timeline || [];
  for (var i = 0; i < tl.length; i++) {
    if (tl[i] && tl[i].stage === '直接完结') return true;
  }
  return String(order.acceptResult || '').trim() === '直接完结';
}

function categoryLabel(order) {
  return (order && (order.categoryName || order.categoryId)) || '';
}

function inferWosTimelineNode(item) {
  if (!item) return null;
  if (item.stage) {
    return {
      stage: item.stage,
      result: item.result || '记录',
      time: item.time || '',
      operatorName: item.operatorName || '—',
      operatorAccount: item.operatorAccount || '',
      operatorOrg: item.operatorOrg || '',
      remark: item.remark || '',
      contentLabel: item.contentLabel || '',
      contentText: item.contentText || '',
      fields: Array.isArray(item.fields) ? item.fields.slice() : [],
      imageLabel: item.imageLabel || '',
      images: Array.isArray(item.images) ? item.images.slice() : [],
      attachmentLabel: item.attachmentLabel || '',
      attachments: Array.isArray(item.attachments) ? item.attachments.slice() : []
    };
  }
  var text = String(item.text || '');
  var stage = '流转';
  var result = '记录';
  if (/提交|申请|创建|代录/.test(text)) { stage = '申请'; result = '待派单'; }
  else if (/直接完结/.test(text)) { stage = '直接完结'; result = '已完结'; }
  else if (/转派/.test(text)) { stage = '转派'; result = '已派单'; }
  else if (/派单|指派/.test(text)) { stage = '派单'; result = '已派单'; }
  else if (/接单/.test(text)) { stage = '接单'; result = '处理中'; }
  else if (/不满意反馈/.test(text)) { stage = '不满意反馈'; result = '待派单（退回）'; }
  else if (/完工/.test(text)) { stage = '完工'; result = '已完结'; }
  else if (/验收通过/.test(text)) { stage = '验收'; result = '已完结'; }
  else if (/验收驳回|驳回/.test(text)) { stage = '验收'; result = '处理中'; }
  else if (/撤销|撤回/.test(text)) { stage = '撤回'; result = '已撤回'; }
  else if (/评价/.test(text)) { stage = '已评价'; result = '已评价'; }
  else if (/分类/.test(text)) { stage = '调整'; result = '修改分类'; }
  return {
    stage: stage,
    result: result,
    time: item.time || '',
    operatorName: item.operatorName || '—',
    operatorAccount: item.operatorAccount || '',
    operatorOrg: item.operatorOrg || '',
    remark: text,
    contentLabel: '',
    contentText: '',
    fields: [],
    imageLabel: '',
    images: [],
    attachmentLabel: '',
    attachments: []
  };
}

function enrichWosTimelineNodes(order, reportImages, reportAttachments) {
  var o = order || {};
  reportImages = reportImages || workorderMedia.normalizeReportImages(o);
  reportAttachments = reportAttachments || workorderMedia.normalizeReportAttachments(o);
  var finishImages = workorderMedia.normalizeNodeImages(o.finishImages, '完工图');
  var finishAttachments = workorderMedia.normalizeNodeAttachments(o.finishAttachments);
  var acceptImages = workorderMedia.normalizeNodeImages(o.acceptImages, '验收图');
  var acceptAttachments = workorderMedia.normalizeNodeAttachments(o.acceptAttachments);
  var feedbackImages = workorderMedia.normalizeNodeImages(o.feedbackImages, '反馈图');
  var feedbackAttachments = workorderMedia.normalizeNodeAttachments(o.feedbackAttachments);
  var assigneeText = (o.assignees || []).map(function (a) {
    return typeof a === 'string' ? a : (a && a.name) || '';
  }).filter(Boolean).join('、');

  var nodes = (o.timeline || []).map(inferWosTimelineNode).filter(Boolean);

  nodes.forEach(function (node) {
    node.fields = Array.isArray(node.fields) ? node.fields.slice() : [];
    node.images = Array.isArray(node.images) ? node.images.slice() : [];
    node.attachments = Array.isArray(node.attachments) ? node.attachments.slice() : [];
    node.result = normalizeWosTimelineResult(node.stage, node.result);

    if (node.stage === '申请') {
      if (!node.operatorOrg && o.starterOrg) node.operatorOrg = o.starterOrg;
      if (!node.fields.length) {
        wosPushField(node.fields, '上报区域', o.regionName);
        wosPushField(node.fields, '工单分类', categoryLabel(o));
        wosPushField(node.fields, '上报内容', o.content);
      }
      if (/提交申请|提交报事|创建工单|代录/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      if (!node.images.length && reportImages.length) {
        node.imageLabel = node.imageLabel || '上报图片';
        node.images = reportImages.slice();
      }
      if (!node.attachments.length && reportAttachments.length) {
        node.attachmentLabel = node.attachmentLabel || '上报附件';
        node.attachments = reportAttachments.slice();
      }
    }

    if (node.stage === '派单') {
      if (/派单[：:]/.test(String(node.remark || '')) || /来源（系统默认调度）/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      if (!node.contentText && o.dispatchRemark && !isDirectCloseOrder(o)) {
        node.contentLabel = '派单说明';
        node.contentText = o.dispatchRemark;
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '派单时间';
      }).map(function (f) {
        if (f.label === '处理人') f.label = '指派处理人';
        return f;
      });
      if (!node.fields.length) {
        wosPushField(node.fields, '工单分类', categoryLabel(o));
        wosPushField(node.fields, '指派处理人', assigneeText);
      } else if (!(node.fields || []).some(function (f) { return f && f.label === '指派处理人'; }) && assigneeText) {
        wosPushField(node.fields, '指派处理人', assigneeText);
      }
    }

    if (node.stage === '转派') {
      node.fields = (node.fields || []).map(function (f) {
        if (f && f.label === '处理人') f.label = '指派处理人';
        return f;
      });
      if (!node.fields.length) {
        wosPushField(node.fields, '转派时间', node.time || o.dispatchedAt);
        wosPushField(node.fields, '指派处理人', assigneeText);
      }
    }

    if (node.stage === '接单') {
      if (/接单为实际处理人/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '接单时间' && f.label !== '实际处理人';
      });
    }

    if (node.stage === '完工') {
      if (/^附件[：:]/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      if (!node.contentText && o.finishRemark) {
        node.contentLabel = '完工说明';
        node.contentText = o.finishRemark;
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '完工时间' && f.label !== '实际处理人';
      });
      if (!node.images.length && finishImages.length) {
        node.imageLabel = node.imageLabel || '完工图片';
        node.images = finishImages.slice();
      }
      if (!node.attachments.length && finishAttachments.length) {
        node.attachmentLabel = node.attachmentLabel || '完工附件';
        node.attachments = finishAttachments.slice();
      }
    }

    if (node.stage === '不满意反馈') {
      node.result = '待派单（退回）';
      if (!node.contentText && o.feedbackRemark) {
        node.contentLabel = '反馈说明';
        node.contentText = o.feedbackRemark;
      }
      if (!node.images.length && feedbackImages.length) {
        node.imageLabel = node.imageLabel || '反馈图片';
        node.images = feedbackImages.slice();
      }
      if (!node.attachments.length && feedbackAttachments.length) {
        node.attachmentLabel = node.attachmentLabel || '反馈附件';
        node.attachments = feedbackAttachments.slice();
      }
    }

    if (node.stage === '验收') {
      var rejectAccept = /驳回/.test(String(o.acceptResult || '')) ||
        (node.fields || []).some(function (f) {
          return f && f.label === '验收结果' && /驳回/.test(String(f.value || ''));
        }) ||
        /驳回|退回处理中/.test(String(node.remark || ''));
      node.result = rejectAccept ? '处理中' : '已完结';
      if (/退回处理中|验收通过，工单已完结/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      if (!node.contentText && o.acceptRemark) {
        node.contentLabel = '验收说明';
        node.contentText = o.acceptRemark;
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '验收时间';
      });
      if (!(node.fields || []).some(function (f) { return f && f.label === '验收结果'; })) {
        wosPushField(node.fields, '验收结果', normalizeAcceptResultLabel(o.acceptResult) || (rejectAccept ? '验收驳回' : '验收通过'));
      } else {
        node.fields = (node.fields || []).map(function (f) {
          if (f && f.label === '验收结果') {
            f.value = normalizeAcceptResultLabel(f.value) || f.value;
          }
          return f;
        });
      }
      if (!node.images.length && acceptImages.length) {
        node.imageLabel = node.imageLabel || '验收图片';
        node.images = acceptImages.slice();
      }
      if (!node.attachments.length && acceptAttachments.length) {
        node.attachmentLabel = node.attachmentLabel || '验收附件';
        node.attachments = acceptAttachments.slice();
      }
    }

    if (node.stage === '完结' || node.stage === '直接完结') {
      node.stage = '直接完结';
      if (!node.contentText && o.dispatchRemark) {
        node.contentLabel = '完结说明';
        node.contentText = o.dispatchRemark;
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '完结时间' && f.label !== '完结方式';
      });
      if (!node.images.length && finishImages.length) {
        node.imageLabel = node.imageLabel || '完结图片';
        node.images = finishImages.slice();
      }
      if (!node.attachments.length && finishAttachments.length) {
        node.attachmentLabel = node.attachmentLabel || '完结附件';
        node.attachments = finishAttachments.slice();
      }
    }

    if (node.stage === '评价' || node.stage === '已评价') {
      node.stage = '已评价';
      node.result = '已评价';
      if (/^评分\s*\d+\s*分/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '评价时间';
      });
      if (!(node.fields || []).some(function (f) { return f && f.label === '评分'; }) && o.rateScore != null) {
        wosPushField(node.fields, '评分', o.rateScore + ' 分');
      }
      if (!node.contentText && o.rateRemark) {
        node.contentLabel = '评价说明';
        node.contentText = o.rateRemark;
      }
    }

    if (node.stage === '撤回') {
      if (/上报人撤回|上报人撤销/.test(String(node.remark || ''))) {
        node.remark = '';
      }
      node.fields = (node.fields || []).filter(function (f) {
        return f && f.label !== '撤回时间';
      });
    }
  });

  return nodes.map(function (node) {
    var images = node.images ? node.images.slice() : [];
    var attachments = node.attachments ? node.attachments.slice() : [];
    var displayImages = workorderMedia.normalizeNodeImages(images, node.imageLabel || '图片');
    var displayAttachments = workorderMedia.normalizeNodeAttachments(attachments);
    return Object.assign({}, node, {
      displayImages: displayImages,
      displayAttachments: displayAttachments,
      imageUrls: displayImages.map(function (img) { return img.url; }).filter(Boolean),
      hasImages: displayImages.length > 0,
      hasAttachments: displayAttachments.length > 0,
      hasVideos: displayAttachments.some(function (f) { return f.type === 'video'; }),
      displayVideos: displayAttachments.filter(function (f) { return f.type === 'video'; }),
      fileAttachments: displayAttachments.filter(function (f) { return f.type !== 'video'; })
    });
  });
}

module.exports = {
  enrichTimelineNodes: enrichWosTimelineNodes,
  normalizeWosTimelineResult: normalizeWosTimelineResult,
  isDirectCloseOrder: isDirectCloseOrder
};
