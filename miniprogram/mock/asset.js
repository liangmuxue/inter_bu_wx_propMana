/**
 * 资产管理 Mock（对齐 PC device-asset / inventory / repair）
 * 小程序资产盘点提供：去执行、盘点明细、查看报告、审核报告（编辑/删除仅 PC）。
 */
const session = require('../store/session');
const env = require('../config/env');
const mockUsers = require('../config/mock-users');
const dataScope = require('../utils/data-scope');
const orgPerm = require('../config/org-permissions');
const pagePerm = require('../config/page-permissions');
const assetScan = require('../utils/asset-scan');

const INV_REPORT_STATUSES = ['异常', '盘亏', '盘盈'];
const INV_PAGE_ID = 'dev-asset-inventory';
const REPAIR_REQUEST_PAGE_ID = 'repair-request';
const REPAIR_WORKORDER_PAGE_ID = 'repair-workorder';
const REQ_STATUS_PENDING = '待审批';
const REQ_STATUS_DISPATCHED = '已派单（生成工单）';
const REQ_STATUS_REJECTED = '驳回报修(无需维修)';
const WO_STATUS_DISPATCHED = '已派单';
const WO_STATUS_PROCESSING = '维修处理中';
const WO_STATUS_DONE = '维修完成（已完结）';
const WO_STATUS_FAILED = '维修失败（无法处理）';
const WO_STATUS_VOID = '工单作废';
const WO_STATUS_ACCEPT_PENDING = '待验收';
const WO_STATUS_ACCEPT_PASS = '验收通过（已完结）';
const WO_STATUS_ACCEPT_REJECT = '验收驳回（重新维修）';
const ASSET_STATUS_IN_USE = '使用中';
const ASSET_STATUS_MAINT = '维修中';
const ASSET_STATUS_LOST = '已丢失';
const ASSET_STATUS_SCRAPPED = '已报废';
const REPAIR_WO_CLOSED = {
  '工单作废': true,
  '维修完成（已完结）': true,
  '维修失败（无法处理）': true,
  '验收通过（已完结）': true
};
const DEMO_REPAIR_WORKERS = [
  { account: 'lisi', name: '李四', org: '工程部' },
  { account: 'zhaoliu', name: '赵六', org: '工程部' },
  { account: 'wangwu', name: '王五', org: '工程部' }
];

/** 台账录入/变更流水（对齐 PC asset records） */
const LEDGER_RECORDS = [];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nowStr() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function currentUser() {
  const u = session.getUser();
  if (u && u.id) return u;
  return mockUsers[env.mockUserId] || mockUsers.lisi;
}

function operatorPayload(user) {
  user = user || currentUser();
  const profile = mockUsers[user.id] || user;
  return {
    operatorName: profile.name || user.name || user.id || '',
    operatorAccount: profile.id || user.id || '',
    operatorOrg: profile.dept || profile.orgName || '',
    operator: profile.name || user.name || user.id || ''
  };
}

function appendLedgerRecord(rec) {
  if (!rec || !rec.type) return null;
  const row = Object.assign({
    id: 'rec-' + Date.now() + '-' + LEDGER_RECORDS.length,
    createdAt: nowStr()
  }, operatorPayload(), rec);
  LEDGER_RECORDS.unshift(row);
  return row;
}

function appendSurplusInputRecord(asset) {
  if (!asset) return null;
  return appendLedgerRecord({
    type: 'input',
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    categoryName: asset.categoryName || '',
    content: '盘盈核准入账'
  });
}

function appendShortageChangeRecord(asset, fromStatus) {
  if (!asset) return null;
  const from = fromStatus || '使用中';
  return appendLedgerRecord({
    type: 'change',
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    content: '状态：' + from + ' → 已丢失（盘点盘亏核准销账）'
  });
}

const ASSETS = [
  {
    id: 'ast-001', code: 'ZC-20260530-001', name: '离心式冷水机组', brand: '开利', model: '19XR-500',
    categoryName: '制冷设备', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-B1', regionName: '地下一层', location: 'B2 机房',
    tagType: '二维码', status: '使用中', serialNo: 'AC-SN-99001',
    purchaseMethod: '采购', purchaseAmount: '1280000', purchaseDate: '2022-06-10', warrantyDate: '2027-06-09',
    remark: '主制冷设备',
    images: [
      { name: '机组正面', path: 'https://picsum.photos/seed/asset-chiller-1/400/400' },
      { name: '铭牌', path: 'https://picsum.photos/seed/asset-chiller-2/400/400' }
    ],
    inputBy: '系统管理员', inputAt: '2026-05-30 10:20:00', changeAt: '2026-05-30 10:20:00'
  },
  {
    id: 'ast-004', code: 'ZC-20260601-004', name: '潜污泵 2#', brand: '格兰富', model: 'SE1.50.100',
    categoryName: '给排水', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-B1', regionName: '地下一层', location: 'B1 泵房',
    tagType: '二维码', status: '使用中', serialNo: 'PUMP-SN-4402',
    purchaseMethod: '采购', purchaseAmount: '68000', purchaseDate: '2023-04-12', warrantyDate: '2026-04-11',
    remark: '地下室排水泵',
    images: [
      { name: '泵体现场', path: 'https://picsum.photos/seed/asset-pump-1/400/400' }
    ],
    inputBy: '李四', inputAt: '2026-06-01 09:10:00', changeAt: '2026-06-01 09:10:00'
  },
  {
    id: 'ast-007', code: 'ZC-20260618-007', name: '冷却塔 1#', brand: '良机', model: 'LRC-300',
    categoryName: '制冷设备', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-15F', regionName: '15层', location: '屋面冷却塔区',
    tagType: 'NFC标签', status: '使用中', serialNo: 'CT-SN-3001',
    purchaseMethod: '采购', purchaseAmount: '185000', purchaseDate: '2022-09-08', warrantyDate: '2027-09-07',
    remark: '配套冷水机组散热',
    images: [],
    inputBy: '李四', inputAt: '2026-06-18 10:00:00', changeAt: '2026-06-18 10:00:00'
  },
  {
    id: 'ast-008', code: 'ZC-20260619-008', name: '生活水泵 1#', brand: '南方泵业', model: 'CDL20-4',
    categoryName: '给排水', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-B1', regionName: '地下一层', location: 'B1 生活水泵房',
    tagType: '二维码', status: '使用中', serialNo: 'WP-SN-5208',
    purchaseMethod: '采购', purchaseAmount: '42000', purchaseDate: '2024-01-15', warrantyDate: '2027-01-14',
    remark: '',
    images: [],
    inputBy: '李四', inputAt: '2026-06-19 14:20:00', changeAt: '2026-06-19 14:20:00'
  },
  {
    id: 'ast-010', code: 'ZC-20260620-010', name: '低压配电柜 A1', brand: '施耐德', model: 'PrismaPlus',
    categoryName: '强电', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-B1', regionName: '地下一层', location: 'B1 配电室 A列',
    tagType: 'NFC标签', status: '使用中', serialNo: 'PDB-SN-A101',
    purchaseMethod: '采购', purchaseAmount: '78000', purchaseDate: '2022-03-18', warrantyDate: '2027-03-17',
    remark: 'A区低压进线柜',
    images: [
      { name: '配电柜全貌', path: 'https://picsum.photos/seed/asset-pdb-1/400/400' }
    ],
    inputBy: '系统管理员', inputAt: '2026-06-20 11:00:00', changeAt: '2026-06-20 11:00:00'
  },
  {
    id: 'ast-011', code: 'ZC-20260620-011', name: '门禁控制器 大堂', brand: '海康威视', model: 'DS-K2604',
    categoryName: '弱电安防', orgId: 'ORG-001', orgName: '物业管理部', regionId: 'AR-1F', regionName: '1层', location: '1F 大堂安防间',
    tagType: '二维码', status: '使用中', serialNo: 'ACS-SN-8801',
    purchaseMethod: '采购', purchaseAmount: '6800', purchaseDate: '2025-06-01', warrantyDate: '2028-05-31',
    remark: '大堂双门门禁',
    images: [],
    inputBy: '周七', inputAt: '2026-06-20 16:40:00', changeAt: '2026-06-20 16:40:00'
  },
  {
    id: 'ast-003', code: 'ZC-20260528-003', name: '客梯 3#', brand: '奥的斯', model: 'Gen2',
    categoryName: '电梯', orgId: 'ORG-001', orgName: '物业管理部', regionId: 'AR-15F', regionName: '15层', location: '1-42F 客梯井',
    tagType: '二维码', status: '使用中', serialNo: 'EL-SN-2024003',
    purchaseMethod: '采购', purchaseAmount: '850000', purchaseDate: '2024-03-15', warrantyDate: '2027-03-14',
    remark: '42层客梯',
    images: [],
    inputBy: '周七', inputAt: '2026-05-28 14:20:00', changeAt: '2026-05-28 14:20:00'
  },
  {
    id: 'ast-012', code: 'ZC-20260718-012', name: '应急照明蓄电池组', brand: '南都', model: 'GFM-200',
    categoryName: '强电', orgId: 'ORG-003', orgName: '工程部', regionId: 'AR-B1', regionName: '地下一层', location: 'B1 配电室应急柜',
    tagType: '二维码', status: '已报废', serialNo: 'BAT-SN-0718',
    purchaseMethod: '采购', purchaseAmount: '26000', purchaseDate: '2020-07-18', warrantyDate: '2023-07-17',
    remark: '已报废下线',
    images: [],
    inputBy: '李四', inputAt: '2026-07-18 09:00:00', changeAt: '2026-07-18 16:20:00'
  }
];

function statusClass(status) {
  const s = String(status || '');
  if (s === '相符' || s === '已盘' || s === '盘点完成' || s === '使用中' || s === '已提交') return 'tag-success';
  if (s === '已派单（生成工单）' || s === '已派单' || s === '验收通过（已完结）' || s === '维修完成（已完结）') return 'tag-success';
  if (s === '盘点中' || s === '维修中' || s === '待审批' || s === '待验收') return 'tag-info';
  if (s === '异常' || s === '未完成' || s === '维修处理中') return 'tag-warning';
  if (s === '维修失败（无法处理）' || s === '验收驳回（重新维修）') return 'tag-danger';
  if (s === '盘亏' || s === '盘盈' || s.indexOf('驳回') >= 0 || s === '工单作废') return 'tag-danger';
  if (s === '待盘点' || s === '未盘') return 'tag-info';
  return 'tag-info';
}

function faultLevelClass(level) {
  if (level === '紧急') return 'tag-danger';
  if (level === '轻微') return 'tag-info';
  return 'tag-warning';
}

const DEMO_VIDEO_SRC =
  'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4';

function demoFaultImage(seed, name) {
  return {
    name: name || '故障现场',
    path: 'https://picsum.photos/seed/' + seed + '/400/400',
    url: 'https://picsum.photos/seed/' + seed + '/800/800'
  };
}

/** 工单完工/验收演示图片 */
function demoWoImages(seed, names) {
  return (names || ['现场照片1', '现场照片2']).map(function (name, idx) {
    return demoFaultImage(seed + '-' + (idx + 1), name);
  });
}

/** 工单完工/验收演示视频附件 */
function demoWoVideo(name) {
  return {
    type: 'video',
    name: name || '维修录像.mp4',
    url: DEMO_VIDEO_SRC,
    path: DEMO_VIDEO_SRC
  };
}

function normalizeTimelineImages(images) {
  return (images || []).map(function (img, idx) {
    const url = resolveMediaUrl(img);
    return {
      name: (img && img.name) || ('图片' + (idx + 1)),
      path: url,
      url: url,
      src: url
    };
  }).filter(function (img) { return !!img.src; });
}

function normalizeTimelineVideos(attachments) {
  return (attachments || []).filter(function (a) {
    if (!a) return false;
    if (a.type === 'video') return true;
    return /\.(mp4|mov|avi|webm)$/i.test(a.name || a.url || '');
  }).map(function (a) {
    const url = resolveMediaUrl(a) || DEMO_VIDEO_SRC;
    return {
      type: 'video',
      name: a.name || '视频附件',
      url: url,
      path: url
    };
  });
}

function resolveMediaUrl(media) {
  if (!media) return '';
  if (typeof media === 'string') return media;
  return media.path || media.url || media.previewUrl || '';
}

function enrichRepair(row) {
  const item = clone(row);
  item.statusClass = statusClass(item.status);
  item.faultLevelClass = faultLevelClass(item.faultLevel);
  item.showApproval = item.status === '已派单（生成工单）' || String(item.status).indexOf('驳回') >= 0;
  item.isDispatched = item.status === '已派单（生成工单）';
  item.isRejected = String(item.status).indexOf('驳回') >= 0;
  item.isPending = item.status === '待审批';
  item.assigneesText = (item.assignees || []).map(function (a) {
    return a.name || a.account || '';
  }).filter(Boolean).join('、') || '—';
  item.brandText = item.brand || '—';
  item.modelText = item.model || '—';
  item.categoryNameText = item.categoryName || '—';
  item.regionNameText = item.regionName || '—';
  item.locationText = item.location || '—';
  item.orgNameText = item.orgName || '—';
  item.reporterDisplay = (item.reporterName || '—') +
    (item.reporterAccount ? '（' + item.reporterAccount + '）' : '');
  item.approverNameText = item.approverName || '—';
  item.approveTimeText = item.approveTime || '—';
  item.workOrderCodeText = item.workOrderCode || '—';
  item.faultDescText = item.faultDesc || '—';

  item.faultImages = (item.faultImages || []).map(function (img, idx) {
    const url = resolveMediaUrl(img);
    return {
      name: (img && img.name) || ('故障图' + (idx + 1)),
      path: url,
      url: url
    };
  }).filter(function (img) { return !!img.path; });
  item.hasFaultImages = item.faultImages.length > 0;

  let videoName = '';
  let videoUrl = '';
  if (item.videoAttachment) {
    if (typeof item.videoAttachment === 'object') {
      videoName = item.videoAttachment.name || '故障视频';
      videoUrl = resolveMediaUrl(item.videoAttachment) || DEMO_VIDEO_SRC;
    } else {
      videoName = String(item.videoAttachment);
      videoUrl = DEMO_VIDEO_SRC;
    }
  }
  item.videoName = videoName;
  item.videoUrl = videoUrl;
  item.hasVideo = !!videoName;
  return attachRepairActions(item, currentUser());
}

