/**
 * 工单服务 Mock（对齐 PC workorder-service.js 状态机；物业端仅处理，不可创建）
 */
const dataScope = require('../utils/data-scope');
const session = require('../store/session');
const env = require('../config/env');
const workorderMedia = require('../utils/workorder-media');
const workorderTimeline = require('../utils/workorder-timeline');

const STORAGE_KEY = 'wxapp_workorder_service_v4';

const PARTICIPANTS = [
  {
    id: 'WP-001', regionId: 'AR-1F', regionName: '1层', status: '启用',
    dispatchers: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangsan', name: '张三' }],
    handlers: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangsan', name: '张三' }, { id: 'wangwu', name: '王五' }]
  },
  {
    id: 'WP-002', regionId: 'AR-15F', regionName: '15层', status: '启用',
    dispatchers: [{ id: 'admin', name: '系统管理员' }, { id: 'lisi', name: '李四' }],
    handlers: [{ id: 'admin', name: '系统管理员' }, { id: 'lisi', name: '李四' }, { id: 'zhaoliu', name: '赵六' }]
  },
  {
    id: 'WP-003', regionId: 'AR-B1', regionName: '地下一层', status: '启用',
    dispatchers: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangsan', name: '张三' }],
    handlers: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangsan', name: '张三' }, { id: 'chenliu', name: '陈六' }]
  },
  {
    id: 'WP-004', regionId: 'AR-PARK', regionName: '园区外场', status: '启用',
    dispatchers: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangzr', name: '张主任' }],
    handlers: [{ id: 'admin', name: '系统管理员' }, { id: 'liwm', name: '李物业' }]
  }
];

const DEFAULT_DISPATCHER = {
  people: [{ id: 'admin', name: '系统管理员' }, { id: 'zhangzr', name: '张主任' }]
};
const DEFAULT_HANDLERS = {
  people: [{ id: 'admin', name: '系统管理员' }, { id: 'lisi', name: '李四' }, { id: 'wangwu', name: '王五' }]
};