function attachRepairActions(item, user) {
  user = user || currentUser();
  const canView = pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'view');
  const canAudit = pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'audit');
  const canDelete = pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'delete');
  item.canView = canView;
  item.canApprove = item.status === REQ_STATUS_PENDING && canAudit;
  item.canWithdraw = item.status === REQ_STATUS_PENDING && isRepairMine(item, user);
  item.canDelete = item.status === REQ_STATUS_REJECTED && canDelete;
  item.hasActions = !!(item.canView || item.canApprove || item.canWithdraw || item.canDelete);
  return item;
}

function normalizeWorkOrderStatus(status) {
  if (status === WO_STATUS_ACCEPT_PENDING || status === WO_STATUS_ACCEPT_PASS) return WO_STATUS_DONE;
  if (status === WO_STATUS_ACCEPT_REJECT) return WO_STATUS_FAILED;
  return status || WO_STATUS_DISPATCHED;
}

function normalizeWorkOrderRecord(wo) {
  if (!wo) return wo;
  wo.status = normalizeWorkOrderStatus(wo.status);
  if (!wo.repairConclusion) {
    if (wo.status === WO_STATUS_DONE) wo.repairConclusion = WO_STATUS_DONE;
    else if (wo.status === WO_STATUS_FAILED) wo.repairConclusion = WO_STATUS_FAILED;
  }
  if (Array.isArray(wo.nodes)) {
    wo.nodes = wo.nodes.filter(function (n) { return !n || n.stage !== '验收'; }).map(function (n) {
      if (!n) return n;
      if (n.stage === '完工' && (n.result === '已提交验收' || n.result === '验收通过' || n.result === WO_STATUS_ACCEPT_PASS)) {
        n.result = wo.repairConclusion || WO_STATUS_DONE;
      }
      if (n.stage === '完工' && (n.result === '验收驳回' || n.result === WO_STATUS_ACCEPT_REJECT)) {
        n.result = WO_STATUS_FAILED;
      }
      return n;
    });
  }
  if (!wo.finishTime && (wo.status === WO_STATUS_DONE || wo.status === WO_STATUS_FAILED)) {
    wo.finishTime = wo.acceptTime || wo.dispatchTime || '';
  }
  return wo;
}

function enrichWorkOrder(row) {
  const item = clone(normalizeWorkOrderRecord(row));
  item.statusClass = statusClass(item.status);
  item.assigneesText = (item.assignees || []).map(function (a) {
    return a.name || a.account || '';
  }).filter(Boolean).join('、') || '—';
  item.executorNameText = item.executorName || '—';
  item.finishTimeText = item.finishTime || '—';
  item.repairConclusionText = item.repairConclusion || '—';
  item.acceptOrVoidByText = item.status === WO_STATUS_VOID ? (item.voidByName || '—') : '—';
  item.acceptOrVoidTimeText = item.status === WO_STATUS_VOID ? (item.voidTime || '—') : '—';
  item.requestCodeText = item.requestCode || '—';
  item.assetCodeText = item.assetCode || '—';
  item.assetNameText = item.assetName || '—';
  item.dispatchTimeText = item.dispatchTime || '—';
  item.showAcceptSection = false;
  item.showConclusionSection = !!(item.repairConclusion || item.finishContent);
  item.showVoidSection = !!item.voidByName;
  item.acceptorNameText = item.acceptorName || '—';
  item.acceptTimeText = item.acceptTime || '—';
  item.voidByNameText = item.voidByName || '—';
  item.voidTimeText = item.voidTime || '—';
  item.timeline = buildWorkOrderTimeline(item);
  return attachWorkOrderActions(item, currentUser());
}

function timelineResultClass(result) {
  if (result === '验收通过' || result === '已接单' || result === '已派单' ||
      result === WO_STATUS_DONE || result === '维修完成（已完结）') return 'tag-success';
  if (result === '验收驳回' || result === '工单作废' || result === '审批驳回' ||
      result === WO_STATUS_FAILED || result === '维修失败（无法处理）') return 'tag-danger';
  if (result === '已提交验收') return 'tag-warning';
  return 'tag-info';
}

function timelineDotTone(result) {
  if (result === '验收通过' || result === '已接单' || result === '已派单' ||
      result === WO_STATUS_DONE || result === '维修完成（已完结）') return 'pass';
  if (result === '验收驳回' || result === '工单作废' || result === '审批驳回' ||
      result === WO_STATUS_FAILED || result === '维修失败（无法处理）') return 'reject';
  if (result === '已提交验收') return 'rectify';
  return 'discover';
}

/** 同 PC enrichWorkOrderTimelineNodes：补齐完工/验收/作废内容与媒体 */
function buildWorkOrderTimeline(wo) {
  let nodes = (wo.nodes || []).map(function (n) {
    return Object.assign({}, n);
  });
  if (!nodes.length) {
    nodes = synthesizeWorkOrderNodes(wo);
  }
  nodes.forEach(function (n) {
    if (n.stage === '完工') {
      if (!n.contentLabel) n.contentLabel = '维修内容';
      if (!n.contentText && wo.finishContent) n.contentText = wo.finishContent;
      if ((!n.images || !n.images.length) && wo.finishImages && wo.finishImages.length) {
        n.images = wo.finishImages.slice();
      }
      if (!n.imageLabel) n.imageLabel = '维修图片';
      if ((!n.attachments || !n.attachments.length) && wo.finishAttachments && wo.finishAttachments.length) {
        n.attachments = wo.finishAttachments.slice();
      }
      if (!n.attachmentLabel) n.attachmentLabel = '维修附件';
    }
    if (n.stage === '验收') {
      if (!n.contentLabel) n.contentLabel = '验收意见';
      if (!n.contentText && wo.acceptOpinion) n.contentText = wo.acceptOpinion;
      if ((!n.images || !n.images.length) && wo.acceptImages && wo.acceptImages.length) {
        n.images = wo.acceptImages.slice();
      }
      // acceptAttachments 可能混有图片与视频
      const acceptMedia = splitAcceptAttachments(wo.acceptAttachments);
      if ((!n.images || !n.images.length) && acceptMedia.images.length) {
        n.images = acceptMedia.images;
      }
      if ((!n.attachments || !n.attachments.length) && acceptMedia.videos.length) {
        n.attachments = acceptMedia.videos;
      }
      if (!n.imageLabel) n.imageLabel = '验收图片';
      if (!n.attachmentLabel) n.attachmentLabel = '验收附件';
    }
    if (n.stage === '作废') {
      if (!n.contentLabel) n.contentLabel = '作废原因';
      if (!n.contentText && wo.voidReason) n.contentText = wo.voidReason;
    }
    n.displayImages = normalizeTimelineImages(n.images);
    n.displayVideos = normalizeTimelineVideos(n.attachments);
    n.hasImages = n.displayImages.length > 0;
    n.hasVideos = n.displayVideos.length > 0;
    n.resultClass = timelineResultClass(n.result);
    n.dotTone = timelineDotTone(n.result);
    n.operatorDisplay = (n.operatorName || '—') +
      '（' + (n.operatorAccount || '—') +
      (n.operatorOrg ? ' · ' + n.operatorOrg : '') + '）';
    n.remarkText = n.remark && n.remark !== '—' && n.remark !== n.contentText
      ? n.remark
      : '';
    n.hasContent = !!(n.contentText);
    n.key = (n.stage || '') + '-' + (n.time || '') + '-' + (n.result || '');
  });
  return nodes;
}

function splitAcceptAttachments(list) {
  const images = [];
  const videos = [];
  (list || []).forEach(function (a) {
    if (!a) return;
    if (a.type === 'video' || /\.(mp4|mov|avi|webm)$/i.test(a.name || a.url || '')) {
      videos.push(a);
      return;
    }
    if (a.type === 'image' || a.url || a.path) {
      images.push(a);
    }
  });
  return { images: images, videos: videos };
}

function synthesizeWorkOrderNodes(wo) {
  const nodes = [];
  if (wo.dispatchTime) {
    nodes.push({
      stage: '派单',
      result: '已派单',
      time: wo.dispatchTime,
      operatorName: '系统',
      operatorAccount: '—',
      operatorOrg: '—',
      remark: ''
    });
  }
  if (wo.executorName && wo.status !== WO_STATUS_DISPATCHED) {
    nodes.push({
      stage: '接单',
      result: '已接单',
      time: wo.dispatchTime || wo.createdAt || '',
      operatorName: wo.executorName,
      operatorAccount: wo.executorAccount || '',
      operatorOrg: '—',
      remark: '开始维修处理'
    });
  }
  if (wo.finishTime) {
    nodes.push({
      stage: '完工',
      result: wo.finishConclusion || wo.status || WO_STATUS_DONE,
      time: wo.finishTime,
      operatorName: wo.executorName || '—',
      operatorAccount: wo.executorAccount || '',
      operatorOrg: '—',
      contentLabel: '维修内容',
      contentText: wo.finishContent || '',
      remark: ''
    });
  }
  // 终态无验收环节；历史验收节点由 normalizeWorkOrderRecord 清理
  if (wo.voidByName && wo.voidTime) {
    nodes.push({
      stage: '作废',
      result: '工单作废',
      time: wo.voidTime,
      operatorName: wo.voidByName,
      operatorAccount: wo.voidByAccount || '',
      operatorOrg: '—',
      contentLabel: '作废原因',
      contentText: wo.voidReason || '',
      remark: ''
    });
  }
  return nodes;
}

function pushWorkOrderNode(wo, stage, result, remark, extras) {
  extras = extras || {};
  const user = currentUser();
  wo.nodes = wo.nodes || [];
  const node = {
    stage: stage,
    result: result,
    time: nowStr(),
    operatorName: user.name || user.id || '',
    operatorAccount: user.id || '',
    operatorOrg: user.orgName || user.org || '—',
    remark: remark || ''
  };
  if (extras.contentLabel) node.contentLabel = extras.contentLabel;
  if (extras.contentText) node.contentText = extras.contentText;
  wo.nodes.push(node);
}

function isWorkOrderAssignee(row, user) {
  user = user || currentUser();
  if (!row) return false;
  const account = user.id || '';
  return (row.assignees || []).some(function (a) {
    return a.account === account;
  });
}

function isWorkOrderExecutor(row, user) {
  user = user || currentUser();
  if (!row) return false;
  return (row.executorAccount || '') === (user.id || '');
}

function attachWorkOrderActions(item, user) {
  user = user || currentUser();
  const canView = pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'view');
  const canTransfer = pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'transfer');
  const canVoid = pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'void');
  const isAssignee = isWorkOrderAssignee(item, user);
  const isExecutor = isWorkOrderExecutor(item, user);
  item.canView = canView;
  item.canAccept = item.status === WO_STATUS_DISPATCHED && isAssignee;
  item.canTransfer = item.status === WO_STATUS_DISPATCHED && canTransfer;
  item.canVoid = item.status === WO_STATUS_DISPATCHED && canVoid;
  item.canFinish = item.status === WO_STATUS_PROCESSING && isExecutor;
  item.canAcceptance = false;
  item.hasActions = !!(
    item.canView || item.canAccept || item.canTransfer || item.canVoid || item.canFinish
  );
  return item;
}

function seedRepairs() {
  const a1 = ASSETS.find(function (a) { return a.id === 'ast-001'; });
  const a4 = ASSETS.find(function (a) { return a.id === 'ast-004'; });
  const a8 = ASSETS.find(function (a) { return a.id === 'ast-008'; });
  const a3 = ASSETS.find(function (a) { return a.id === 'ast-003'; });
  return [
    {
      id: 'rp-001',
      code: 'BX-20260718-001',
      assetId: a4.id,
      assetCode: a4.code,
      assetName: a4.name,
      brand: a4.brand,
      model: a4.model,
      categoryName: a4.categoryName,
      regionName: a4.regionName,
      location: a4.location,
      reporterName: '李四',
      reporterAccount: 'lisi',
      orgId: 'ORG-003',
      orgName: '工程部',
      reportTime: '2026-07-18 10:30:00',
      reportMethod: '扫码填报',
      faultDesc: '运行异响，排水量下降，疑似叶轮磨损。',
      faultImages: [
        demoFaultImage('repair-pump-1', '泵体异响位置'),
        demoFaultImage('repair-pump-2', '排水口现场')
      ],
      videoAttachment: { name: '泵体异响录像.mp4', url: DEMO_VIDEO_SRC },
      faultLevel: '一般',
      status: '待审批',
      approverName: '',
      approverAccount: '',
      approveTime: '',
      approveRemark: '',
      workOrderCode: '',
      assignees: [],
      createdAt: '2026-07-18 10:30:00'
    },
    {
      id: 'rp-002',
      code: 'BX-20260710-002',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      brand: a1.brand,
      model: a1.model,
      categoryName: a1.categoryName,
      regionName: a1.regionName,
      location: a1.location,
      reporterName: '李四',
      reporterAccount: 'lisi',
      orgId: 'ORG-003',
      orgName: '工程部',
      reportTime: '2026-07-10 09:15:00',
      reportMethod: '手动填报',
      faultDesc: '机组运行时有异常振动，疑似轴承磨损，需现场检修。',
      faultImages: [
        demoFaultImage('repair-chiller-1', '机组振动现场'),
        demoFaultImage('repair-chiller-2', '轴承异常位置')
      ],
      videoAttachment: { name: '机组振动录像.mp4', url: DEMO_VIDEO_SRC },
      faultLevel: '紧急',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-07-10 10:00:00',
      approveRemark: '情况紧急，已安排工程维修组接单处理。',
      workOrderCode: 'WO-20260710-001',
      assignees: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      createdAt: '2026-07-10 09:15:00'
    },
    {
      id: 'rp-003',
      code: 'BX-20260705-003',
      assetId: a8.id,
      assetCode: a8.code,
      assetName: a8.name,
      brand: a8.brand,
      model: a8.model,
      categoryName: a8.categoryName,
      regionName: a8.regionName,
      location: a8.location,
      reporterName: '李四',
      reporterAccount: 'lisi',
      orgId: 'ORG-003',
      orgName: '工程部',
      reportTime: '2026-07-05 14:20:00',
      reportMethod: '扫码填报',
      faultDesc: '水泵偶发异响，经初步观察疑似误报。',
      faultImages: [
        demoFaultImage('repair-wp-1', '现场照片')
      ],
      videoAttachment: '',
      faultLevel: '轻微',
      status: '驳回报修(无需维修)',
      approverName: '张三',
      approverAccount: 'zhangsan',
      approveTime: '2026-07-05 16:00:00',
      approveRemark: '经核实为误报，设备运行正常，无需维修。',
      workOrderCode: '',
      assignees: [],
      createdAt: '2026-07-05 14:20:00'
    },
    {
      id: 'rp-004',
      code: 'BX-20260712-004',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      brand: a1.brand,
      model: a1.model,
      categoryName: a1.categoryName,
      regionName: a1.regionName,
      location: a1.location,
      reporterName: '赵六',
      reporterAccount: 'zhaoliu',
      orgId: 'ORG-003',
      orgName: '工程部',
      reportTime: '2026-07-12 11:20:00',
      reportMethod: '手动填报',
      faultDesc: '控制面板间歇告警，需现场核查。',
      faultImages: [demoFaultImage('repair-zhaoliu-1', '面板告警')],
      videoAttachment: '',
      faultLevel: '紧急',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-07-12 12:00:00',
      approveRemark: '指派李四处理',
      workOrderCode: 'WO-20260712-001',
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      createdAt: '2026-07-12 11:20:00'
    },
    {
      id: 'rp-005',
      code: 'BX-20260708-005',
      assetId: a3.id,
      assetCode: a3.code,
      assetName: a3.name,
      brand: a3.brand,
      model: a3.model,
      categoryName: a3.categoryName,
      regionName: a3.regionName,
      location: a3.location,
      reporterName: '周七',
      reporterAccount: 'zhouqi',
      orgId: 'ORG-001',
      orgName: '物业管理部',
      reportTime: '2026-07-08 09:00:00',
      reportMethod: '手动填报',
      faultDesc: '轿厢照明偶发不亮。',
      faultImages: [],
      videoAttachment: '',
      faultLevel: '轻微',
      status: '待审批',
      approverName: '',
      approverAccount: '',
      approveTime: '',
      approveRemark: '',
      workOrderCode: '',
      assignees: [],
      createdAt: '2026-07-08 09:00:00'
    },
    {
      id: 'rp-hist-1',
      code: 'BX-20260609-001',
      assetId: a4.id,
      assetCode: a4.code,
      assetName: a4.name,
      brand: a4.brand,
      model: a4.model,
      categoryName: a4.categoryName,
      regionName: a4.regionName,
      location: a4.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-06-09 09:20:00',
      reportMethod: '手动填报',
      faultDesc: '泵房漏水紧急维修。',
      faultImages: [demoFaultImage('repair-hist-pump-1', '泵房漏水现场')],
      videoAttachment: '',
      faultLevel: '紧急',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-06-09 10:00:00',
      approveRemark: '泵房漏水紧急维修',
      workOrderCode: 'WO-20260609-001',
      assignees: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      createdAt: '2026-06-09 09:20:00'
    },
    {
      id: 'rp-hist-2',
      code: 'BX-20260520-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      brand: a1.brand,
      model: a1.model,
      categoryName: a1.categoryName,
      regionName: a1.regionName,
      location: a1.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-05-20 08:30:00',
      reportMethod: '扫码填报',
      faultDesc: '冷媒泄漏，机组告警。',
      faultImages: [demoFaultImage('repair-hist-chiller-1', '冷媒泄漏位置')],
      videoAttachment: '',
      faultLevel: '紧急',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-05-20 09:00:00',
      approveRemark: '冷媒泄漏',
      workOrderCode: 'WO-20260520-001',
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      createdAt: '2026-05-20 08:30:00'
    },
    {
      id: 'rp-hist-3',
      code: 'BX-20260606-001',
      assetId: a3.id,
      assetCode: a3.code,
      assetName: a3.name,
      brand: a3.brand,
      model: a3.model,
      categoryName: a3.categoryName,
      regionName: a3.regionName,
      location: a3.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-06-06 07:40:00',
      reportMethod: '手动填报',
      faultDesc: '电梯门异响。',
      faultImages: [demoFaultImage('repair-hist-lift-1', '电梯门现场')],
      videoAttachment: '',
      faultLevel: '一般',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-06-06 08:00:00',
      approveRemark: '电梯门异响',
      workOrderCode: 'WO-20260606-001',
      assignees: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      createdAt: '2026-06-06 07:40:00'
    },
    {
      id: 'rp-hist-4',
      code: 'BX-20260604-001',
      assetId: a4.id,
      assetCode: a4.code,
      assetName: a4.name,
      brand: a4.brand,
      model: a4.model,
      categoryName: a4.categoryName,
      regionName: a4.regionName,
      location: a4.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-06-04 09:30:00',
      reportMethod: '手动填报',
      faultDesc: '投影无信号。',
      faultImages: [],
      videoAttachment: '',
      faultLevel: '轻微',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-06-04 10:00:00',
      approveRemark: '投影无信号',
      workOrderCode: 'WO-20260604-001',
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      createdAt: '2026-06-04 09:30:00'
    },
    {
      id: 'rp-void-demo',
      code: 'BX-20260726-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      brand: a1.brand,
      model: a1.model,
      categoryName: a1.categoryName,
      regionName: a1.regionName,
      location: a1.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-07-26 08:40:00',
      reportMethod: '扫码填报',
      faultDesc: '演示作废：设备疑似故障。',
      faultImages: [],
      videoAttachment: '',
      faultLevel: '一般',
      status: '已派单（生成工单）',
      approverName: '系统管理员',
      approverAccount: 'admin',
      approveTime: '2026-07-26 09:00:00',
      approveRemark: '演示作废：待维修人员接单前可作废',
      workOrderCode: 'WO-20260726-001',
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      createdAt: '2026-07-26 08:40:00'
    }
  ];
}

function seedWorkOrders() {
  const a1 = ASSETS.find(function (a) { return a.id === 'ast-001'; });
  const a4 = ASSETS.find(function (a) { return a.id === 'ast-004'; });
  const a3 = ASSETS.find(function (a) { return a.id === 'ast-003'; });
  const mediaPending = {
    finishImages: demoWoImages('wo-finish-pump', ['更换密封件', '试运行现场']),
    finishAttachments: [demoWoVideo('泵房维修完工.mp4')]
  };
  const mediaPass = {
    finishImages: demoWoImages('wo-finish-chiller', ['密封垫更换', '补充冷媒', '试机读数']),
    finishAttachments: [demoWoVideo('冷水机组试机.mp4')],
    acceptImages: demoWoImages('wo-accept-chiller', ['验收现场', '运行平稳确认']),
    acceptAttachments: [demoWoVideo('验收试机视频.mp4')]
  };
  const mediaReject = {
    finishImages: demoWoImages('wo-finish-lift', ['门机皮带更换', '门缝调整后']),
    finishAttachments: [demoWoVideo('电梯门机维修.mp4')],
    acceptImages: demoWoImages('wo-accept-lift', ['门缝测量', '驳回现场']),
    acceptAttachments: [demoWoVideo('验收驳回现场.mp4')]
  };
  return [
    {
      id: 'wo-001',
      code: 'WO-20260710-001',
      requestId: 'rp-002',
      requestCode: 'BX-20260710-002',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      dispatchTime: '2026-07-10 10:00:00',
      status: '已派单',
      executorName: '',
      executorAccount: '',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-07-10 10:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '情况紧急，已安排工程维修组接单处理。'
        }
      ],
      createdAt: '2026-07-10 10:00:00'
    },
    {
      id: 'wo-002',
      code: 'WO-20260712-001',
      requestId: 'rp-004',
      requestCode: 'BX-20260712-004',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      dispatchTime: '2026-07-12 12:00:00',
      status: '维修处理中',
      executorName: '李四',
      executorAccount: 'lisi',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-07-12 12:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '指派李四处理'
        },
        {
          stage: '接单', result: '已接单', time: '2026-07-12 12:20:00',
          operatorName: '李四', operatorAccount: 'lisi', operatorOrg: '工程部',
          remark: '开始维修处理'
        }
      ],
      createdAt: '2026-07-12 12:00:00'
    },
    {
      id: 'wo-003',
      code: 'WO-20260609-001',
      requestId: 'rp-hist-1',
      requestCode: 'BX-20260609-001',
      assetId: a4.id,
      assetCode: a4.code,
      assetName: a4.name,
      assignees: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      dispatchTime: '2026-06-09 10:00:00',
      status: '维修完成（已完结）',
      repairConclusion: '维修完成（已完结）',
      executorName: '赵六',
      executorAccount: 'zhaoliu',
      finishTime: '2026-06-09 16:30:00',
      finishContent: '更换叶轮密封件，试运行正常。',
      finishImages: mediaPending.finishImages.slice(),
      finishAttachments: mediaPending.finishAttachments.slice(),
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      acceptImages: [],
      acceptAttachments: [],
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-06-09 10:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '泵房漏水紧急维修'
        },
        {
          stage: '接单', result: '已接单', time: '2026-06-09 10:30:00',
          operatorName: '赵六', operatorAccount: 'zhaoliu', operatorOrg: '工程部',
          remark: '开始维修处理'
        },
        {
          stage: '完工', result: '维修完成（已完结）', time: '2026-06-09 16:30:00',
          operatorName: '赵六', operatorAccount: 'zhaoliu', operatorOrg: '工程部',
          contentLabel: '维修内容', contentText: '更换叶轮密封件，试运行正常。', remark: '',
          imageLabel: '维修图片', images: mediaPending.finishImages.slice(),
          attachmentLabel: '维修附件', attachments: mediaPending.finishAttachments.slice()
        }
      ],
      createdAt: '2026-06-09 10:00:00'
    },
    {
      id: 'wo-004',
      code: 'WO-20260520-001',
      requestId: 'rp-hist-2',
      requestCode: 'BX-20260520-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      dispatchTime: '2026-05-20 09:00:00',
      status: '维修完成（已完结）',
      repairConclusion: '维修完成（已完结）',
      executorName: '李四',
      executorAccount: 'lisi',
      finishTime: '2026-05-20 14:00:00',
      finishContent: '更换密封垫，补充冷媒，试机正常。',
      finishImages: mediaPass.finishImages.slice(),
      finishAttachments: mediaPass.finishAttachments.slice(),
      acceptorName: '',
      acceptorAccount: '',
      acceptTime: '',
      acceptOpinion: '',
      acceptImages: [],
      acceptAttachments: [],
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-05-20 09:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '冷媒泄漏'
        },
        {
          stage: '接单', result: '已接单', time: '2026-05-20 09:30:00',
          operatorName: '李四', operatorAccount: 'lisi', operatorOrg: '工程部',
          remark: '开始维修处理'
        },
        {
          stage: '完工', result: '维修完成（已完结）', time: '2026-05-20 14:00:00',
          operatorName: '李四', operatorAccount: 'lisi', operatorOrg: '工程部',
          contentLabel: '维修内容', contentText: '更换密封垫，补充冷媒，试机正常。', remark: '',
          imageLabel: '维修图片', images: mediaPass.finishImages.slice(),
          attachmentLabel: '维修附件', attachments: mediaPass.finishAttachments.slice()
        }
      ],
      createdAt: '2026-05-20 09:00:00'
    },
    {
      id: 'wo-005',
      code: 'WO-20260606-001',
      requestId: 'rp-hist-3',
      requestCode: 'BX-20260606-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      dispatchTime: '2026-06-06 08:00:00',
      status: '维修失败（无法处理）',
      repairConclusion: '维修失败（无法处理）',
      executorName: '李四',
      executorAccount: 'lisi',
      finishTime: '2026-06-06 12:00:00',
      finishContent: '更换门机皮带，调整门缝。',
      finishImages: mediaReject.finishImages.slice(),
      finishAttachments: mediaReject.finishAttachments.slice(),
      acceptorName: '',
      acceptorAccount: '',
      acceptTime: '',
      acceptOpinion: '',
      acceptImages: [],
      acceptAttachments: [],
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-06-06 08:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '电梯门异响'
        },
        {
          stage: '接单', result: '已接单', time: '2026-06-06 08:30:00',
          operatorName: '李四', operatorAccount: 'lisi', operatorOrg: '工程部',
          remark: '开始维修处理'
        },
        {
          stage: '完工', result: '维修失败（无法处理）', time: '2026-06-06 12:00:00',
          operatorName: '李四', operatorAccount: 'lisi', operatorOrg: '工程部',
          contentLabel: '维修内容', contentText: '更换门机皮带，调整门缝。', remark: '',
          imageLabel: '维修图片', images: mediaReject.finishImages.slice(),
          attachmentLabel: '维修附件', attachments: mediaReject.finishAttachments.slice()
        }
      ],
      createdAt: '2026-06-06 08:00:00'
    },
    {
      id: 'wo-006',
      code: 'WO-20260604-001',
      requestId: 'rp-hist-4',
      requestCode: 'BX-20260604-001',
      assetId: a4.id,
      assetCode: a4.code,
      assetName: a4.name,
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      dispatchTime: '2026-06-04 10:00:00',
      status: '工单作废',
      executorName: '',
      executorAccount: '',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '系统管理员',
      voidByAccount: 'admin',
      voidTime: '2026-06-04 11:00:00',
      voidReason: '报修人确认设备已自行恢复',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-06-04 10:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '投影无信号'
        },
        {
          stage: '作废', result: '工单作废', time: '2026-06-04 11:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          contentLabel: '作废原因', contentText: '报修人确认设备已自行恢复', remark: ''
        }
      ],
      createdAt: '2026-06-04 10:00:00'
    },
    {
      id: 'wo-void-demo',
      code: 'WO-20260726-001',
      requestId: 'rp-void-demo',
      requestCode: 'BX-20260726-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: [{ account: 'lisi', name: '李四', org: '工程部' }],
      dispatchTime: '2026-07-26 09:00:00',
      status: '已派单',
      executorName: '',
      executorAccount: '',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-07-26 09:00:00',
          operatorName: '系统管理员', operatorAccount: 'admin', operatorOrg: '大连国际航运中心大厦',
          remark: '演示作废：待维修人员接单前可作废'
        }
      ],
      createdAt: '2026-07-26 09:00:00'
    }
  ];
}

function demoInvImages(preset) {
  const seed = preset || 'site';
  return [
    {
      name: '现场照片1',
      path: 'https://picsum.photos/seed/inv-' + seed + '-1/400/400',
      url: 'https://picsum.photos/seed/inv-' + seed + '-1/1200/1200'
    },
    {
      name: '现场照片2',
      path: 'https://picsum.photos/seed/inv-' + seed + '-2/400/400',
      url: 'https://picsum.photos/seed/inv-' + seed + '-2/1200/1200'
    }
  ];
}

function normalizeInvImages(images) {
  return (images || []).map(function (img, idx) {
    if (typeof img === 'string') {
      return { name: '盘点图片' + (idx + 1), path: img, url: img };
    }
    const path = img.path || img.url || '';
    const url = img.url || img.path || path;
    return {
      name: img.name || ('盘点图片' + (idx + 1)),
      path: path,
      url: url
    };
  }).filter(function (img) { return !!img.path; });
}