function seedOrders() {
  return [
    {
      id: 'WO-20260818-001',
      content: '15F茶水间水龙头漏水，地面已积水，请尽快处理。',
      images: 2,
      reportImages: [
        { name: '积水现场.jpg', url: '' },
        { name: '水龙头特写.jpg', url: '' }
      ],
      reportAttachments: [
        { name: '报事说明.txt', type: 'file', url: '' }
      ],
      starterName: '王芳', starterOrg: '企业A', starterAccount: 'wangfang',
      regionId: 'AR-15F', regionName: '15层',
      status: '待派单', categoryName: '设施维修',
      assignees: [], primaryHandlerId: '', primaryHandlerName: '',
      createdAt: '2026-08-18 09:12:00', dispatchedAt: '', dispatchRemark: '',
      acceptedAt: '', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [{ stage: '申请', result: '待派单', time: '2026-08-18 09:12:00', operatorName: '王芳', operatorOrg: '企业A' }]
    },
    {
      id: 'WO-20260818-002',
      content: '15F会议室指示牌松动，存在掉落风险。',
      starterName: '李沐阳', starterOrg: '港航咨询', starterAccount: 'limuyang',
      regionId: 'AR-15F', regionName: '15层',
      status: '已派单', categoryName: '设施维修',
      assignees: [{ id: 'lisi', name: '李四', role: '协助' }, { id: 'zhaoliu', name: '赵六', role: '协助' }],
      primaryHandlerId: '', primaryHandlerName: '',
      createdAt: '2026-08-18 08:40:00', dispatchedAt: '2026-08-18 08:55:00',
      dispatchRemark: '请优先固定指示牌',
      acceptedAt: '', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-18 08:40:00', operatorName: '李沐阳', operatorOrg: '港航咨询' },
        { stage: '派单', result: '已派单', time: '2026-08-18 08:55:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '请优先固定指示牌' }
      ]
    },
    {
      id: 'WO-20260817-018',
      content: '地下车库入口感应灯不亮。',
      video: true,
      reportAttachments: [
        { name: '感应灯现场.mp4', type: 'video', url: '' }
      ],
      starterName: '赵强', starterOrg: '安保部', starterAccount: 'zhaoqiang',
      regionId: 'AR-B1', regionName: '地下一层',
      status: '处理中', categoryName: '设施维修',
      assignees: [{ id: 'lisi', name: '李四', role: '实际处理人' }],
      primaryHandlerId: 'lisi', primaryHandlerName: '李四',
      createdAt: '2026-08-17 16:20:00', dispatchedAt: '2026-08-17 16:40:00',
      dispatchRemark: '请优先排查感应器供电',
      acceptedAt: '2026-08-17 17:05:00', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-17 16:20:00', operatorName: '赵强', operatorOrg: '安保部' },
        { stage: '派单', result: '已派单', time: '2026-08-17 16:40:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '请优先排查感应器供电' },
        { stage: '接单', result: '处理中', time: '2026-08-17 17:05:00', operatorName: '李四', operatorOrg: '工程部' }
      ]
    },
    {
      id: 'WO-20260816-031',
      content: '15F电梯厅异响，请排查。',
      starterName: '系统管理员', starterOrg: '平台管理员', starterAccount: 'admin',
      regionId: 'AR-15F', regionName: '15层',
      status: '已完结', categoryName: '设施维修',
      assignees: [{ id: 'lisi', name: '李四', role: '实际处理人' }],
      primaryHandlerId: 'lisi', primaryHandlerName: '李四',
      createdAt: '2026-08-16 09:00:00', dispatchedAt: '2026-08-16 09:20:00',
      dispatchRemark: '注意安全，先停梯检查',
      acceptedAt: '2026-08-16 09:25:00', finishedAt: '2026-08-16 11:00:00',
      finishRemark: '已润滑导轨并紧固螺栓',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-16 09:00:00', operatorName: '系统管理员', operatorOrg: '平台管理员' },
        { stage: '派单', result: '已派单', time: '2026-08-16 09:20:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '注意安全，先停梯检查' },
        { stage: '接单', result: '处理中', time: '2026-08-16 09:25:00', operatorName: '李四', operatorOrg: '工程部' },
        { stage: '完工', result: '已完结', time: '2026-08-16 11:00:00', operatorName: '李四', operatorOrg: '工程部', contentLabel: '完工说明', contentText: '已润滑导轨并紧固螺栓' }
      ]
    },
    {
      id: 'WO-20260815-009',
      content: '15F茶水间垃圾桶满溢，需清运。',
      starterName: '王芳', starterOrg: '企业A', starterAccount: 'wangfang',
      regionId: 'AR-15F', regionName: '15层',
      status: '已完结', categoryName: '环境保洁',
      assignees: [{ id: 'lisi', name: '李四', role: '实际处理人' }],
      primaryHandlerId: 'lisi', primaryHandlerName: '李四',
      createdAt: '2026-08-15 09:00:00', dispatchedAt: '2026-08-15 09:20:00',
      dispatchRemark: '请尽快清运',
      acceptedAt: '2026-08-15 09:25:00', finishedAt: '2026-08-15 11:00:00',
      finishRemark: '已清运完毕。',
      acceptResult: '验收通过', acceptRemark: '处理及时', acceptAt: '2026-08-15 14:00:00',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-15 09:00:00', operatorName: '王芳', operatorOrg: '企业A' },
        { stage: '派单', result: '已派单', time: '2026-08-15 09:20:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '请尽快清运' },
        { stage: '接单', result: '处理中', time: '2026-08-15 09:25:00', operatorName: '李四', operatorOrg: '工程部' },
        { stage: '完工', result: '已完结', time: '2026-08-15 11:00:00', operatorName: '李四', operatorOrg: '工程部', contentLabel: '完工说明', contentText: '已清运完毕。' },
        { stage: '验收', result: '已完结', time: '2026-08-15 14:00:00', operatorName: '王芳', operatorOrg: '企业A', fields: [{ label: '验收结果', value: '验收通过' }], contentLabel: '验收说明', contentText: '处理及时' }
      ]
    },
    {
      id: 'WO-20260818-301',
      content: 'B1设备间空调异响，疑似风机轴承磨损。',
      starterName: '赵强', starterOrg: '安保部', starterAccount: 'zhaoqiang',
      regionId: 'AR-B1', regionName: '地下一层',
      status: '待派单（退回）', categoryName: '设施维修',
      feedbackRemark: '异响仍在，请重新安排处理。',
      feedbackBy: '王磊',
      feedbackAt: '2026-08-14 19:20:00',
      assignees: [{ id: 'lisi', name: '李四', role: '实际处理人' }],
      primaryHandlerId: 'lisi', primaryHandlerName: '李四',
      createdAt: '2026-08-14 15:00:00', dispatchedAt: '2026-08-14 15:20:00',
      dispatchRemark: '请当日完成检修',
      acceptedAt: '2026-08-14 15:30:00', finishedAt: '2026-08-14 17:10:00',
      finishRemark: '已更换风机轴承，试运行正常。',
      acceptResult: '验收通过', acceptRemark: '检修及时', acceptAt: '2026-08-14 18:00:00',
      rateScore: 5, rateRemark: '响应快，处理专业', ratedAt: '2026-08-14 19:20:00',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-14 15:00:00', operatorName: '赵强', operatorOrg: '安保部' },
        { stage: '派单', result: '已派单', time: '2026-08-14 15:20:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '请当日完成检修' },
        { stage: '接单', result: '处理中', time: '2026-08-14 15:30:00', operatorName: '李四', operatorOrg: '工程部' },
        { stage: '完工', result: '已完结', time: '2026-08-14 17:10:00', operatorName: '李四', operatorOrg: '工程部', contentLabel: '完工说明', contentText: '已更换风机轴承，试运行正常。' },
        { stage: '不满意反馈', result: '待派单（退回）', time: '2026-08-14 19:20:00', operatorName: '王磊', operatorOrg: '运营部', contentLabel: '反馈说明', contentText: '异响仍在，请重新安排处理。' },
        { stage: '验收', result: '已完结', time: '2026-08-14 18:00:00', operatorName: '赵强', operatorOrg: '安保部', fields: [{ label: '验收结果', value: '验收通过' }], contentLabel: '验收说明', contentText: '检修及时' },
        { stage: '已评价', result: '已评价', time: '2026-08-14 19:20:00', operatorName: '赵强', operatorOrg: '安保部', fields: [{ label: '评分', value: '5 分' }], contentLabel: '评价说明', contentText: '响应快，处理专业' }
      ]
    },
    {
      id: 'WO-20260814-021',
      content: 'B1卫生间异味，疑似地漏反味，请排查。',
      starterName: '陈希', starterOrg: '企业B', starterAccount: 'chenxi',
      regionId: 'AR-B1', regionName: '地下一层',
      status: '已撤回', categoryName: '设施维修',
      assignees: [], primaryHandlerId: '', primaryHandlerName: '',
      createdAt: '2026-08-14 11:20:00', dispatchedAt: '', dispatchRemark: '',
      acceptedAt: '', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-14 11:20:00', operatorName: '陈希', operatorOrg: '企业B' },
        { stage: '撤回', result: '已撤回', time: '2026-08-14 11:35:00', operatorName: '陈希', operatorOrg: '企业B', contentLabel: '撤回说明', contentText: '问题已自行处理，无需派工' }
      ]
    },
    {
      id: 'WO-20260818-101',
      content: '1F大堂指示牌松动，存在掉落风险。',
      starterName: '李沐阳', starterOrg: '港航咨询', starterAccount: 'limuyang',
      regionId: 'AR-1F', regionName: '1层',
      status: '已派单', categoryName: '设施维修',
      assignees: [{ id: 'zhangsan', name: '张三', role: '协助' }, { id: 'wangwu', name: '王五', role: '协助' }],
      primaryHandlerId: '', primaryHandlerName: '',
      createdAt: '2026-08-18 07:40:00', dispatchedAt: '2026-08-18 07:55:00',
      dispatchRemark: '请优先固定指示牌',
      acceptedAt: '', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: null, rateRemark: '', ratedAt: '',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-18 07:40:00', operatorName: '李沐阳', operatorOrg: '港航咨询' },
        { stage: '派单', result: '已派单', time: '2026-08-18 07:55:00', operatorName: '系统管理员', operatorOrg: '物业中心', contentLabel: '派单说明', contentText: '请优先固定指示牌' }
      ]
    },
    {
      id: 'WO-20260818-302',
      content: '园区南门岗亭空调不制冷，值班人员反映闷热。',
      starterName: '周宁', starterOrg: '外场商户', starterAccount: 'zhouning',
      regionId: 'AR-PARK', regionName: '园区外场',
      status: '已完结', categoryName: '默认工单',
      assignees: [],
      primaryHandlerId: '', primaryHandlerName: '',
      createdAt: '2026-08-18 09:40:00', dispatchedAt: '2026-08-18 10:05:00',
      dispatchRemark: '属咨询类问题，已电话说明报修渠道，无需派工。',
      acceptedAt: '', finishedAt: '', finishRemark: '',
      acceptResult: '', acceptRemark: '', acceptAt: '',
      rateScore: 5, rateRemark: '答复清楚，处理及时', ratedAt: '2026-08-18 11:20:00',
      timeline: [
        { stage: '申请', result: '待派单', time: '2026-08-18 09:40:00', operatorName: '周宁', operatorOrg: '外场商户' },
        { stage: '直接完结', result: '已完结', time: '2026-08-18 10:05:00', operatorName: '系统管理员', operatorOrg: '区域调度', contentLabel: '完结说明', contentText: '属咨询类问题，已电话说明报修渠道，无需派工。' },
        { stage: '已评价', result: '已评价', time: '2026-08-18 11:20:00', operatorName: '周宁', operatorOrg: '外场商户', fields: [{ label: '评分', value: '5 分' }], contentLabel: '评价说明', contentText: '答复清楚，处理及时' }
      ]
    }
  ];
}

function nowStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}

function loadOrders() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw && Array.isArray(raw) && raw.length) return raw;
  } catch (e) { /* ignore */ }
  const seeded = seedOrders();
  saveOrders(seeded);
  return seeded;
}

function saveOrders(list) {
  wx.setStorageSync(STORAGE_KEY, list);
}

function getCurrentUser() {
  const user = session.getUser() || {};
  return {
    id: user.id || env.mockUserId || 'lisi',
    name: user.name || '李四',
    role: user.role || '运维工程师'
  };
}

function findParticipant(regionId) {
  return PARTICIPANTS.find(function (p) { return p.regionId === regionId && p.status === '启用'; }) || null;
}

function resolveDispatchers(regionId) {
  const p = findParticipant(regionId);
  if (p && p.dispatchers && p.dispatchers.length) return p.dispatchers.slice();
  return (DEFAULT_DISPATCHER.people || []).slice();
}

function resolveHandlers(regionId) {
  const p = findParticipant(regionId);
  if (p && p.handlers && p.handlers.length) return p.handlers.slice();
  return (DEFAULT_HANDLERS.people || []).slice();
}

function isOrderStarter(order, user) {
  user = user || getCurrentUser();
  if (!order || !user) return false;
  const account = String(user.id || user.account || '').trim();
  const name = String(user.name || '').trim();
  const starterAccount = String(order.starterAccount || '').trim();
  const starterName = String(order.starterName || '').trim();
  if (account && starterAccount && starterAccount === account) return true;
  if (name && starterName === name) {
    if (!account) return true;
    if (!starterAccount) return true;
  }
  return false;
}