function enrichInventoryItemDisplay(it) {
  if (it.invStatus === '已盘') it.invStatus = '相符';
  const images = normalizeInvImages(it.invImages);
  it.invImages = images;
  it.invImageUrls = images.map(function (img) { return img.url || img.path; });
  it.hasInvImages = images.length > 0;
  it.invImagesText = images.length ? (images.length + ' 张') : '—';
  it.statusClass = statusClass(it.invStatus);
  it.invRemarkText = it.invStatus === '盘盈' ? '—' : (it.invRemark || '—');
  it.operatorNameText = it.operatorName || '—';
  it.invTimeText = it.invTime || '—';
  return it;
}

function buildItem(asset, invStatus) {
  return {
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    categoryName: asset.categoryName || '—',
    orgName: asset.orgName || '—',
    regionName: asset.regionName || '—',
    location: asset.location || '—',
    tagType: asset.tagType || '—',
    snapshotStatus: asset.status || '使用中',
    purchaseMethod: asset.purchaseMethod || '—',
    invStatus: invStatus || '未盘',
    invRemark: '',
    invImages: [],
    invTime: '',
    operatorName: '',
    scanMethod: '',
    auditStatus: '未审核',
    auditResult: '',
    auditRemark: '',
    auditedAt: '',
    auditedBy: ''
  };
}

function joinScopeNames(list, emptyLabel) {
  const names = (list || []).filter(Boolean);
  return names.length ? names.join('、') : (emptyLabel || '全部');
}

function buildScopeFieldTexts(scope) {
  scope = scope || {};
  return {
    org: joinScopeNames(scope.orgNames || scope.orgIds),
    region: joinScopeNames(scope.regionNames || scope.regionIds),
    category: joinScopeNames(scope.categoryNames || scope.categoryIds),
    status: (scope.statuses && scope.statuses.length)
      ? scope.statuses.join('、')
      : '全部（使用中、维修中）',
    purchaseMethod: joinScopeNames(scope.purchaseMethods)
  };
}

function buildScopeSummary(scope) {
  const fields = buildScopeFieldTexts(scope);
  const parts = [fields.org, fields.region, fields.category, fields.status, fields.purchaseMethod]
    .filter(function (v) { return v && v !== '全部' && v.indexOf('全部（') !== 0; });
  return parts.length ? parts.join(' · ') : '发起人权限范围内全部使用中/维修中资产';
}

function counterNamesText(task) {
  const names = (task.counters || []).map(function (c) { return c.name || c.account; }).filter(Boolean);
  return names.length ? names.join('、') : '—';
}

function isInventoryMine(task, user) {
  if (!task || !user || !user.id) return false;
  return (task.counters || []).some(function (c) { return c.account === user.id; });
}

function isInventoryCreator(task, user) {
  if (!task || !user) return false;
  const account = user.id || '';
  if (task.creatorAccount && task.creatorAccount === account) return true;
  return !!(task.creatorName && user.name && task.creatorName === user.name);
}

/** 同 PC：自己创建 OR 任一盘点人组织 ∈ 数据权限组织 */
function isInventoryInOrgScope(task, user) {
  if (!task) return false;
  const scope = dataScope.resolveDataScope(user);
  if (scope.all) return true;
  if (isInventoryCreator(task, user)) return true;
  return (task.counters || []).some(function (c) {
    if (!c) return false;
    if (c.org && dataScope.isOrgNameInScope(c.org, scope)) return true;
    const profile = dataScope.getUserProfile(c.account);
    if (profile && profile.orgId) return dataScope.isOrgInScope(profile.orgId, scope);
    return false;
  });
}

function todayStr() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function addDaysStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function isInventoryPlanOverdue(planEndDate) {
  // 计划结束日期当天仍未逾期，仅今天严格晚于结束日期才算逾期
  return !!(planEndDate && planEndDate < todayStr());
}

function normalizeInventoryPlanDates(task) {
  if (!task) return task;
  var start = String(task.planStartDate || task.planDate || '').trim();
  var end = String(task.planEndDate || '').trim();
  if (!start && end) start = end;
  if (!end && start) end = start;
  task.planStartDate = start;
  task.planEndDate = end;
  task.planDate = start;
  return task;
}

function computeInventoryStatus(task) {
  normalizeInventoryPlanDates(task);
  const total = (task.progress && task.progress.total != null)
    ? task.progress.total
    : ((task.items || []).length);
  const done = (task.progress && task.progress.done != null)
    ? task.progress.done
    : ((task.items || []).filter(function (it) {
      return it.invStatus && it.invStatus !== '未盘';
    }).length);

  if (total > 0 && done >= total) return '盘点完成';
  if (isInventoryPlanOverdue(task.planEndDate)) return '未完成';
  if (done === 0) return '待盘点';
  return '盘点中';
}

function computeCompletedAt(task) {
  if (task.completedAt) return task.completedAt;
  const times = (task.items || [])
    .filter(function (it) { return it.invStatus && it.invStatus !== '未盘'; })
    .map(function (it) { return (it.invTime || '').trim(); })
    .filter(Boolean)
    .sort();
  return times.length ? times[times.length - 1] : '';
}

function syncInventoryTaskStatus(task) {
  if (!task) return task;
  normalizeInventoryPlanDates(task);
  const total = (task.items || []).length;
  const done = (task.items || []).filter(function (it) {
    return it.invStatus && it.invStatus !== '未盘';
  }).length;
  task.progress = { done: done, total: total };
  task.status = computeInventoryStatus(task);
  task.completedAt = task.status === '盘点完成'
    ? (computeCompletedAt(task) || nowStr())
    : '';
  return task;
}

function enrichInventoryRow(task, user) {
  syncInventoryTaskStatus(task);
  const row = clone(task);
  const scopeFields = buildScopeFieldTexts(row.scope);
  row.scopeFields = scopeFields;
  row.scopeSummary = row.scopeSummary || buildScopeSummary(row.scope);
  row.statusClass = statusClass(row.status);
  row.progressText = (row.progress.done || 0) + '/' + (row.progress.total || 0);
  row.countersText = counterNamesText(row);
  row.planStartDate = row.planStartDate || row.planDate || '';
  row.planEndDate = row.planEndDate || row.planStartDate || '';
  row.completedAtText = row.status === '盘点完成' ? (row.completedAt || '—') : '—';
  row.creatorName = row.creatorName || '—';
  row.createdAt = row.createdAt || '—';
  row.remark = row.remark || '';
  row.isMine = isInventoryMine(row, user);
  // 去执行：仅盘点人，不挂角色操作权限（与 PC 一致）
  row.canExecute = row.isMine && row.status !== '盘点完成';
  // 盘点明细：角色「盘点明细」权限
  row.canViewDetail = pagePerm.canPageAction(user.role, INV_PAGE_ID, 'detail');
  // 查看报告：盘点完成 + 角色「查看报告」权限
  row.canViewReport = row.status === '盘点完成' &&
    pagePerm.canPageAction(user.role, INV_PAGE_ID, 'report');
  // 审核报告：盘点完成 + 有未审核异常项 + 角色「审核报告」权限
  row.canAuditReport = canShowAuditReport(row, user);
  return row;
}

function isTaskReportFullyAudited(task) {
  const reportItems = getReportInventoryItems(task);
  if (!reportItems.length) return true;
  return reportItems.every(function (item) { return item.auditStatus === '已审核'; });
}

function canShowAuditReport(task, user) {
  if (!task || !user) return false;
  if (task.status !== '盘点完成') return false;
  if (!pagePerm.canPageAction(user.role, INV_PAGE_ID, 'audit')) return false;
  const reportItems = getReportInventoryItems(task);
  if (!reportItems.length) return false;
  return !isTaskReportFullyAudited(task);
}

function getInventoryAuditOptions(invStatus, liveStatus) {
  if (invStatus === '盘盈') {
    return {
      title: '审核盘盈资产',
      hint: '核准入账后系统将自动新增录入资产台账；不予核准则不处理',
      options: ['核准入账', '不予核准']
    };
  }
  if (invStatus === '盘亏') {
    var shortageHint = '核准销账后系统将变更为已丢失；若台账已是更高优先级状态则保持不变';
    if (liveStatus === '已丢失') {
      shortageHint = '当前台账已是已丢失，核准销账仅保留审核记录';
    } else if (liveStatus === '已报废') {
      shortageHint = '当前台账已是已报废，核准销账仅保留审核记录';
    }
    return {
      title: '审核盘亏资产',
      hint: shortageHint,
      options: ['核准销账', '不予核准']
    };
  }
  if (liveStatus === '已报废' || liveStatus === '已丢失') {
    return {
      title: '审核异常资产',
      hint: '当前台账已是终态（' + liveStatus + '），核准调整仅保留审核记录',
      options: ['核准调整', '不予核准']
    };
  }
  return {
    title: '审核异常资产',
    hint: '核准调整后需手动在资产台账中修改异常数据；不予核准则不处理',
    options: ['核准调整', '不予核准']
  };
}

function getLiveLedgerStatus(item) {
  if (!item) return '';
  const asset = ASSETS.find(function (a) {
    return a.id === item.assetId || (item.assetCode && a.code === item.assetCode);
  });
  return asset ? (asset.status || '') : '';
}

function isReportInventoryItem(item) {
  return item && INV_REPORT_STATUSES.indexOf(item.invStatus) >= 0;
}

function getReportInventoryItems(task) {
  return (task.items || []).filter(isReportInventoryItem);
}

function computeReportStats(task) {
  const items = task.items || [];
  const reportItems = getReportInventoryItems(task);
  return {
    total: items.length,
    normal: items.filter(function (i) { return i.invStatus === '相符' || i.invStatus === '已盘'; }).length,
    abnormal: items.filter(function (i) { return i.invStatus === '异常'; }).length,
    shortage: items.filter(function (i) { return i.invStatus === '盘亏'; }).length,
    surplus: items.filter(function (i) { return i.invStatus === '盘盈'; }).length,
    reportCount: reportItems.length,
    auditedCount: reportItems.filter(function (i) { return i.auditStatus === '已审核'; }).length
  };
}

function seedInventories() {
  const a1 = ASSETS.find(function (a) { return a.id === 'ast-001'; });
  const a4 = ASSETS.find(function (a) { return a.id === 'ast-004'; });
  const a7 = ASSETS.find(function (a) { return a.id === 'ast-007'; });
  const a8 = ASSETS.find(function (a) { return a.id === 'ast-008'; });
  const a10 = ASSETS.find(function (a) { return a.id === 'ast-010'; });
  const a3 = ASSETS.find(function (a) { return a.id === 'ast-003'; });
  const a11 = ASSETS.find(function (a) { return a.id === 'ast-011'; });
  return [
    {
      id: 'inv-001',
      code: 'PD-20260714-001',
      name: 'B1/B2 机电设备月度盘点',
      planStartDate: addDaysStr(7),
      planEndDate: addDaysStr(14),
      planDate: addDaysStr(7),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['地下一层', '15层'],
        categoryNames: ['制冷设备', '给排水', '强电'],
        statuses: ['使用中'],
        purchaseMethods: ['采购']
      },
      counters: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      status: '盘点中',
      progress: { done: 1, total: 4 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-07-14 09:00:00',
      completedAt: '',
      items: [
        Object.assign(buildItem(a1, '相符'), {
          invRemark: '现场核对正常',
          invTime: '2026-07-21 09:20:00',
          operatorName: '李四',
          scanMethod: '二维码',
          invImages: demoInvImages('checked')
        }),
        buildItem(a4, '未盘'),
        buildItem(a7, '未盘'),
        buildItem(a10, '未盘')
      ],
      remark: '请通过资产二维码或 NFC 标签现场核对'
    },
    {
      id: 'inv-002',
      code: 'PD-20260710-002',
      name: '给排水专项盘点',
      planStartDate: addDaysStr(10),
      planEndDate: addDaysStr(17),
      planDate: addDaysStr(10),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['地下一层'],
        categoryNames: ['给排水'],
        statuses: ['使用中'],
        purchaseMethods: []
      },
      counters: [{ account: 'lisi', name: '李四', org: '工程部' }],
      status: '待盘点',
      progress: { done: 0, total: 2 },
      creatorName: '李四',
      creatorAccount: 'lisi',
      createdAt: '2026-07-10 10:30:00',
      completedAt: '',
      items: [buildItem(a4, '未盘'), buildItem(a8, '未盘')],
      remark: '仅指派李四执行（我的盘点演示）'
    },
    {
      id: 'inv-005',
      code: 'PD-20260705-005',
      name: '地下一层补盘（逾期未完成）',
      planStartDate: addDaysStr(-14),
      planEndDate: addDaysStr(-8),
      planDate: addDaysStr(-14),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['地下一层'],
        categoryNames: ['强电'],
        statuses: ['使用中'],
        purchaseMethods: ['采购']
      },
      counters: [
        { account: 'lisi', name: '李四', org: '工程部' },
        { account: 'zhaoliu', name: '赵六', org: '工程部' }
      ],
      status: '未完成',
      progress: { done: 1, total: 2 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-07-01 09:00:00',
      completedAt: '',
      items: [
        Object.assign(buildItem(a10, '相符'), {
          invTime: '2026-07-06 10:00:00',
          operatorName: '李四',
          scanMethod: '二维码',
          invImages: demoInvImages('site')
        }),
        buildItem(a8, '未盘')
      ],
      remark: '已过计划盘点日期且进度未满 → 未完成'
    },
    {
      id: 'inv-003',
      code: 'PD-20260630-003',
      name: '6 月暖通专项盘点',
      planStartDate: '2026-06-20',
      planEndDate: '2026-06-30',
      planDate: '2026-06-20',
      scope: {
        orgNames: ['工程部'],
        regionNames: ['15层', '地下一层'],
        categoryNames: ['制冷设备'],
        statuses: ['使用中'],
        purchaseMethods: ['采购']
      },
      counters: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      status: '盘点完成',
      progress: { done: 3, total: 3 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-06-25 11:00:00',
      completedAt: '2026-06-30 14:25:00',
      items: [
        Object.assign(buildItem(a7, '相符'), {
          invTime: '2026-06-30 14:10:00', operatorName: '赵六', scanMethod: 'NFC',
          invImages: demoInvImages('checked')
        }),
        Object.assign(buildItem(a1, '异常'), {
          invRemark: '铭牌型号与台账不一致',
          invTime: '2026-06-30 14:20:00',
          operatorName: '赵六',
          scanMethod: '二维码',
          invImages: demoInvImages('abnormal'),
          auditStatus: '已审核',
          auditResult: '核准调整',
          auditRemark: '已通知工程部核对并更新台账',
          auditedAt: '2026-07-01 10:00:00',
          auditedBy: '系统管理员'
        }),
        Object.assign(buildItem(a4, '盘亏'), {
          invRemark: '现场未找到设备',
          invTime: '2026-06-30 14:25:00',
          operatorName: '赵六',
          scanMethod: '手动',
          invImages: demoInvImages('shortage'),
          auditStatus: '未审核'
        })
      ],
      remark: '含异常/盘亏，用于查看报告演示（仅指派赵六；李四在组织盘点可见但不可执行）'
    },
    {
      id: 'inv-006',
      code: 'PD-20260720-006',
      name: '冷却塔专项盘点（他人执行）',
      planStartDate: addDaysStr(-1),
      planEndDate: addDaysStr(5),
      planDate: addDaysStr(-1),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['15层'],
        categoryNames: ['制冷设备'],
        statuses: ['使用中'],
        purchaseMethods: ['采购']
      },
      counters: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      status: '待盘点',
      progress: { done: 0, total: 1 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-07-20 09:00:00',
      completedAt: '',
      items: [buildItem(a7, '未盘')],
      remark: '组织盘点演示：仅赵六为盘点人；李四可见不可「去执行」'
    },
    {
      id: 'inv-007',
      code: 'PD-20260712-007',
      name: '给排水巡检盘点（他人执行中）',
      planStartDate: addDaysStr(-2),
      planEndDate: addDaysStr(3),
      planDate: addDaysStr(-2),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['地下一层'],
        categoryNames: ['给排水'],
        statuses: ['使用中'],
        purchaseMethods: []
      },
      counters: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      status: '盘点中',
      progress: { done: 1, total: 2 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-07-12 11:20:00',
      completedAt: '',
      items: [
        Object.assign(buildItem(a4, '相符'), {
          invRemark: '现场正常',
          invTime: '2026-07-22 10:05:00',
          operatorName: '赵六',
          scanMethod: '二维码',
          invImages: demoInvImages('checked')
        }),
        buildItem(a8, '未盘')
      ],
      remark: '组织盘点演示：执行人为赵六，非当前登录李四'
    },
    {
      id: 'inv-008',
      code: 'PD-20260620-008',
      name: '强电补盘（他人逾期未完成）',
      planStartDate: addDaysStr(-12),
      planEndDate: addDaysStr(-5),
      planDate: addDaysStr(-12),
      scope: {
        orgNames: ['工程部'],
        regionNames: ['地下一层'],
        categoryNames: ['强电'],
        statuses: ['使用中'],
        purchaseMethods: ['采购']
      },
      counters: [{ account: 'zhaoliu', name: '赵六', org: '工程部' }],
      status: '未完成',
      progress: { done: 0, total: 1 },
      creatorName: '系统管理员',
      creatorAccount: 'admin',
      createdAt: '2026-06-15 14:00:00',
      completedAt: '',
      items: [buildItem(a10, '未盘')],
      remark: '组织盘点演示：仅赵六执行且已逾期；李四组织内可见'
    },
    {
      id: 'inv-004',
      code: 'PD-20260628-004',
      name: '物业电梯与安防盘点',
      planStartDate: '2026-06-18',
      planEndDate: '2026-06-28',
      planDate: '2026-06-18',
      scope: {
        orgNames: ['物业管理部'],
        regionNames: ['1层', '15层'],
        categoryNames: ['电梯', '弱电安防'],
        statuses: [],
        purchaseMethods: []
      },
      counters: [{ account: 'zhangsan', name: '张三', org: '安保部' }],
      status: '待盘点',
      progress: { done: 0, total: 2 },
      creatorName: '张三',
      creatorAccount: 'zhangsan',
      createdAt: '2026-06-20 16:00:00',
      completedAt: '',
      items: [buildItem(a3, '未盘'), buildItem(a11, '未盘')],
      remark: '工程部账号在组织权限内不可见'
    }
  ];
}

let inventories = seedInventories();
let repairs = seedRepairs();
let workOrders = seedWorkOrders();

/** 为当前登录账号注入「已派单」接单演示工单 */
function buildCurrentUserAcceptSeeds(assignee) {
  const a1 = ASSETS.find(function (a) { return a.id === 'ast-001'; }) || ASSETS[0];
  const a2 = ASSETS.find(function (a) { return a.id === 'ast-002'; }) || ASSETS[1] || a1;
  const solo = [Object.assign({}, assignee)];
  let withPeer = [
    Object.assign({}, assignee),
    { account: 'lisi', name: '李四', org: '工程部' }
  ];
  if (assignee.account === 'lisi') {
    withPeer = [
      Object.assign({}, assignee),
      { account: 'zhaoliu', name: '赵六', org: '工程部' }
    ];
  }
  const requests = [
    {
      id: 'rp-accept-me-001',
      code: 'BX-ACCEPT-ME-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      brand: a1.brand,
      model: a1.model,
      categoryName: a1.categoryName,
      regionName: a1.regionName,
      location: a1.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-08-05 09:00:00',
      reportMethod: '手动填报',
      faultDesc: '【接单演示】机组异响，已指派当前登录账号，可测接单。',
      faultImages: [],
      videoAttachment: null,
      faultLevel: '一般',
      status: '已派单（生成工单）',
      approverName: '张三',
      approverAccount: 'zhangsan',
      approveTime: '2026-08-05 09:30:00',
      approveRemark: '指派当前登录账号接单',
      workOrderCode: 'WO-ACCEPT-ME-001',
      assignees: solo.slice(),
      createdAt: '2026-08-05 09:00:00'
    },
    {
      id: 'rp-accept-me-002',
      code: 'BX-ACCEPT-ME-002',
      assetId: a2.id,
      assetCode: a2.code,
      assetName: a2.name,
      brand: a2.brand,
      model: a2.model,
      categoryName: a2.categoryName,
      regionName: a2.regionName,
      location: a2.location,
      reporterName: '王五',
      reporterAccount: 'wangwu',
      orgId: 'ORG-004',
      orgName: '客服部',
      reportTime: '2026-08-05 10:00:00',
      reportMethod: '扫码填报',
      faultDesc: '【接单演示】出风异常，多人指派含当前登录账号。',
      faultImages: [],
      videoAttachment: null,
      faultLevel: '紧急',
      status: '已派单（生成工单）',
      approverName: '张三',
      approverAccount: 'zhangsan',
      approveTime: '2026-08-05 10:20:00',
      approveRemark: '指派当前登录账号与工程部协同',
      workOrderCode: 'WO-ACCEPT-ME-002',
      assignees: withPeer.slice(),
      createdAt: '2026-08-05 10:00:00'
    }
  ];
  const orders = [
    {
      id: 'wo-accept-me-001',
      code: 'WO-ACCEPT-ME-001',
      requestId: 'rp-accept-me-001',
      requestCode: 'BX-ACCEPT-ME-001',
      assetId: a1.id,
      assetCode: a1.code,
      assetName: a1.name,
      assignees: solo.slice(),
      dispatchTime: '2026-08-05 09:30:00',
      status: '已派单',
      executorName: '',
      executorAccount: '',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-08-05 09:30:00',
          operatorName: '张三', operatorAccount: 'zhangsan', operatorOrg: '安保部',
          remark: '指派 ' + (assignee.name || assignee.account) + ' 接单（接单演示）'
        }
      ],
      createdAt: '2026-08-05 09:30:00'
    },
    {
      id: 'wo-accept-me-002',
      code: 'WO-ACCEPT-ME-002',
      requestId: 'rp-accept-me-002',
      requestCode: 'BX-ACCEPT-ME-002',
      assetId: a2.id,
      assetCode: a2.code,
      assetName: a2.name,
      assignees: withPeer.slice(),
      dispatchTime: '2026-08-05 10:20:00',
      status: '已派单',
      executorName: '',
      executorAccount: '',
      finishTime: '',
      finishContent: '',
      acceptorName: '',
      acceptTime: '',
      acceptOpinion: '',
      voidByName: '',
      voidTime: '',
      voidReason: '',
      nodes: [
        {
          stage: '派单', result: '已派单', time: '2026-08-05 10:20:00',
          operatorName: '张三', operatorAccount: 'zhangsan', operatorOrg: '安保部',
          remark: '指派 ' + (assignee.name || assignee.account) + ' 等接单（接单演示）'
        }
      ],
      createdAt: '2026-08-05 10:20:00'
    }
  ];
  return { requests: requests, workOrders: orders };
}

let acceptMeSeedMarker = '';

function resetMiniWorkOrderToDispatched(target, seed) {
  target.status = WO_STATUS_DISPATCHED;
  target.assignees = (seed.assignees || []).map(function (a) { return Object.assign({}, a); });
  target.executorName = '';
  target.executorAccount = '';
  target.finishTime = '';
  target.finishContent = '';
  target.finishImages = [];
  target.finishAttachments = [];
  target.repairConclusion = '';
  target.acceptorName = '';
  target.acceptTime = '';
  target.acceptOpinion = '';
  target.voidByName = '';
  target.voidTime = '';
  target.voidReason = '';
  target.dispatchTime = seed.dispatchTime;
  target.nodes = (seed.nodes || []).map(function (n) { return Object.assign({}, n); });
}

function ensureCurrentUserAcceptSeedData() {
  const user = currentUser();
  if (!user || !user.id) return;
  const profile = mockUsers[user.id] || user;
  const assignee = {
    account: user.id,
    name: profile.name || user.name || user.id,
    org: profile.dept || profile.orgName || ''
  };
  const expect = 'v1:' + user.id;
  const forceReset = acceptMeSeedMarker !== expect;
  const seeds = buildCurrentUserAcceptSeeds(assignee);

  seeds.requests.forEach(function (req) {
    const existing = repairs.find(function (r) { return r.id === req.id || r.code === req.code; });
    if (!existing) {
      repairs.unshift(req);
      return;
    }
    if (forceReset) {
      existing.assignees = (req.assignees || []).map(function (a) { return Object.assign({}, a); });
      existing.status = REQ_STATUS_DISPATCHED;
      existing.workOrderCode = req.workOrderCode;
    }
  });

  seeds.workOrders.forEach(function (wo) {
    const existing = workOrders.find(function (w) { return w.id === wo.id || w.code === wo.code; });
    if (!existing) {
      workOrders.unshift(wo);
      return;
    }
    if (forceReset) {
      resetMiniWorkOrderToDispatched(existing, wo);
    } else {
      const hasMe = (existing.assignees || []).some(function (a) { return a.account === user.id; });
      if (!hasMe) {
        existing.assignees = (wo.assignees || []).map(function (a) { return Object.assign({}, a); });
      }
    }
  });

  const hasAcceptable = workOrders.some(function (w) {
    return w && w.status === WO_STATUS_DISPATCHED &&
      (w.assignees || []).some(function (a) { return a.account === user.id; });
  });
  if (!hasAcceptable) {
    const demo = seeds.workOrders[0];
    const existingDemo = workOrders.find(function (w) { return w.id === demo.id || w.code === demo.code; });
    if (existingDemo) resetMiniWorkOrderToDispatched(existingDemo, demo);
    else workOrders.unshift(demo);
  }

  if (forceReset) acceptMeSeedMarker = expect;
  syncStatusesFromRepair();
}

/** 是否存在未完结维修工单（非作废、非验收通过） */
function hasActiveRepairWorkOrder(asset) {
  if (!asset) return false;
  return (workOrders || []).some(function (wo) {
    if (!wo || REPAIR_WO_CLOSED[wo.status]) return false;
    return (asset.code && wo.assetCode === asset.code) ||
      (asset.id && wo.assetId === asset.id);
  });
}

/**
 * 同 PC getAssetStatus：已丢失保留；有进行中工单→维修中；否则维修中回落使用中
 */
function getAssetStatus(asset) {
  if (!asset) return ASSET_STATUS_IN_USE;
  const stored = asset.status || ASSET_STATUS_IN_USE;
  if (stored === ASSET_STATUS_LOST || stored === ASSET_STATUS_SCRAPPED) return stored;
  if (hasActiveRepairWorkOrder(asset)) return ASSET_STATUS_MAINT;
  if (stored === ASSET_STATUS_MAINT) return ASSET_STATUS_IN_USE;
  return stored;
}

/** 维修工单变更后回写台账状态 */
function syncStatusesFromRepair() {
  let changed = 0;
  (ASSETS || []).forEach(function (asset) {
    const next = getAssetStatus(asset);
    if (asset.status !== next) {
      asset.status = next;
      asset.changeAt = nowStr();
      changed += 1;
    }
  });
  return changed;
}

// 种子工单加载后对齐台账；接单演示数据改为首次访问工单时懒注入，避免模块加载期过重
syncStatusesFromRepair();

/** 热更新后内存清单可能仍是旧种子：按 id 补齐缺失演示单（不覆盖已有盘点进度） */
function ensureInventorySeeds() {
  const seeded = seedInventories();
  const have = {};
  (inventories || []).forEach(function (t) {
    if (t && t.id) have[t.id] = true;
  });
  seeded.forEach(function (t) {
    if (t && t.id && !have[t.id]) {
      inventories.push(t);
    }
  });
}

function recomputeProgress(task) {
  syncInventoryTaskStatus(task);
}

function listInventories(filter, scope, query) {
  ensureInventorySeeds();
  query = query || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, INV_PAGE_ID, 'view')) {
    return { ok: false, message: '当前账号无资产盘点查看权限', list: [] };
  }
  const listScope = scope === 'mine' ? 'mine' : 'org';
  const statusFilter = query.status != null && query.status !== ''
    ? query.status
    : (filter || 'all');
  const keyword = String(query.keyword || '').trim().toLowerCase();
  let list = inventories.filter(function (t) {
    if (listScope === 'mine') return isInventoryMine(t, user);
    return isInventoryInOrgScope(t, user);
  });
  if (statusFilter && statusFilter !== 'all') {
    list = list.filter(function (t) {
      syncInventoryTaskStatus(t);
      return t.status === statusFilter;
    });
  } else {
    list.forEach(syncInventoryTaskStatus);
  }
  if (keyword) {
    list = list.filter(function (t) {
      const counters = (t.counters || []).map(function (c) {
        if (typeof c === 'string') return c;
        return (c && (c.name || c.account || c.id)) || '';
      }).join(' ');
      const blob = [
        t.code, t.name, t.creatorName, t.creatorAccount, counters, t.remark
      ].join(' ').toLowerCase();
      return blob.indexOf(keyword) >= 0;
    });
  }
  return {
    ok: true,
    list: list.map(function (t) { return enrichInventoryRow(t, user); })
  };
}