function isWorkorderParticipant(order, user) {
  user = user || getCurrentUser();
  if (!order) return false;
  return isDispatcher(user, order.regionId) ||
    isAssignee(order, user) ||
    isPrimaryHandler(order, user);
}

/** 待我处理：区域管理员或指派执行人相关、且非本人上报；本人上报在员工端「我的报事」查看 */
function isWorkorderMineTab(order, user) {
  user = user || getCurrentUser();
  if (!isOrderInScope(order, user)) return false;
  if (isOrderStarter(order, user)) return false;
  if (!isWorkorderParticipant(order, user)) return false;
  const status = order.status;
  if (status === '待派单') return isDispatcher(user, order.regionId);
  if (status === '已派单') {
    return isDispatcher(user, order.regionId) || isAssignee(order, user);
  }
  if (status === '处理中') return isPrimaryHandler(order, user);
  return false;
}

function isOrderInScope(order, user) {
  if (!order) return false;
  const scope = dataScope.resolveDataScope(user);
  return dataScope.matchesDataScope(scope, { regionId: order.regionId, regionName: order.regionName });
}

function isDispatcher(user, regionId) {
  user = user || getCurrentUser();
  const ids = resolveDispatchers(regionId).map(function (p) { return p.id; });
  return ids.indexOf(user.id) >= 0;
}