function getInventory(id) {
  ensureInventorySeeds();
  const user = currentUser();
  const task = inventories.find(function (t) { return t.id === id || t.code === id; });
  if (!task) return null;
  if (!isInventoryMine(task, user) && !isInventoryInOrgScope(task, user)) {
    return null;
  }
  const row = enrichInventoryRow(task, user);
  row.items = (row.items || []).map(function (it) {
    return enrichInventoryItemDisplay(it);
  });
  return row;
}

/** 盘点明细（只读；需 detail 权限） */
function getInventoryDetail(id) {
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, INV_PAGE_ID, 'detail')) {
    return { ok: false, message: '当前账号无盘点明细权限' };
  }
  const task = inventories.find(function (t) { return t.id === id || t.code === id; });
  if (!task) return { ok: false, message: '任务不存在' };
  if (!isInventoryMine(task, user) && !isInventoryInOrgScope(task, user)) {
    return { ok: false, message: '无权查看该盘点单' };
  }
  syncInventoryTaskStatus(task);
  const row = enrichInventoryRow(task, user);
  const items = (task.items || []).map(function (it) {
    return enrichInventoryItemDisplay(clone(it));
  });
  const stats = {
    total: items.length,
    pending: items.filter(function (i) { return i.invStatus === '未盘'; }).length,
    done: items.filter(function (i) { return i.invStatus && i.invStatus !== '未盘'; }).length,
    normal: items.filter(function (i) { return i.invStatus === '相符' || i.invStatus === '已盘'; }).length,
    abnormal: items.filter(function (i) { return i.invStatus === '异常'; }).length,
    shortage: items.filter(function (i) { return i.invStatus === '盘亏'; }).length,
    surplus: items.filter(function (i) { return i.invStatus === '盘盈'; }).length
  };
  return { ok: true, task: row, items: items, stats: stats };
}

/** 查看/审核报告（查看需 report；审核模式需 audit） */
function getInventoryReport(id, opts) {
  opts = opts || {};
  const auditMode = !!opts.auditMode;
  const user = currentUser();
  const needAction = auditMode ? 'audit' : 'report';
  if (!pagePerm.canPageAction(user.role, INV_PAGE_ID, needAction)) {
    return {
      ok: false,
      message: auditMode ? '当前账号无审核报告权限' : '当前账号无查看报告权限'
    };
  }
  const task = inventories.find(function (t) { return t.id === id || t.code === id; });
  if (!task) return { ok: false, message: '任务不存在' };
  if (!isInventoryMine(task, user) && !isInventoryInOrgScope(task, user)) {
    return { ok: false, message: '无权查看该盘点单' };
  }
  syncInventoryTaskStatus(task);
  if (task.status !== '盘点完成') {
    return { ok: false, message: auditMode ? '仅盘点完成状态可审核报告' : '仅盘点完成状态可查看报告' };
  }
  const reportRaw = getReportInventoryItems(task);
  if (auditMode && !reportRaw.length) {
    return { ok: false, message: '本次盘点无异常、盘亏或盘盈记录，无需审核' };
  }
  if (auditMode && isTaskReportFullyAudited(task)) {
    return { ok: false, message: '报告项已全部审核完成' };
  }
  const row = enrichInventoryRow(task, user);
  const stats = computeReportStats(task);
  const reportItems = reportRaw.map(function (it) {
    const item = enrichInventoryItemDisplay(clone(it));
    item.auditStatusText = item.auditStatus || '未审核';
    item.auditResultText = item.auditResult || '—';
    item.auditedByText = item.auditedBy || '—';
    item.auditedAtText = item.auditedAt || '—';
    item.auditRemarkText = item.auditRemark || '—';
    item.canAudit = auditMode && item.auditStatus !== '已审核';
    item.liveStatus = getLiveLedgerStatus(it) || '—';
    item.snapshotStatusText = item.snapshotStatus || '—';
    return item;
  });
  return {
    ok: true,
    auditMode: auditMode,
    task: row,
    stats: stats,
    reportItems: reportItems,
    pendingAudit: Math.max(0, stats.reportCount - stats.auditedCount)
  };
}

function applyShortageAuditToLedger(item, result) {
  if (result !== '核准销账') return { ok: true, skipped: true };
  const liveStatus = getLiveLedgerStatus(item);
  if (liveStatus === '已报废' || liveStatus === '已丢失') {
    return { ok: true, statusUnchanged: true, liveStatus: liveStatus };
  }
  const asset = ASSETS.find(function (a) {
    return a.id === item.assetId || (item.assetCode && a.code === item.assetCode);
  });
  if (!asset) return { ok: false, reason: 'missing' };
  const fromStatus = asset.status || liveStatus || '使用中';
  asset.status = '已丢失';
  asset.changeAt = nowStr();
  appendShortageChangeRecord(asset, fromStatus);
  return { ok: true, liveStatus: '已丢失' };
}

function createAssetFromInventorySurplus(payload) {
  if (!payload) return null;
  const existing = ASSETS.find(function (a) {
    return (payload.id && a.id === payload.id) || (payload.code && a.code === payload.code);
  });
  if (existing) {
    existing.status = '使用中';
    existing.changeAt = nowStr();
    return existing;
  }
  let code = payload.code || nextAssetCode(ASSETS);
  if (ASSETS.some(function (a) { return a.code === code; })) {
    code = nextAssetCode(ASSETS);
  }
  const createdAt = payload.createdAt || nowStr();
  const asset = Object.assign({}, payload, {
    id: payload.id || ('ast-' + Date.now()),
    code: code,
    status: '使用中',
    createdAt: createdAt,
    updatedAt: nowStr(),
    inputAt: createdAt,
    changeAt: nowStr(),
    inputBy: payload.creatorName || payload.inputBy || ''
  });
  ASSETS.unshift(asset);
  return asset;
}

/** 盘盈：核准入账才写入台账；不予核准不入账、也不删台账 */
function applySurplusAuditToLedger(item, result) {
  if (result === '核准入账') {
    const existing = ASSETS.find(function (a) {
      return a.id === item.assetId || (item.assetCode && a.code === item.assetCode);
    });
    if (existing) {
      existing.status = '使用中';
      existing.changeAt = nowStr();
      appendSurplusInputRecord(existing);
      return existing;
    }
    const created = createAssetFromInventorySurplus(item.surplusPayload || {
      id: item.assetId,
      code: item.assetCode,
      name: item.assetName,
      categoryName: item.categoryName,
      orgName: item.orgName,
      regionName: item.regionName,
      purchaseMethod: item.purchaseMethod
    });
    if (created) {
      item.assetId = created.id;
      item.assetCode = created.code;
      item.assetName = created.name;
      item.categoryName = created.categoryName || item.categoryName;
      item.orgName = created.orgName || item.orgName;
      item.regionName = created.regionName || item.regionName;
      appendSurplusInputRecord(created);
    }
    return created;
  }
  if (result === '不予核准') {
    item.ledgerRejected = true;
  }
  return null;
}

function auditInventoryItem(payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, INV_PAGE_ID, 'audit')) {
    return { ok: false, message: '当前账号无审核报告权限' };
  }
  const task = inventories.find(function (t) {
    return t.id === payload.taskId || t.code === payload.taskId;
  });
  if (!task) return { ok: false, message: '任务不存在' };
  if (!isInventoryMine(task, user) && !isInventoryInOrgScope(task, user)) {
    return { ok: false, message: '无权操作该盘点单' };
  }
  syncInventoryTaskStatus(task);
  if (task.status !== '盘点完成') {
    return { ok: false, message: '仅盘点完成状态可审核报告' };
  }
  const item = (task.items || []).find(function (it) {
    return it.assetId === payload.assetId || it.assetCode === payload.assetCode;
  });
  if (!item || !isReportInventoryItem(item)) {
    return { ok: false, message: '未找到可审核的报告项' };
  }
  if (item.auditStatus === '已审核') {
    return { ok: false, message: '该记录已审核' };
  }
  const result = String(payload.auditResult || '').trim();
  if (!result) return { ok: false, message: '请选择审核结果' };
  const liveStatus = getLiveLedgerStatus(item);
  const cfg = getInventoryAuditOptions(item.invStatus, liveStatus);
  if (cfg.options.indexOf(result) < 0) {
    return { ok: false, message: '审核结果无效' };
  }

  let shortageRes = null;
  if (item.invStatus === '盘亏') {
    shortageRes = applyShortageAuditToLedger(item, result);
    if (result === '核准销账' && !shortageRes.ok) {
      return { ok: false, message: '未找到对应资产台账，无法变更状态为已丢失' };
    }
  } else if (item.invStatus === '盘盈') {
    applySurplusAuditToLedger(item, result);
  }

  item.auditStatus = '已审核';
  item.auditResult = result;
  item.auditRemark = String(payload.auditRemark || '').trim();
  item.auditedAt = nowStr();
  item.auditedBy = user.name || user.id;
  task.reportApproved = isTaskReportFullyAudited(task);
  if (task.reportApproved) {
    task.reportApprovedAt = nowStr();
    task.reportApprovedBy = user.name || user.id;
  }

  let message = '审核已保存';
  if (item.invStatus === '盘亏' && result === '核准销账') {
    if (shortageRes && shortageRes.statusUnchanged) {
      message = '已核准销账；台账保持为' + (shortageRes.liveStatus || '原状态');
    } else {
      message = '已核准销账，资产台账状态已变更为已丢失';
    }
  } else if (item.invStatus === '盘盈' && result === '核准入账') {
    message = '已核准入账，盘盈资产已录入台账';
  } else if (item.invStatus === '盘盈' && result === '不予核准') {
    message = '已不予核准，盘盈数据未录入台账';
  }

  const reportRes = getInventoryReport(task.id, { auditMode: !task.reportApproved });
  return {
    ok: true,
    message: message,
    fullyAudited: !!task.reportApproved,
    report: reportRes.ok ? reportRes : getInventoryReport(task.id, { auditMode: false })
  };
}

function matchAssetCode(raw) {
  const code = assetScan.normalizeScanCode(raw);
  if (!code) return null;
  return ASSETS.find(function (a) {
    return code.indexOf(a.code) >= 0 || code === a.id || a.code === code;
  }) || null;
}

function findAsset(idOrCode) {
  if (!idOrCode) return null;
  const key = assetScan.normalizeScanCode(idOrCode) || String(idOrCode);
  return ASSETS.find(function (a) { return a.id === key || a.code === key; }) || matchAssetCode(key);
}

function canAccessAsset(asset) {
  if (!asset) return false;
  const scope = dataScope.resolveDataScope(currentUser());
  return dataScope.matchesAssetDataScope(scope, {
    orgId: asset.orgId || '',
    orgName: asset.orgName || '',
    regionId: asset.regionId || orgPerm.findRegionIdByName(asset.regionName),
    regionName: asset.regionName || ''
  });
}

function resolveAccessibleAsset(idOrCode, purpose) {
  const asset = findAsset(idOrCode);
  if (!asset) {
    return { ok: false, code: 'NOT_FOUND', message: '未识别到资产' };
  }
  if (!canAccessAsset(asset)) {
    const message = purpose === 'repair'
      ? '该资产不在您的数据权限范围内，不可报修'
      : '该资产不在您的数据权限范围内，不可查看';
    return { ok: false, code: 'NO_PERMISSION', message: message, assetCode: asset.code, assetName: asset.name };
  }
  return { ok: true, asset: clone(asset) };
}

function submitInventoryResult(payload) {
  const task = inventories.find(function (t) { return t.id === payload.taskId; });
  if (!task) return { ok: false, message: '盘点任务不存在' };
  const user = currentUser();
  if (!isInventoryMine(task, user)) {
    return { ok: false, message: '仅盘点人可执行盘点' };
  }
  const item = (task.items || []).find(function (it) {
    return it.assetId === payload.assetId || it.assetCode === payload.assetCode;
  });
  if (!item) return { ok: false, message: '该资产不在本盘点任务范围内' };
  if (item.invStatus === '盘盈') {
    return { ok: false, message: '盘盈请通过删除盘盈处理' };
  }
  const status = payload.invStatus || '相符';
  if (status === '盘盈') {
    return { ok: false, message: '盘点结果不可设为盘盈' };
  }
  item.invStatus = status;
  if (status === '未盘') {
    item.invRemark = '';
    item.invImages = [];
    item.invTime = '';
    item.operatorName = '';
    item.scanMethod = '';
  } else {
    item.invRemark = payload.invRemark || '';
    item.invImages = normalizeInvImages(payload.invImages || []);
    item.invTime = nowStr();
    item.operatorName = user.name || user.id;
    item.scanMethod = payload.scanMethod || '手动';
  }
  recomputeProgress(task);
  return { ok: true, task: getInventory(task.id) };
}

function deleteInventorySurplus(payload) {
  payload = payload || {};
  const task = inventories.find(function (t) { return t.id === payload.taskId; });
  if (!task) return { ok: false, message: '盘点任务不存在' };
  const user = currentUser();
  if (!isInventoryMine(task, user)) {
    return { ok: false, message: '仅盘点人可执行盘点' };
  }
  const idx = (task.items || []).findIndex(function (it) {
    return it.assetId === payload.assetId || it.assetCode === payload.assetCode;
  });
  if (idx < 0) return { ok: false, message: '未找到该资产' };
  const item = task.items[idx];
  if (item.invStatus !== '盘盈') {
    return { ok: false, message: '仅可删除盘盈记录' };
  }
  task.items.splice(idx, 1);
  recomputeProgress(task);
  return { ok: true, task: getInventory(task.id) };
}

const DEFAULT_CATEGORIES = ['制冷设备', '给排水', '强电', '弱电安防', '电梯'];
const DEFAULT_REGIONS = ['地下一层', '1层', '15层'];
const TAG_TYPES = ['二维码', 'NFC标签'];
const PURCHASE_METHODS = ['采购', '租赁'];