function isAssignee(order, user) {
  user = user || getCurrentUser();
  return (order.assignees || []).some(function (a) {
    return a && (a.id === user.id || a.name === user.name);
  });
}

function isPrimaryHandler(order, user) {
  user = user || getCurrentUser();
  if (!order) return false;
  if (order.primaryHandlerId && order.primaryHandlerId === user.id) return true;
  if (order.primaryHandlerName && order.primaryHandlerName === user.name) return true;
  return false;
}

function canDirectClose(order) {
  if (!order) return false;
  if (order.status === '待派单' || order.status === '待派单（退回）') return true;
  return order.status === '已派单' && !order.primaryHandlerId && !order.primaryHandlerName && !order.acceptedAt;
}

function statusClass(status) {
  const map = {
    '待派单': 'tag-accent',
    '待派单（退回）': 'tag-accent',
    '已派单': 'tag-info',
    '处理中': 'tag-warning',
    '已完结': 'tag-success',
    '已撤回': 'tag-muted'
  };
  return map[status] || 'tag-muted';
}

function assigneeNames(order) {
  return (order.assignees || []).map(function (a) { return a.name; }).filter(Boolean).join('、') || '—';
}

function dispatcherNamesText(order) {
  if (!order) return '—';
  if (order.dispatcherNames) return order.dispatcherNames;
  const names = resolveDispatchers(order.regionId).map(function (p) {
    return p.name || p.id;
  }).filter(Boolean);
  return names.length ? names.join('、') : '—';
}

function attachActions(order, user) {
  user = user || getCurrentUser();
  const actions = [{ key: 'detail', label: '详情' }];
  if (!isOrderInScope(order, user)) return actions;
  if ((order.status === '待派单' || order.status === '待派单（退回）') && isDispatcher(user, order.regionId)) {
    actions.push({ key: 'dispatch', label: '派单' });
    actions.push({ key: 'direct-close', label: '直接完结' });
  }
  if (order.status === '已派单') {
    if (isDispatcher(user, order.regionId)) {
      actions.push({ key: 'transfer', label: '转派' });
      if (canDirectClose(order)) actions.push({ key: 'direct-close', label: '直接完结' });
    }
    if (isAssignee(order, user)) actions.push({ key: 'accept', label: '接单' });
  }
  if (order.status === '处理中' && isPrimaryHandler(order, user)) {
    actions.push({ key: 'finish', label: '完工' });
  }
  return actions;
}