function nextAssetCode(list) {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  const prefix = 'ZC-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-';
  let maxSeq = 0;
  (list || ASSETS).forEach(function (a) {
    const code = String(a.code || '');
    if (code.indexOf(prefix) !== 0) return;
    const seq = parseInt(code.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  const next = maxSeq + 1;
  const seqStr = next < 10 ? '00' + next : (next < 100 ? '0' + next : '' + next);
  return prefix + seqStr;
}

function getInventorySurplusOptions() {
  const cats = {};
  const regions = {};
  DEFAULT_CATEGORIES.forEach(function (n) { cats[n] = true; });
  DEFAULT_REGIONS.forEach(function (n) { regions[n] = true; });
  ASSETS.forEach(function (a) {
    if (a.categoryName) cats[a.categoryName] = true;
    if (a.regionName) regions[a.regionName] = true;
  });
  const orgOptions = Object.keys(orgPerm.ORGS).map(function (id) {
    return { id: id, name: orgPerm.ORGS[id].name };
  });
  return {
    categoryOptions: Object.keys(cats).map(function (name) {
      return { id: name, name: name };
    }),
    orgOptions: orgOptions,
    regionOptions: Object.keys(regions).map(function (name) {
      return { id: name, name: name };
    }),
    tagTypeOptions: TAG_TYPES.slice(),
    purchaseMethodOptions: PURCHASE_METHODS.slice()
  };
}

function addInventorySurplus(payload) {
  payload = payload || {};
  const task = inventories.find(function (t) { return t.id === payload.taskId; });
  if (!task) return { ok: false, message: '盘点任务不存在' };
  const user = currentUser();
  if (!isInventoryMine(task, user)) {
    return { ok: false, message: '仅盘点人可执行盘点' };
  }
  if (task.status === '盘点完成') {
    return { ok: false, message: '盘点已完成，不可新增盘盈' };
  }

  const nameVal = String(payload.name || '').trim();
  const categoryName = String(payload.categoryName || '').trim();
  const orgId = String(payload.orgId || '').trim();
  const regionName = String(payload.regionName || '').trim();
  const tagType = String(payload.tagType || '').trim();
  if (!nameVal) return { ok: false, message: '请填写资产名称' };
  if (!categoryName) return { ok: false, message: '请选择资产分类' };
  if (!orgId) return { ok: false, message: '请选择所属组织' };
  if (!regionName) return { ok: false, message: '请选择所属区域' };
  if (!tagType || TAG_TYPES.indexOf(tagType) < 0) {
    return { ok: false, message: '请选择标签类型' };
  }
  if (nameVal.length > 50) return { ok: false, message: '资产名称不可超过 50 字' };

  const org = orgPerm.ORGS[orgId];
  if (!org) return { ok: false, message: '所属组织无效' };
  if (ASSETS.some(function (a) {
    return a.name === nameVal && a.orgId === orgId;
  })) {
    return { ok: false, message: '同组织下已存在同名资产' };
  }

  const createdAt = nowStr();
  // 盘盈草稿：仅挂盘点清单，核准入账前不写入资产台账
  const draft = {
    id: 'ast-surplus-' + Date.now(),
    code: nextAssetCode(ASSETS),
    name: nameVal,
    brand: String(payload.brand || '').trim().slice(0, 50),
    model: String(payload.model || '').trim().slice(0, 50),
    serialNo: String(payload.serialNo || '').trim().slice(0, 64),
    categoryName: categoryName,
    orgId: orgId,
    orgName: org.name,
    regionName: regionName,
    location: String(payload.location || '').trim().slice(0, 100),
    tagType: tagType,
    status: '使用中',
    purchaseMethod: String(payload.purchaseMethod || '').trim(),
    purchaseAmount: String(payload.purchaseAmount || '').trim(),
    purchaseDate: String(payload.purchaseDate || '').trim(),
    warrantyDate: String(payload.warrantyDate || '').trim(),
    remark: String(payload.remark || '').trim().slice(0, 500),
    images: normalizeInvImages(payload.images || []),
    inputBy: user.name || user.id,
    inputAt: createdAt,
    changeAt: createdAt,
    creatorAccount: user.id || '',
    creatorName: user.name || user.id,
    createdAt: createdAt,
    updatedAt: createdAt
  };

  const item = Object.assign(buildItem(draft, '盘盈'), {
    invTime: createdAt,
    operatorName: user.name || user.id,
    scanMethod: '手动',
    surplusPayload: clone(draft),
    auditStatus: '未审核'
  });
  if ((task.items || []).some(function (it) { return it.assetId === draft.id || it.assetCode === draft.code; })) {
    return { ok: false, message: '该资产已在盘点清单中' };
  }
  task.items = task.items || [];
  task.items.unshift(item);
  recomputeProgress(task);
  return { ok: true, message: '盘盈资产已加入盘点清单', task: getInventory(task.id) };
}

function listAssets(keyword) {
  const kw = String(keyword || '').trim().toLowerCase();
  let list = ASSETS.filter(function (a) {
    return a.status === '使用中' && canAccessAsset(a);
  });
  if (kw) {
    list = list.filter(function (a) {
      return (a.code + a.name + a.location + a.categoryName).toLowerCase().indexOf(kw) >= 0;
    });
  }
  return clone(list);
}

function createRepair(payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'add')) {
    return { ok: false, message: '当前账号无「发起报修」权限' };
  }
  const access = resolveAccessibleAsset(payload.assetId || payload.assetCode, 'repair');
  if (!access.ok) {
    return { ok: false, message: access.message || '请先选择或扫码关联资产' };
  }
  const asset = access.asset;
  if (asset.status !== '使用中') return { ok: false, message: '仅使用中状态的资产可报修' };
  if (!(payload.orgId || '').trim()) return { ok: false, message: '请选择报修组织' };
  if (!(payload.reportTime || '').trim()) return { ok: false, message: '请选择报修时间' };
  if (!(payload.faultLevel || '').trim()) return { ok: false, message: '请选择故障等级' };
  const desc = String(payload.faultDesc || '').trim();
  if (!desc) return { ok: false, message: '请填写故障描述' };
  if (desc.length < 5) return { ok: false, message: '故障描述至少 5 个字' };
  const images = Array.isArray(payload.faultImages) ? payload.faultImages : [];
  if (images.length > 4) return { ok: false, message: '故障图片不可超过 4 张' };

  const item = {
    id: 'rp-' + Date.now(),
    code: 'BX-' + Date.now().toString().slice(-8),
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    brand: payload.brand || asset.brand || '',
    model: payload.model || asset.model || '',
    categoryName: payload.categoryName || asset.categoryName || '—',
    regionName: payload.regionName || asset.regionName || '—',
    location: payload.location || asset.location || '—',
    reporterName: payload.reporterName || user.name || user.id,
    reporterAccount: payload.reporterAccount || user.id || '',
    orgId: payload.orgId,
    orgName: payload.orgName || '',
    reportTime: payload.reportTime,
    reportMethod: payload.reportMethod || '手动填报',
    faultDesc: desc,
    faultImages: images,
    videoAttachment: payload.videoAttachment || '',
    faultLevel: payload.faultLevel || '一般',
    status: REQ_STATUS_PENDING,
    approverName: '',
    approverAccount: '',
    approveTime: '',
    approveRemark: '',
    workOrderCode: '',
    assignees: [],
    createdAt: nowStr()
  };
  repairs.unshift(item);
  return { ok: true, repair: enrichRepair(item) };
}

function isRepairMine(row, user) {
  user = user || currentUser();
  return !!(row && (
    (row.reporterAccount && row.reporterAccount === user.id) ||
    (row.reporterName && row.reporterName === user.name)
  ));
}

function isRepairInAssetScope(row) {
  const asset = findAsset(row.assetId || row.assetCode);
  if (asset) return canAccessAsset(asset);
  // 无台账关联时：按报修组织兜底
  if (row.orgId) {
    const scope = dataScope.resolveDataScope(currentUser());
    if (scope.all) return true;
    return dataScope.isOrgInScope(row.orgId, scope);
  }
  return false;
}

/** 同 PC ensureWorkOrderRequestSeeds：工单有报修单号但缺报修种子时自动补齐 */
function buildRepairFromWorkOrder(wo) {
  if (!wo) return null;
  const asset = findAsset(wo.assetId || wo.assetCode) || {};
  const dispatchNode = (wo.nodes || []).find(function (n) { return n && n.stage === '派单'; }) || {};
  const reportTime = wo.dispatchTime || dispatchNode.time || wo.createdAt || nowStr();
  return {
    id: wo.requestId || ('rp-linked-' + (wo.id || Date.now())),
    code: wo.requestCode || '',
    assetId: wo.assetId || asset.id || '',
    assetCode: wo.assetCode || asset.code || '',
    assetName: wo.assetName || asset.name || '',
    brand: asset.brand || '',
    model: asset.model || '',
    categoryName: wo.categoryName || asset.categoryName || '',
    regionName: asset.regionName || '',
    location: asset.location || '',
    reporterName: '王五',
    reporterAccount: 'wangwu',
    orgId: asset.orgId || 'ORG-003',
    orgName: asset.orgName || '工程部',
    reportTime: reportTime,
    reportMethod: '手动填报',
    faultDesc: dispatchNode.remark || ('关联工单 ' + (wo.code || '')),
    faultImages: [],
    videoAttachment: null,
    faultLevel: '一般',
    status: REQ_STATUS_DISPATCHED,
    approverName: dispatchNode.operatorName || '系统管理员',
    approverAccount: dispatchNode.operatorAccount || 'admin',
    approveTime: wo.dispatchTime || dispatchNode.time || '',
    approveRemark: dispatchNode.remark || '审核通过，已派单',
    workOrderCode: wo.code || '',
    assignees: (wo.assignees || []).map(function (a) { return Object.assign({}, a); }),
    createdAt: wo.createdAt || reportTime
  };
}

function ensureWorkOrderLinkedRepairs() {
  (workOrders || []).forEach(function (wo) {
    if (!wo || (!wo.requestId && !wo.requestCode)) return;
    const exists = (repairs || []).some(function (r) {
      return (wo.requestId && r.id === wo.requestId) ||
        (wo.requestCode && r.code === wo.requestCode);
    });
    if (exists) return;
    const row = buildRepairFromWorkOrder(wo);
    if (row) repairs.unshift(row);
  });
}

function canViewRepairViaWorkOrder(item, user) {
  user = user || currentUser();
  if (!item) return false;
  return (workOrders || []).some(function (wo) {
    if (!wo) return false;
    if (wo.requestId !== item.id && wo.requestCode !== item.code) return false;
    return isWorkOrderMine(wo, user) || isWorkOrderInAssetScope(wo);
  });
}

function isWorkOrderMine(row, user) {
  user = user || currentUser();
  if (!row) return false;
  return (row.assignees || []).some(function (a) {
    return a.account === user.id || a.name === user.name;
  });
}

function isWorkOrderInAssetScope(row) {
  const asset = findAsset(row.assetId || row.assetCode);
  if (asset) return canAccessAsset(asset);
  return false;
}

function applyRepairStatusFilter(list, filter) {
  if (!filter || filter === 'all') return list;
  if (filter === 'pending') {
    return list.filter(function (r) { return r.status === '待审批'; });
  }
  if (filter === 'dispatched') {
    return list.filter(function (r) { return r.status === '已派单（生成工单）'; });
  }
  if (filter === 'rejected') {
    return list.filter(function (r) { return String(r.status).indexOf('驳回') >= 0; });
  }
  return list.filter(function (r) { return r.status === filter; });
}

function listRepairs(filter, scope, query) {
  ensureCurrentUserAcceptSeedData();
  ensureWorkOrderLinkedRepairs();
  query = query || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'view')) {
    return [];
  }
  const tab = scope === 'mine' ? 'mine' : 'org';
  const statusFilter = query.status != null && query.status !== ''
    ? query.status
    : (filter || 'all');
  const faultLevel = String(query.faultLevel || '').trim();
  const method = String(query.reportMethod || query.method || '').trim();
  const keyword = String(query.keyword || '').trim().toLowerCase();
  let list = repairs.filter(function (r) {
    if (tab === 'mine') return isRepairMine(r, user);
    return isRepairInAssetScope(r);
  });
  list = applyRepairStatusFilter(list, statusFilter);
  if (faultLevel) {
    list = list.filter(function (r) { return r.faultLevel === faultLevel; });
  }
  if (method) {
    list = list.filter(function (r) { return r.reportMethod === method; });
  }
  if (keyword) {
    list = list.filter(function (r) {
      const blob = [
        r.code, r.workOrderCode, r.assetCode, r.assetName, r.brand, r.model,
        r.reporterName, r.reporterAccount, r.orgName, r.faultDesc,
        r.approverName, r.location, r.regionName
      ].join(' ').toLowerCase();
      return blob.indexOf(keyword) >= 0;
    });
  }
  return list
    .slice()
    .sort(function (a, b) {
      return String(b.reportTime || '').localeCompare(String(a.reportTime || ''));
    })
    .map(enrichRepair);
}

function getRepair(id) {
  ensureCurrentUserAcceptSeedData();
  ensureWorkOrderLinkedRepairs();
  const key = String(id || '').trim();
  if (!key) return null;
  const item = repairs.find(function (r) { return r.id === key || r.code === key; });
  if (!item) return null;
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'view')) {
    return null;
  }
  // 业务上：指派维修人必有该资产权限；另允许通过关联工单查看（与派单链路一致）
  if (
    !isRepairMine(item, user) &&
    !isRepairInAssetScope(item) &&
    !canViewRepairViaWorkOrder(item, user)
  ) {
    return null;
  }
  return enrichRepair(item);
}

function applyWorkOrderStatusFilter(list, filter) {
  if (!filter || filter === 'all') return list;
  return list.filter(function (w) { return w.status === filter; });
}

function listWorkOrders(filter, scope, query) {
  ensureCurrentUserAcceptSeedData();
  query = query || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'view')) {
    return [];
  }
  const tab = scope === 'mine' ? 'mine' : 'org';
  const statusFilter = query.status != null && query.status !== ''
    ? query.status
    : (filter || 'all');
  const keyword = String(query.keyword || '').trim().toLowerCase();
  let list = workOrders.filter(function (w) {
    if (tab === 'mine') return isWorkOrderMine(w, user);
    return isWorkOrderInAssetScope(w);
  });
  list = applyWorkOrderStatusFilter(list, statusFilter);
  if (keyword) {
    list = list.filter(function (w) {
      const assignees = (w.assignees || []).map(function (a) {
        return (a.name || '') + ' ' + (a.account || '');
      }).join(' ');
      const blob = [
        w.code, w.requestCode, w.assetCode, w.assetName,
        w.executorName, w.executorAccount, w.acceptorName, w.voidByName, assignees
      ].join(' ').toLowerCase();
      return blob.indexOf(keyword) >= 0;
    });
  }
  return list
    .slice()
    .sort(function (a, b) {
      return String(b.dispatchTime || '').localeCompare(String(a.dispatchTime || ''));
    })
    .map(enrichWorkOrder);
}

function getWorkOrder(id) {
  ensureCurrentUserAcceptSeedData();
  ensureWorkOrderLinkedRepairs();
  const item = workOrders.find(function (w) { return w.id === id || w.code === id; });
  if (!item) return null;
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'view')) {
    return null;
  }
  if (!isWorkOrderMine(item, user) && !isWorkOrderInAssetScope(item)) {
    return null;
  }
  return enrichWorkOrder(item);
}

function findRepairRaw(id) {
  return repairs.find(function (r) { return r.id === id || r.code === id; }) || null;
}

function findWorkOrderRaw(id) {
  return workOrders.find(function (w) { return w.id === id || w.code === id; }) || null;
}

function nextWorkOrderCode() {
  return 'WO-' + Date.now().toString().slice(-10);
}

function resolveWorkers(accounts) {
  const ids = (accounts || []).map(function (a) { return String(a); });
  if (!ids.length) return [];
  return DEMO_REPAIR_WORKERS.filter(function (w) {
    return ids.indexOf(w.account) >= 0;
  }).map(function (w) {
    return { account: w.account, name: w.name, org: w.org };
  });
}

/** 用户对该资产是否具备组织+区域数据权限（指派/转派选人） */
function userCanAccessAsset(userId, asset) {
  if (!asset || !userId) return false;
  const profile = dataScope.getUserProfile(userId);
  if (!profile) return false;
  const scope = dataScope.resolveDataScope(profile);
  return dataScope.matchesAssetDataScope(scope, {
    orgId: asset.orgId || '',
    orgName: asset.orgName || '',
    regionId: asset.regionId || orgPerm.findRegionIdByName(asset.regionName),
    regionName: asset.regionName || ''
  });
}

function buildWorkerTreeGroups(workers) {
  const groups = {};
  const order = [];
  (workers || []).forEach(function (w) {
    const org = w.org || '未分配组织';
    if (!groups[org]) {
      groups[org] = [];
      order.push(org);
    }
    groups[org].push(w);
  });
  return order.map(function (org) {
    return { org: org, workers: groups[org] };
  });
}

/**
 * 维修人员列表：仅返回对该资产有组织+区域权限的用户（组织树分组）
 * @param {{ assetId?: string, assetCode?: string }} opts
 */
function listRepairWorkers(opts) {
  opts = opts || {};
  const asset = findAsset(opts.assetId || opts.assetCode);
  let list = DEMO_REPAIR_WORKERS.slice();
  // 补充 mock-users 中可派工账号（admin 等）
  const extra = dataScope.getAllUserProfiles().filter(function (u) {
    if (!u || !u.id) return false;
    if (u.role === '普通用户') return false;
    return !list.some(function (w) { return w.account === u.id; });
  }).map(function (u) {
    return {
      account: u.id,
      name: u.name,
      org: u.dept || (orgPerm.ORGS[u.orgId] && orgPerm.ORGS[u.orgId].name) || '—'
    };
  });
  list = list.concat(extra);
  if (asset) {
    list = list.filter(function (w) {
      return userCanAccessAsset(w.account, asset);
    });
  }
  return {
    list: list,
    groups: buildWorkerTreeGroups(list),
    assetCode: asset ? asset.code : '',
    assetName: asset ? asset.name : ''
  };
}

/** 审批通过并派单（audit） */
function approveRepairPass(id, payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'audit')) {
    return { ok: false, message: '当前账号无「审批」权限' };
  }
  const req = findRepairRaw(id);
  if (!req || req.status !== REQ_STATUS_PENDING) {
    return { ok: false, message: '仅待审批报修可审批' };
  }
  let workers = resolveWorkers(payload.assigneeAccounts || payload.accounts);
  if (!workers.length && payload.assigneeAccount) {
    workers = resolveWorkers([payload.assigneeAccount]);
  }
  if (!workers.length) {
    return { ok: false, message: '请至少选择一名维修人员' };
  }
  const asset = findAsset(req.assetId || req.assetCode);
  if (asset) {
    const invalid = workers.filter(function (w) {
      return !userCanAccessAsset(w.account, asset);
    });
    if (invalid.length) {
      return { ok: false, message: '所选维修人员中有人无该资产组织/区域权限' };
    }
  }
  const approveTime = nowStr();
  const remark = String(payload.approveRemark || '').trim() || '审核通过，已派单';
  const woCode = nextWorkOrderCode();
  const wo = {
    id: 'wo-' + Date.now(),
    code: woCode,
    requestId: req.id,
    requestCode: req.code,
    assetId: req.assetId,
    assetCode: req.assetCode,
    assetName: req.assetName,
    assignees: workers.slice(),
    dispatchTime: approveTime,
    status: WO_STATUS_DISPATCHED,
    executorName: '',
    executorAccount: '',
    finishTime: '',
    finishContent: '',
    acceptorName: '',
    acceptTime: '',
    acceptOpinion: '',
    voidByName: '',
    voidTime: '',
    voidReason: '',
    nodes: [{
      stage: '派单',
      result: '已派单',
      time: approveTime,
      operatorName: user.name || user.id || '',
      operatorAccount: user.id || '',
      operatorOrg: user.orgName || user.org || '—',
      remark: remark
    }],
    createdAt: approveTime
  };
  workOrders.unshift(wo);
  req.status = REQ_STATUS_DISPATCHED;
  req.approverName = user.name || user.id;
  req.approverAccount = user.id || '';
  req.approveTime = approveTime;
  req.approveRemark = remark;
  req.workOrderCode = woCode;
  req.assignees = workers.slice();
  syncStatusesFromRepair();
  return { ok: true, message: '审核通过，已生成工单 ' + woCode, repair: enrichRepair(req), workOrder: enrichWorkOrder(wo) };
}

/** 审批驳回（audit） */
function approveRepairReject(id, payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'audit')) {
    return { ok: false, message: '当前账号无「审批」权限' };
  }
  const req = findRepairRaw(id);
  if (!req || req.status !== REQ_STATUS_PENDING) {
    return { ok: false, message: '仅待审批报修可审批' };
  }
  const remark = String(payload.approveRemark || '').trim();
  if (!remark) return { ok: false, message: '请填写驳回原因' };
  req.status = REQ_STATUS_REJECTED;
  req.approverName = user.name || user.id;
  req.approverAccount = user.id || '';
  req.approveTime = nowStr();
  req.approveRemark = remark;
  req.workOrderCode = '';
  req.assignees = [];
  return { ok: true, message: '报修已驳回', repair: enrichRepair(req) };
}

/** 撤回：仅报修人，流程按钮不受页权限制 */
function withdrawRepair(id) {
  const user = currentUser();
  const req = findRepairRaw(id);
  if (!req || req.status !== REQ_STATUS_PENDING) {
    return { ok: false, message: '仅待审批状态的申请可撤回' };
  }
  if (!isRepairMine(req, user)) {
    return { ok: false, message: '仅报修申请人可撤回申请' };
  }
  repairs = repairs.filter(function (r) { return r.id !== req.id; });
  return { ok: true, message: '报修申请已撤回' };
}

/** 删除驳回报修（delete） */
function deleteRepair(id) {
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_REQUEST_PAGE_ID, 'delete')) {
    return { ok: false, message: '当前账号无「删除」权限' };
  }
  const req = findRepairRaw(id);
  if (!req) return { ok: false, message: '报修记录不存在' };
  if (req.status === REQ_STATUS_DISPATCHED) {
    return { ok: false, message: '已派单的报修记录不可删除' };
  }
  if (req.status !== REQ_STATUS_REJECTED) {
    return { ok: false, message: '仅驳回报修可删除' };
  }
  repairs = repairs.filter(function (r) { return r.id !== req.id; });
  return { ok: true, message: '报修记录已删除' };
}

/** 接单：仅指派人，流程按钮 */
function acceptWorkOrder(id) {
  const user = currentUser();
  const wo = findWorkOrderRaw(id);
  if (!wo || wo.status !== WO_STATUS_DISPATCHED) {
    return { ok: false, message: '仅已派单工单可接单' };
  }
  if (!isWorkOrderAssignee(wo, user)) {
    return { ok: false, message: '仅被指派的维修人员可接单' };
  }
  wo.status = WO_STATUS_PROCESSING;
  wo.executorName = user.name || user.id;
  wo.executorAccount = user.id || '';
  pushWorkOrderNode(wo, '接单', '已接单', '开始维修处理');
  return { ok: true, message: '接单成功', workOrder: enrichWorkOrder(wo) };
}

/** 转派（transfer） */
function transferWorkOrder(id, payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'transfer')) {
    return { ok: false, message: '当前账号无「转派」权限' };
  }
  const wo = findWorkOrderRaw(id);
  if (!wo || wo.status !== WO_STATUS_DISPATCHED) {
    return { ok: false, message: '仅已派单工单可转派' };
  }
  let workers = resolveWorkers(payload.assigneeAccounts || payload.accounts);
  if (!workers.length && payload.assigneeAccount) {
    workers = resolveWorkers([payload.assigneeAccount]);
  }
  if (!workers.length) {
    return { ok: false, message: '请至少选择一名维修人员' };
  }
  const asset = findAsset(wo.assetId || wo.assetCode);
  if (asset) {
    const invalid = workers.filter(function (w) {
      return !userCanAccessAsset(w.account, asset);
    });
    if (invalid.length) {
      return { ok: false, message: '所选维修人员中有人无该资产组织/区域权限' };
    }
  }
  wo.assignees = workers.slice();
  wo.executorName = '';
  wo.executorAccount = '';
  const names = workers.map(function (w) { return w.name || w.account; }).join('、');
  const remark = String(payload.transferRemark || '').trim() || '工单已转派';
  pushWorkOrderNode(wo, '转派', '已转派', remark + ' → ' + names);
  return { ok: true, message: '工单已转派', workOrder: enrichWorkOrder(wo) };
}

/** 作废（void） */
function voidWorkOrder(id, payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, REPAIR_WORKORDER_PAGE_ID, 'void')) {
    return { ok: false, message: '当前账号无「作废」权限' };
  }
  const wo = findWorkOrderRaw(id);
  if (!wo || wo.status !== WO_STATUS_DISPATCHED) {
    return { ok: false, message: '仅已派单工单可作废' };
  }
  const reason = String(payload.voidReason || payload.reason || '').trim();
  if (!reason) {
    return { ok: false, message: '请填写作废原因' };
  }
  wo.status = WO_STATUS_VOID;
  wo.voidByName = user.name || user.id;
  wo.voidByAccount = user.id || '';
  wo.voidTime = nowStr();
  wo.voidReason = reason;
  pushWorkOrderNode(wo, '作废', '工单作废', '', {
    contentLabel: '作废原因',
    contentText: reason
  });
  syncStatusesFromRepair();
  return { ok: true, message: '工单已作废', workOrder: enrichWorkOrder(wo) };
}

/** 完工：填写维修结论后直接完结 */
function finishWorkOrder(id, payload) {
  payload = payload || {};
  const user = currentUser();
  const wo = findWorkOrderRaw(id);
  if (!wo) return { ok: false, message: '工单不存在' };
  normalizeWorkOrderRecord(wo);
  if (wo.status !== WO_STATUS_PROCESSING) {
    return { ok: false, message: '当前状态不可完工' };
  }
  if (!isWorkOrderExecutor(wo, user)) {
    return { ok: false, message: '仅维修执行人可提交完工' };
  }
  const conclusion = String(payload.repairConclusion || payload.conclusion || '').trim();
  if (conclusion !== WO_STATUS_DONE && conclusion !== WO_STATUS_FAILED) {
    return { ok: false, message: '请选择维修结论' };
  }
  const content = String(payload.finishContent || payload.content || '').trim();
  if (!content) return { ok: false, message: '请填写维修内容' };
  const finishImages = normalizeTimelineImages(payload.finishImages || []).slice(0, 4);
  const finishAttachments = (payload.finishAttachments || []).filter(function (a) {
    return a && (a.url || a.path);
  }).map(function (a) {
    const url = resolveMediaUrl(a);
    return {
      type: a.type || 'video',
      name: a.name || '维修视频.mp4',
      url: url,
      path: url
    };
  }).slice(0, 1);
  wo.finishContent = content;
  wo.repairConclusion = conclusion;
  wo.finishImages = finishImages;
  wo.finishAttachments = finishAttachments;
  wo.finishTime = nowStr();
  wo.status = conclusion;
  if (!wo.executorAccount) {
    wo.executorName = user.name || user.id;
    wo.executorAccount = user.id || '';
  }
  pushWorkOrderNode(wo, '完工', conclusion, '', {
    contentLabel: '维修内容',
    contentText: content,
    imageLabel: '维修图片',
    images: finishImages,
    attachmentLabel: '维修附件',
    attachments: finishAttachments
  });
  syncStatusesFromRepair();
  return {
    ok: true,
    message: conclusion === WO_STATUS_DONE ? '工单已完工（维修完成）' : '工单已完工（维修失败）',
    workOrder: enrichWorkOrder(wo)
  };
}

/** 验收环节已取消（兼容旧调用） */
function acceptWorkOrderResult() {
  return { ok: false, message: '工单流程已取消验收环节' };
}

module.exports = {
  listInventories: listInventories,
  getInventoryDetail: getInventoryDetail,
  getInventoryReport: getInventoryReport,
  auditInventoryItem: auditInventoryItem,
  getInventory: getInventory,
  submitInventoryResult: submitInventoryResult,
  deleteInventorySurplus: deleteInventorySurplus,
  getInventorySurplusOptions: getInventorySurplusOptions,
  addInventorySurplus: addInventorySurplus,
  listAssets: listAssets,
  findAsset: findAsset,
  matchAssetCode: matchAssetCode,
  canAccessAsset: canAccessAsset,
  resolveAccessibleAsset: resolveAccessibleAsset,
  createRepair: createRepair,
  listRepairs: listRepairs,
  getRepair: getRepair,
  listWorkOrders: listWorkOrders,
  getWorkOrder: getWorkOrder,
  listRepairWorkers: listRepairWorkers,
  approveRepairPass: approveRepairPass,
  approveRepairReject: approveRepairReject,
  withdrawRepair: withdrawRepair,
  deleteRepair: deleteRepair,
  acceptWorkOrder: acceptWorkOrder,
  transferWorkOrder: transferWorkOrder,
  voidWorkOrder: voidWorkOrder,
  finishWorkOrder: finishWorkOrder,
  acceptWorkOrderResult: acceptWorkOrderResult,
  syncStatusesFromRepair: syncStatusesFromRepair,
  getAssetStatus: getAssetStatus,
  listLedgerRecords: function (type) {
    const list = type
      ? LEDGER_RECORDS.filter(function (r) { return r.type === type; })
      : LEDGER_RECORDS.slice();
    return { list: list, total: list.length };
  },
  ASSETS: ASSETS,
  LEDGER_RECORDS: LEDGER_RECORDS
};