function enrichOrder(order, user) {
  user = user || getCurrentUser();
  const reportImages = workorderMedia.normalizeReportImages(order);
  const reportAttachments = workorderMedia.normalizeReportAttachments(order);
  const item = Object.assign({}, order);
  item.statusClass = statusClass(item.status);
  item.assigneesText = assigneeNames(item);
  item.dispatcherNamesText = dispatcherNamesText(order);
  item.dispatchTimeText = item.dispatchedAt || '—';
  item.handlerText = item.primaryHandlerName || '—';
  item.useActualHandler = item.status === '处理中' || item.status === '已完结';
  item.hasFeedback = !!(item.feedbackRemark);
  item.handlerFieldLabel = item.useActualHandler ? '实际处理人' : '指派处理人';
  item.handlerFieldValue = item.useActualHandler
    ? (item.primaryHandlerName || '—')
    : item.assigneesText;
  item.showHandlerField = item.useActualHandler
    ? !!item.primaryHandlerName
    : item.assigneesText !== '—';
  item.reportImages = reportImages;
  item.reportAttachments = reportAttachments;
  item.hasReportImages = reportImages.length > 0;
  item.hasReportAttachments = reportAttachments.length > 0;
  item.reportImageUrls = reportImages.map(function (img) { return img.url; });
  item.reportVideos = reportAttachments.filter(function (f) { return f.type === 'video'; });
  item.reportFiles = reportAttachments.filter(function (f) { return f.type !== 'video'; });
  item.hasReportVideos = item.reportVideos.length > 0;
  item.timeline = workorderTimeline.enrichTimelineNodes(order, reportImages, reportAttachments);
  item.actions = attachActions(item, user);
  item.canProcess = item.actions.some(function (a) { return a.key !== 'detail'; });
  return item;
}

function isPendingForUser(order, user) {
  return isWorkorderMineTab(order, user);
}

function listWorkOrders(tab, status, query) {
  const user = getCurrentUser();
  tab = tab || 'all';
  status = status || 'all';
  query = query || {};
  const kw = String(query.keyword || '').trim().toLowerCase();
  let list = loadOrders().filter(function (o) { return isOrderInScope(o, user); });
  if (tab === 'mine' || tab === 'pending') {
    list = list.filter(function (o) { return isWorkorderMineTab(o, user); });
  }
  if (status && status !== 'all') {
    list = list.filter(function (o) { return o.status === status; });
  }
  if (kw) {
    list = list.filter(function (o) {
      const blob = [o.id, o.content, o.starterName, o.regionName, o.categoryName].join(' ').toLowerCase();
      return blob.indexOf(kw) >= 0;
    });
  }
  return list.sort(function (a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  }).map(function (o) { return enrichOrder(o, user); });
}

function getWorkOrder(id) {
  const user = getCurrentUser();
  const order = loadOrders().find(function (o) { return o.id === id; });
  if (!order || !isOrderInScope(order, user)) return null;
  return enrichOrder(order, user);
}

function findOrderRaw(id) {
  return loadOrders().find(function (o) { return o.id === id; }) || null;
}

function pushTimeline(order, node) {
  order.timeline = order.timeline || [];
  order.timeline.push(node);
}

const CATEGORIES = [
  { id: 'WC-000', name: '默认工单', systemDefault: true },
  { id: 'WC-001', name: '设施维修' },
  { id: 'WC-002', name: '环境保洁' },
  { id: 'WC-003', name: '投诉建议' },
  { id: 'WC-004', name: '公共安全' },
  { id: 'WC-005', name: '其他' }
];

function listWorkOrderCategories() {
  return CATEGORIES.filter(function (c) { return c.id; });
}

function findCategory(id) {
  return CATEGORIES.find(function (c) { return c.id === id; }) || null;
}

function normalizeImages(list, prefix) {
  return workorderMedia.normalizeNodeImages(list, prefix);
}

function normalizeAttachments(list) {
  return workorderMedia.normalizeNodeAttachments(list);
}

function applyCategory(order, payload) {
  const cat = findCategory(payload.categoryId) || (payload.categoryName ? { id: payload.categoryId || '', name: payload.categoryName } : null);
  if (cat && cat.id) {
    order.categoryId = cat.id;
    order.categoryName = cat.name;
  }
}

function updateWorkOrderCategory(id, payload) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || order.status !== '待派单') return { ok: false, message: '仅待派单可修改分类' };
  if (!isDispatcher(user, order.regionId)) return { ok: false, message: '当前账号无修改权限' };
  const cat = findCategory((payload || {}).categoryId);
  if (!cat) return { ok: false, message: '请选择工单分类' };
  const prev = order.categoryName || '—';
  if (order.categoryId === cat.id) {
    return { ok: true, order: enrichOrder(order, user) };
  }
  applyCategory(order, { categoryId: cat.id, categoryName: cat.name });
  pushTimeline(order, {
    stage: '调整',
    result: '修改分类',
    time: nowStr(),
    operatorName: user.name,
    operatorOrg: user.dept || '',
    remark: '分类：' + prev + ' → ' + order.categoryName
  });
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function dispatchWorkOrder(id, payload) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || (order.status !== '待派单' && order.status !== '待派单（退回）')) return { ok: false, message: '仅待派单或待派单（退回）可派单' };
  if (!isDispatcher(user, order.regionId)) return { ok: false, message: '当前账号无该区域派单权限' };
  const assignees = (payload.assignees || []).filter(Boolean);
  const remark = String(payload.remark || '').trim();
  if (!assignees.length) return { ok: false, message: '请至少选择一名处理人' };
  applyCategory(order, payload || {});
  order.assignees = assignees.map(function (a) { return { id: a.id, name: a.name, role: '协助' }; });
  order.dispatchRemark = remark;
  order.status = '已派单';
  order.dispatchedAt = nowStr();
  order.primaryHandlerId = '';
  order.primaryHandlerName = '';
  order.acceptedAt = '';
  const dispatchNode = {
    stage: '派单', result: '已派单', time: order.dispatchedAt,
    operatorName: user.name, operatorOrg: user.dept || '',
    fields: [
      { label: '工单分类', value: order.categoryName || '' },
      { label: '指派处理人', value: assigneeNames(order) }
    ]
  };
  if (remark) {
    dispatchNode.contentLabel = '派单说明';
    dispatchNode.contentText = remark;
  }
  pushTimeline(order, dispatchNode);
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function transferWorkOrder(id, payload) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || order.status !== '已派单') return { ok: false, message: '仅已派单可转派' };
  if (!isDispatcher(user, order.regionId)) return { ok: false, message: '当前账号无转派权限' };
  const assignees = (payload.assignees || []).filter(Boolean);
  const remark = String(payload.remark || '').trim();
  if (!assignees.length) return { ok: false, message: '请至少选择一名处理人' };
  applyCategory(order, payload || {});
  order.assignees = assignees.map(function (a) { return { id: a.id, name: a.name, role: '协助' }; });
  order.dispatchRemark = remark || order.dispatchRemark;
  order.dispatchedAt = nowStr();
  order.primaryHandlerId = '';
  order.primaryHandlerName = '';
  order.acceptedAt = '';
  pushTimeline(order, {
    stage: '转派', result: '已派单', time: order.dispatchedAt,
    operatorName: user.name, operatorOrg: user.dept || '',
    contentLabel: '转派说明', contentText: remark || '已转派',
    fields: [
      { label: '转派时间', value: order.dispatchedAt },
      { label: '指派处理人', value: assigneeNames(order) }
    ],
    remark: '需重新接单'
  });
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function acceptWorkOrder(id) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || order.status !== '已派单') return { ok: false, message: '仅已派单可接单' };
  if (!isAssignee(order, user)) return { ok: false, message: '仅被指派处理人可接单' };
  order.assignees.forEach(function (a) {
    a.role = (a.id === user.id || a.name === user.name) ? '实际处理人' : '协助';
  });
  order.primaryHandlerId = user.id;
  order.primaryHandlerName = user.name;
  order.acceptedAt = nowStr();
  order.status = '处理中';
  pushTimeline(order, {
    stage: '接单', result: '处理中', time: order.acceptedAt,
    operatorName: user.name, operatorOrg: user.dept || ''
  });
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function finishWorkOrder(id, payload) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || order.status !== '处理中') return { ok: false, message: '仅处理中可完工' };
  if (!isPrimaryHandler(order, user)) return { ok: false, message: '仅实际处理人可完工' };
  const remark = String(payload.remark || '').trim();
  if (!remark) return { ok: false, message: '请填写完工说明' };
  const finishImages = normalizeImages(payload.images, '完工图');
  const finishAttachments = normalizeAttachments(payload.attachments);
  order.finishRemark = remark;
  order.finishImages = finishImages;
  order.finishAttachments = finishAttachments;
  order.finishedAt = nowStr();
  order.status = '已完结';
  pushTimeline(order, {
    stage: '完工', result: '已完结', time: order.finishedAt,
    operatorName: user.name, operatorOrg: user.dept || '',
    contentLabel: '完工说明', contentText: remark,
    imageLabel: '完工图片', images: finishImages.slice(),
    attachmentLabel: '完工附件', attachments: finishAttachments.slice()
  });
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function directCloseWorkOrder(id, payload) {
  const user = getCurrentUser();
  const orders = loadOrders();
  const order = orders.find(function (o) { return o.id === id; });
  if (!order || !canDirectClose(order)) return { ok: false, message: '当前状态不可直接完结' };
  if (!isDispatcher(user, order.regionId)) return { ok: false, message: '当前账号无直接完结权限' };
  const remark = String(payload.remark || '').trim();
  if (!remark) return { ok: false, message: '请填写完结说明' };
  applyCategory(order, payload || {});
  const closeImages = normalizeImages(payload.images, '完结图');
  const closeAttachments = normalizeAttachments(payload.attachments);
  const time = nowStr();
  order.status = '已完结';
  order.dispatchedAt = time;
  order.dispatchRemark = remark;
  order.assignees = [];
  order.primaryHandlerId = '';
  order.primaryHandlerName = '';
  order.acceptedAt = '';
  order.finishImages = closeImages;
  order.finishAttachments = closeAttachments;
  order.finishRemark = '';
  order.finishedAt = '';
  order.acceptResult = '';
  order.acceptRemark = '';
  order.acceptAt = '';
  pushTimeline(order, {
    stage: '直接完结', result: '已完结', time: time,
    operatorName: user.name, operatorOrg: user.dept || '',
    fields: [{ label: '工单分类', value: order.categoryName || '' }],
    contentLabel: '完结说明', contentText: remark,
    imageLabel: '完结图片', images: closeImages.slice(),
    attachmentLabel: '完结附件', attachments: closeAttachments.slice()
  });
  saveOrders(orders);
  return { ok: true, order: enrichOrder(order, user) };
}

function listRegionHandlers(regionId) {
  return resolveHandlers(regionId);
}

module.exports = {
  listWorkOrders: listWorkOrders,
  getWorkOrder: getWorkOrder,
  updateWorkOrderCategory: updateWorkOrderCategory,
  dispatchWorkOrder: dispatchWorkOrder,
  transferWorkOrder: transferWorkOrder,
  acceptWorkOrder: acceptWorkOrder,
  finishWorkOrder: finishWorkOrder,
  directCloseWorkOrder: directCloseWorkOrder,
  listRegionHandlers: listRegionHandlers,
  listWorkOrderCategories: listWorkOrderCategories,
  resolveDispatchers: resolveDispatchers,
  isOrderInScope: isOrderInScope,
  isOrderStarter: isOrderStarter,
  isWorkorderMineTab: isWorkorderMineTab
};
