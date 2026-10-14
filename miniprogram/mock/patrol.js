/** 对齐 PC 演示数据的 Mock，联调前使用 */
const dataScope = require('../utils/data-scope');
const pagePerm = require('../config/page-permissions');
const patrolFormat = require('../utils/patrol-format');
const patrolTaskQuery = require('../utils/patrol-task-query');
const patrolIssueQuery = require('../utils/patrol-issue-query');
const patrolIssueFormat = require('../utils/patrol-issue-format');
const patrolIssueAction = require('../utils/patrol-issue-action');
const patrolIssueCreator = require('../utils/patrol-issue-creator');
const patrolIssueFlowLog = require('../utils/patrol-issue-flow-log');
const patrolSchedule = require('../utils/patrol-schedule');
const guardScheduleData = require('./patrol-schedule-data');
const taskStore = require('./patrol-task-store');
const messageStore = require('../utils/message-store');

const OBJECT_NAME_TO_ID = {
  '地下一层设备巡检': 'PO-001',
  '15楼消防检查': 'PO-002',
  '15楼卫生检查': 'PO-003',
  '15楼空调机房': 'PO-004'
};

/** 对齐 PC 问题管理表 data-patrol-issue-* 扩展字段 */
const ISSUE_EXTRAS = {
  'IS-20260530-021': {
    objectId: 'PO-001',
    source: '临时上报'
  },
  'IS-20260530-025': {
    objectId: 'PO-001',
    source: '临时上报',
    issues: [{
      issueNo: 'IS-20260530-025',
      desc: '机房门口堆物需清理',
      images: [],
      attachments: []
    }]
  },
  'IS-20260623-101': {
    objectId: 'PO-002',
    source: '临时上报',
    issues: [{
      issueNo: 'IS-20260623-101',
      desc: '15F 走廊应急灯不亮（编辑功能测试）',
      images: [],
      attachments: []
    }]
  },
  'IS-20260530-023': {
    objectId: 'PO-001',
    taskPlanName: '视频远程日检',
    issues: [{
      issueNo: 'IS-20260530-023',
      desc: 'B1 车库东侧通道堆放杂物',
      images: [{ tone: 'garage', path: 'https://picsum.photos/seed/patrol-garage-east/400/400', label: '通道杂物', caption: 'B1 车库东侧通道杂物' }],
      attachments: []
    }],
    rectifyDesc: '已清理杂物并设置警示标识，请远程视频复检。',
    rectifyAt: '2026-05-30 15:50',
    rectifyBy: '李四 · 工程部',
    rectifyFiles: [{ name: 'rectify-east.jpg', type: 'image', label: '整改后通道', path: 'https://picsum.photos/seed/patrol-rectify-east/400/400' }]
  },
  'IS-20260529-013': {
    objectId: 'PO-001',
    taskPlanName: '视频远程日检',
    issues: [{
      issueNo: 'IS-20260529-013',
      desc: 'B1 车库西侧通道杂物堆放',
      images: [{ tone: 'garage', path: 'https://picsum.photos/seed/patrol-garage-west/400/400', label: '通道杂物', caption: 'B1 车库通道杂物堆放' }],
      attachments: []
    }],
    rectifyDesc: '已清理通道杂物并设置禁停标识，请远程视频复检确认。',
    rectifyAt: '2026-05-29 16:40',
    rectifyBy: '李四 · 工程部',
    rectifyFiles: [{ name: 'rectify-garage.jpg', type: 'image', label: '整改后通道', path: 'https://picsum.photos/seed/patrol-rectify-garage/400/400' }]
  },
  'IS-20260527-011': {
    objectId: 'PO-002',
    guardPoints: ['GP-003'],
    title: '外广场北侧消火栓箱门损坏',
    taskPlanName: '全楼消防周检',
    issues: [{
      issueNo: 'IS-20260527-011',
      desc: '外广场北侧消火栓箱门损坏',
      images: [{ tone: 'hydrant', path: 'https://picsum.photos/seed/patrol-hydrant-door/400/400', label: '箱门损坏', caption: '外广场北侧消火栓箱门损坏' }],
      attachments: []
    }],
    rectifyDesc: '已更换消火栓箱门并加固铰链，请复检确认。',
    rectifyAt: '2026-05-28 10:30',
    rectifyBy: '张三 · 安保部',
    rectifyFiles: [{ name: 'rectify-hydrant.jpg', type: 'image', label: '整改后照片', path: 'https://picsum.photos/seed/patrol-rectify-hydrant/400/400' }]
  },
  'IS-20260530-008': {
    objectId: 'PO-002',
    taskPlanName: '全楼消防周检',
    issues: [{
      issueNo: 'IS-20260530-008',
      desc: '消火栓箱门损坏',
      images: [{ tone: 'hydrant', path: 'https://picsum.photos/seed/patrol-hydrant-broken/400/400', label: '箱门损坏', caption: '消火栓箱门损坏' }],
      attachments: []
    }],
    rectifyDesc: '已更换箱门并完成喷漆处理。',
    rectifyAt: '2026-05-30 14:00',
    rectifyBy: '消防班组',
    rectifyFiles: [{ name: 'rectify-door.jpg', type: 'image', label: '整改后箱门', path: 'https://picsum.photos/seed/patrol-rectify-door/400/400' }],
    reinspectResult: '合格',
    reinspectRemark: '现场查看箱门完好，标识齐全。',
    reinspectAt: '2026-05-30 16:20',
    reinspectBy: '张三 · 安保部',
    reinspectImages: [{ path: 'https://picsum.photos/seed/patrol-reinspect-hydrant/400/400', label: '复检现场', caption: '复检确认箱门完好' }]
  },
  'IS-20260531-012': {
    objectId: 'PO-001',
    taskPlanName: 'B2 机房日检',
    issues: [{
      issueNo: 'IS-20260531-012',
      desc: 'B2 配电室温度偏高',
      images: [{ tone: 'ups', path: 'https://picsum.photos/seed/patrol-ups-temp/400/400', label: '温度告警截图', caption: 'UPS 运行指标超限告警截图' }],
      attachments: []
    }],
    rectifyDesc: '已调整空调设定并清理散热通道，当前温度已回落。',
    rectifyAt: '2026-05-31 15:20',
    rectifyBy: '王主管',
    rectifyFiles: [{ name: 'rectify-temp.jpg', type: 'image', label: '整改后温度读数', path: 'https://picsum.photos/seed/patrol-rectify-temp/400/400' }],
    reinspectResult: '合格',
    reinspectRemark: '温度读数已恢复正常范围。',
    reinspectAt: '2026-05-31 17:10',
    reinspectBy: '系统',
    reinspectImages: [{ path: 'https://picsum.photos/seed/patrol-reinspect-temp/400/400', label: '复检读数', caption: '复检确认温度正常' }]
  },
  'IS-20260530-ABN-4': {
    objectId: 'PO-001',
    taskPlanName: '异常结果样式演示',
    issues: [{
      issueNo: 'IS-20260530-ABN-4',
      desc: '关联通道检测到人员靠近设备',
      images: [{ tone: 'env', path: 'https://picsum.photos/seed/patrol-abn-person/400/400', label: '告警截图', caption: '通道人员靠近设备' }],
      attachments: []
    }],
    rectifyDesc: '已设置隔离警示并完成现场劝离。',
    rectifyAt: '2026-05-30 16:05',
    rectifyBy: '李四 · 工程部',
    rectifyFiles: [{ name: 'rectify-abn.jpg', type: 'image', label: '整改后现场', path: 'https://picsum.photos/seed/patrol-rectify-abn/400/400' }]
  },
  'IS-20260530-024': {
    objectId: 'PO-001',
    guardPoints: ['GP-002'],
    taskPlanName: 'B2 机房日检',
    issues: [{
      issueNo: 'IS-20260530-024',
      desc: 'B2 机房入口通道堆放杂物',
      images: [{ tone: 'env', path: 'https://picsum.photos/seed/patrol-gp002-clutter/400/400', label: '通道杂物', caption: 'B2 机房入口通道堆放杂物' }],
      attachments: []
    }],
    rectifyDesc: '已清理通道杂物并划定禁堆区域，请前往问题发生巡更点打卡复检。',
    rectifyAt: '2026-05-30 15:10',
    rectifyBy: '系统管理员',
    rectifyFiles: [{ name: 'rectify-gp002.jpg', type: 'image', label: '整改后通道', path: 'https://picsum.photos/seed/patrol-rectify-gp002/400/400' }]
  }
};

const MOCK_TODAY = (function () {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
})();

/** 相对当前时刻的计划开始时间，保证演示「待完成」不被动态超时规则刷成「已超时」 */
function mockScheduledInHours(hours) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes());
}

const ALL_TASKS = [
  /** 相对时刻待完成（李四/赵六）：日历推进后仍可测催办、转派、去执行 */
  { taskId: 'TK-PENDING-L01', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: mockScheduledInHours(2), completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'lisi', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-PENDING-L02', planCode: 'PL-2026-005', planName: '暖通设备周检', objectName: '15楼空调机房', scheduled: mockScheduledInHours(5), completedAt: '', progress: { done: 1, total: 3 }, status: '待完成', executorId: 'lisi', executorIds: ['lisi'] },
  { taskId: 'TK-PENDING-L03', planCode: 'PL-2026-002', planName: '全楼消防周检', objectName: '15楼消防检查', scheduled: mockScheduledInHours(26), completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'zhaoliu', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-PENDING-Z01', planCode: 'PL-2026-Z06', planName: '赵六专属巡检（单人）', objectName: '15楼空调机房', scheduled: mockScheduledInHours(3), completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'zhaoliu', executorIds: ['zhaoliu'] },
  /** 仅赵六执行人：测「我的任务 / 去执行」与非执行人只读查看 */
  { taskId: 'TK-20260530-Z06', planCode: 'PL-2026-Z06', planName: '赵六专属巡检（单人）', objectName: '15楼空调机房', scheduled: '2026-05-30 16:00', completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'zhaoliu', executorIds: ['zhaoliu'] },
  { taskId: 'TK-20260530-R01', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 13:00', completedAt: '', progress: { done: 1, total: 3 }, status: '待完成', executorId: 'wangwu', executorIds: ['wangwu'], reassignedFrom: ['lisi'] },
  { taskId: 'TK-20260530-R02', planCode: 'PL-2026-004', planName: '视频远程日检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 15:30', completedAt: '', progress: { done: 2, total: 3 }, status: '待完成', executorId: 'lisi', executorIds: ['lisi'], reassignedFrom: ['zhangsan'] },
  { taskId: 'TK-20260530-100', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 08:00', completedAt: '', progress: { done: 0, total: 3 }, status: '待完成', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260530-103', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 11:00', completedAt: '', progress: { done: 0, total: 1 }, status: '待完成', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260601-105', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-06-01 08:00', completedAt: '', progress: { done: 0, total: 1 }, status: '待完成', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260529-204', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-29 11:00', completedAt: '', progress: { done: 0, total: 1 }, status: '已超时', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260529-205', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-29 08:00', completedAt: '', progress: { done: 2, total: 3 }, status: '已超时', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260527-305', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-27 08:00', completedAt: '2026-05-27 08:12', progress: { done: 1, total: 1 }, status: '已完成', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260527-306', planCode: 'PL-2026-001', planName: 'B2 机房日检', objectName: '地下一层设备巡检', scheduled: '2026-05-27 14:00', completedAt: '2026-05-27 14:08', progress: { done: 1, total: 1 }, status: '已完成', executorId: 'admin', executorIds: ['admin', 'lisi', 'zhaoliu'] },
  { taskId: 'TK-20260530-ABN', planCode: 'PL-2026-DEMO', planName: '异常结果样式演示', objectName: '地下一层设备巡检', scheduled: '2026-05-30 15:00', completedAt: '2026-05-30 15:35', progress: { done: 3, total: 3 }, status: '已完成', executorId: 'lisi' },
  { taskId: 'TK-20260530-104', planCode: 'PL-2026-003', planName: '15楼卫生月检', objectName: '15楼卫生检查', scheduled: '2026-05-30 10:00', completedAt: '', progress: { done: 0, total: 1 }, status: '待完成', executorId: 'zhaoliu' },
  { taskId: 'TK-20260530-106', planCode: 'PL-2026-005', planName: '暖通设备周检', objectName: '15楼空调机房', scheduled: '2026-05-30 14:00', completedAt: '', progress: { done: 0, total: 3 }, status: '待完成', executorId: 'zhaoliu', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-20260529-206', planCode: 'PL-2026-003', planName: '15楼卫生月检', objectName: '15楼卫生检查', scheduled: '2026-05-29 10:00', completedAt: '', progress: { done: 0, total: 1 }, status: '已超时', executorId: 'zhaoliu' },
  { taskId: 'TK-20260528-303', planCode: 'PL-2026-005', planName: '暖通设备周检', objectName: '15楼空调机房', scheduled: '2026-05-28 14:00', completedAt: '2026-05-28 14:35', progress: { done: 3, total: 3 }, status: '已完成', executorId: 'zhaoliu', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-20260601-107', planCode: 'PL-2026-005', planName: '暖通设备周检', objectName: '15楼空调机房', scheduled: '2026-06-01 14:00', completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'zhaoliu', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-20260530-102', planCode: 'PL-2026-002', planName: '全楼消防周检', objectName: '15楼消防检查', scheduled: '2026-05-30 09:00', completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'lisi', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-20260530-DEMO', planCode: 'PL-2026-DEMO', planName: '参考图演示专检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 14:00', completedAt: '', progress: { done: 0, total: 3 }, status: '待完成', executorId: 'admin', executorIds: ['admin', 'lisi'] },
  { taskId: 'TK-20260529-DEMO', planCode: 'PL-2026-DEMO', planName: '参考图演示专检', objectName: '15楼消防检查', scheduled: '2026-05-29 14:00', completedAt: '2026-05-29 14:35', progress: { done: 3, total: 3 }, status: '已完成', executorId: 'lisi' },
  { taskId: 'TK-20260530-101', planCode: 'PL-2026-004', planName: '视频远程日检', objectName: '地下一层设备巡检', scheduled: '2026-05-30 07:00', completedAt: '', progress: { done: 0, total: 2 }, status: '待完成', executorId: 'zhangsan', executorIds: ['zhangsan', 'chenliu'] },
  { taskId: 'TK-20260529-201', planCode: 'PL-2026-004', planName: '视频远程日检', objectName: '地下一层设备巡检', scheduled: '2026-05-29 07:00', completedAt: '', progress: { done: 0, total: 2 }, status: '已超时', executorId: 'zhangsan', executorIds: ['zhangsan', 'chenliu'] },
  { taskId: 'TK-20260528-301', planCode: 'PL-2026-004', planName: '视频远程日检', objectName: '地下一层设备巡检', scheduled: '2026-05-28 07:00', completedAt: '2026-05-28 07:45', progress: { done: 2, total: 2 }, status: '已完成', executorId: 'zhangsan', executorIds: ['zhangsan', 'chenliu'] },
  { taskId: 'TK-20260529-203', planCode: 'PL-2026-002', planName: '全楼消防周检', objectName: '15楼消防检查', scheduled: '2026-05-29 09:30', completedAt: '', progress: { done: 0, total: 1 }, status: '已超时', executorId: 'lisi', executorIds: ['lisi', 'zhaoliu'] },
  { taskId: 'TK-20260528-302', planCode: 'PL-2026-004', planName: '视频远程日检', objectName: '地下一层设备巡检', scheduled: '2026-05-28 10:00', completedAt: '2026-05-28 10:15', progress: { done: 1, total: 1 }, status: '已完成', executorId: 'zhangsan', executorIds: ['zhangsan', 'chenliu'] },
  { taskId: 'TK-20260527-307', planCode: 'PL-2026-002', planName: '全楼消防周检', objectName: '15楼消防检查', scheduled: '2026-05-27 09:00', completedAt: '2026-05-27 16:30', progress: { done: 2, total: 2 }, status: '已完成', executorId: 'lisi', executorIds: ['lisi', 'zhaoliu'] }
];

const ALL_ISSUES = [
  /** 编辑测试（lisi 创建+处理）：IS-20260623-101 */
  { issueNo: 'IS-20260623-101', title: '15F 走廊应急灯不亮（编辑功能测试）', status: '待整改', source: '临时上报', creatorId: 'lisi', handlerId: 'lisi', createdAt: '2026-06-23 09:00', objectName: '15楼消防检查', itemId: 'PI-001', itemName: '消防通道畅通', editable: true, method: '现场' },
  /** 待复检测试（lisi）：现场 IS-20260530-024 · 远程 IS-20260529-013 · 自动 IS-20260530-ABN-4；现场 zhangsan：IS-20260527-011 */
  { issueNo: 'IS-20260530-021', title: '配电室湿度超标需处理', status: '待整改', source: '临时上报', creatorId: 'admin', handlerId: 'admin', createdAt: '2026-05-30 16:30', objectName: '地下一层设备巡检', itemId: 'PI-002', itemName: '配电室温湿度', editable: true },
  { issueNo: 'IS-20260530-025', title: '机房门口堆物需清理', status: '待整改', source: '临时上报', creatorId: 'lisi', handlerId: 'wangwu', createdAt: '2026-05-30 17:00', objectName: '地下一层设备巡检', itemId: 'PI-005', itemName: '机房环境检查', editable: true },
  { issueNo: 'IS-20260530-022', title: 'B2 机房地面线缆未整理', status: '待整改', source: '现场巡检', creatorId: 'lisi', handlerId: 'admin', createdAt: '2026-05-30 16:10', taskId: 'TK-20260530-100', itemId: 'PI-005', itemName: '机房环境检查' },
  { issueNo: 'IS-20260530-023', title: 'B1 车库东侧通道堆放杂物', status: '待复检', source: '远程巡检', creatorId: 'admin', handlerId: 'lisi', createdAt: '2026-05-30 15:20', taskId: 'TK-20260530-101', itemId: 'PI-007', itemName: 'B1车库视频监控' },
  { issueNo: 'IS-20260601-003', title: '1F 消防通道堆放杂物', status: '待整改', source: '远程巡检', creatorId: 'lisi', handlerId: 'lisi', createdAt: '2026-06-01 08:35', taskId: 'TK-20260530-100', itemId: 'PI-002', itemName: '配电室温湿度' },
  { issueNo: 'IS-20260528-016', title: 'B1 车库入口通道杂物堆放', status: '待整改', source: '远程巡检', creatorId: 'lisi', handlerId: 'lisi', createdAt: '2026-05-28 14:22', taskId: 'TK-20260528-301', itemId: 'PI-007', itemName: 'B1车库视频监控' },
  { issueNo: 'IS-20260528-017', title: 'B1 车库西侧消防栓前违停', status: '待整改', source: '远程巡检', creatorId: 'lisi', handlerId: 'lisi', createdAt: '2026-05-28 14:22', taskId: 'TK-20260528-301', itemId: 'PI-007', itemName: 'B1车库视频监控' },
  { issueNo: 'IS-20260529-013', title: 'B1 车库西侧通道杂物堆放', status: '待复检', source: '远程巡检', creatorId: 'lisi', handlerId: 'lisi', createdAt: '2026-05-29 09:10', taskId: 'TK-20260528-301', itemId: 'PI-007', itemName: 'B1车库视频监控' },
  { issueNo: 'IS-20260528-015', title: 'B2 机房入口通道堆放杂物', status: '待整改', source: '现场巡检', creatorId: 'zhangsan', handlerId: 'zhangsan', createdAt: '2026-05-28 09:18', taskId: 'TK-20260528-303', itemId: 'PI-001', itemName: '消防通道畅通' },
  { issueNo: 'IS-20260527-011', title: '外广场北侧消火栓箱门损坏', status: '待复检', source: '现场巡检', creatorId: 'zhangsan', handlerId: 'zhangsan', createdAt: '2026-05-27 16:22', taskId: 'TK-20260527-307', itemId: 'PI-004', itemName: '消火栓外观检查' },
  { issueNo: 'IS-20260529-018', title: '主入口周界监控画面模糊', status: '待复检', source: '远程巡检', creatorId: 'chenliu', handlerId: 'zhangsan', createdAt: '2026-05-29 11:05', taskId: 'TK-20260529-201', itemId: 'PI-008', itemName: '主入口通行监控' },
  { issueNo: 'IS-20260527-306-A', title: 'UPS 负载超过 80% 存在运行风险', status: '待整改', source: '自动巡检', creatorId: 'system', handlerId: 'lisi', createdAt: '2026-05-27 14:08', taskId: 'TK-20260527-306', itemId: 'PI-006', itemName: 'UPS 运行状态' },
  { issueNo: 'IS-20260530-ABN-1', title: '配电室湿度 78% 超过标准上限', status: '待整改', source: '远程巡检', creatorId: 'lisi', handlerId: 'wangwu', createdAt: '2026-05-30 15:12', taskId: 'TK-20260530-ABN', itemId: 'PI-002', itemName: '配电室温湿度' },
  { issueNo: 'IS-20260530-ABN-2', title: '监控画面存在遮挡无法读表', status: '待整改', source: '远程巡检', creatorId: 'lisi', handlerId: 'wangwu', createdAt: '2026-05-30 15:12', taskId: 'TK-20260530-ABN', itemId: 'PI-002', itemName: '配电室温湿度' },
  { issueNo: 'IS-20260530-ABN-3', title: '锅炉压力表读数超出合格区间', status: '待整改', source: '自动巡检', creatorId: 'system', handlerId: 'lisi', createdAt: '2026-05-30 15:35', taskId: 'TK-20260530-ABN', itemId: 'PI-003', itemName: '锅炉压力表读数' },
  { issueNo: 'IS-20260530-ABN-4', title: '关联通道检测到人员靠近设备', status: '待复检', source: '自动巡检', creatorId: 'system', handlerId: 'lisi', createdAt: '2026-05-30 15:35', taskId: 'TK-20260530-ABN', itemId: 'PI-003', itemName: '锅炉压力表读数' },
  { issueNo: 'IS-20260530-024', title: 'B2 机房入口通道堆放杂物', status: '待复检', source: '现场巡检', creatorId: 'lisi', handlerId: 'admin', createdAt: '2026-05-30 14:20', taskId: 'TK-20260530-100', itemId: 'PI-005', itemName: '机房环境检查' },
  { issueNo: 'IS-20260530-008', title: '消火栓箱门损坏', status: '已完成', source: '现场巡检', creatorId: 'zhangsan', handlerId: 'zhangsan', createdAt: '2026-05-30 10:15', taskId: 'TK-20260527-307', itemId: 'PI-004', itemName: '消火栓外观检查' },
  { issueNo: 'IS-20260531-012', title: 'B2 配电室温度偏高', status: '已完成', source: '自动巡检', creatorId: 'system', handlerId: 'lisi', createdAt: '2026-05-31 11:05', taskId: 'TK-20260529-205', itemId: 'PI-006', itemName: 'UPS 运行状态' }
];

const STATUS_ORDER = { '已超时': 0, '待完成': 1, '已完成': 2 };
const ISSUE_STATUS_ORDER = { '待整改': 0, '待复检': 1, '已完成': 2 };

function taskScheduledDate(task) {
  return (task.scheduled || '').slice(0, 10);
}

function isTodayTask(task) {
  return taskScheduledDate(task) === MOCK_TODAY;
}

function matchTaskFilter(task, filter) {
  if (filter === 'today') return isTodayTask(task);
  if (filter === 'pending') return task.status === '待完成';
  if (filter === 'done') return task.status === '已完成';
  if (filter === 'overdue') return task.status === '已超时';
  return true;
}

/** 组织权限内：自己创建，或处理人属于自己所在组织（可访问用户集） */
function isIssueInOrgScope(issue, accessibleIds, userId) {
  issue = patrolIssueCreator.syncCreatorUserId(issue || {}, getTaskExecutorId);
  const creatorId = patrolIssueCreator.resolveCreatorUserId(issue, getTaskExecutorId);
  if (userId && creatorId === userId) return true;
  return !!(issue.handlerId && accessibleIds.indexOf(issue.handlerId) >= 0);
}

function isIssueMine(issue, userId) {
  issue = patrolIssueCreator.syncCreatorUserId(issue || {}, getTaskExecutorId);
  return patrolIssueCreator.resolveCreatorUserId(issue, getTaskExecutorId) === userId ||
    issue.handlerId === userId;
}

function sortTasks(list) {
  return list.slice().sort(function (a, b) {
    const sa = STATUS_ORDER[a.status] != null ? STATUS_ORDER[a.status] : 9;
    const sb = STATUS_ORDER[b.status] != null ? STATUS_ORDER[b.status] : 9;
    if (sa !== sb) return sa - sb;
    return (a.scheduled || '').localeCompare(b.scheduled || '');
  });
}

function sortIssues(list, options) {
  options = options || {};
  if (options.byActivityOnly) {
    return list.slice().sort(function (a, b) {
      return issueActivityTime(b).localeCompare(issueActivityTime(a));
    });
  }
  return list.slice().sort(function (a, b) {
    const sa = ISSUE_STATUS_ORDER[a.status] != null ? ISSUE_STATUS_ORDER[a.status] : 9;
    const sb = ISSUE_STATUS_ORDER[b.status] != null ? ISSUE_STATUS_ORDER[b.status] : 9;
    if (sa !== sb) return sa - sb;
    return issueActivityTime(b).localeCompare(issueActivityTime(a));
  });
}

/** 问题列表排序用：取最近一次操作时间（创建 / 整改 / 复检） */
function issueActivityTime(issue) {
  issue = issue || {};
  const candidates = [
    issue.updatedAt,
    issue.reinspectAt,
    issue.rectifyAt,
    issue.createdAt
  ].filter(Boolean);
  if (!candidates.length) return '';
  return candidates.slice().sort().reverse()[0];
}

function touchIssueUpdatedAt(raw) {
  if (raw) raw.updatedAt = formatNowStr();
}

function statusTagClass(status) {
  if (status === '已完成') return 'tag-success';
  if (status === '已超时') return 'tag-danger';
  return 'tag-info';
}

function issueStatusTagClass(status) {
  if (status === '已完成') return 'tag-success';
  if (status === '待复检') return 'tag-info';
  return 'tag-warning';
}

/** 未完成任务 + 巡检任务 edit 权限 → 可催办/转派（对齐 PC） */
function canManageUnfinishedTask(task, currentUser) {
  if (!task || !currentUser) return false;
  if (task.status === '已完成') return false;
  if (!pagePerm.canPageAction(currentUser.role, 'patrol-task', 'edit')) return false;
  return isTaskInOrgScope(task, currentUser);
}

function enrichTask(task, currentUser) {
  syncTaskProgressFromStore(task.taskId);
  const fresh = ALL_TASKS.find(function (t) { return t.taskId === task.taskId; }) || task;
  const executorIds = normalizeTaskExecutorIds(fresh);
  const canManage = canManageUnfinishedTask(fresh, currentUser);
  return Object.assign({}, fresh, {
    executorIds: executorIds,
    executorId: executorIds[0] || fresh.executorId || '',
    executorName: formatTaskExecutorNames(executorIds),
    statusClass: statusTagClass(fresh.status),
    isMine: false,
    canUrge: canManage,
    canReassign: canManage,
    hasManageActions: canManage
  });
}

function urgeTask(taskId, currentUser) {
  applyPendingTaskPatches();
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task) return { ok: false, message: '任务不存在' };
  syncTaskProgressFromStore(taskId);
  if (!canManageUnfinishedTask(task, currentUser)) {
    return { ok: false, message: task.status === '已完成' ? '已完成任务无需催办' : '当前账号无催办权限' };
  }
  const executorIds = getTaskExecutorIds(task);
  if (!executorIds.length) return { ok: false, message: '任务无执行人，无法催办' };
  messageStore.pushTaskUrge({
    taskId: task.taskId,
    planName: task.planName,
    objectName: task.objectName,
    scheduled: task.scheduled,
    status: task.status,
    executorIds: executorIds,
    executorId: executorIds[0]
  }, currentUser);
  const tip = executorIds.length > 1
    ? ('已向 ' + executorIds.length + ' 位执行人发送催办')
    : '催办已发送';
  return { ok: true, message: tip };
}

function listReassignCandidates(taskId, currentUser) {
  applyPendingTaskPatches();
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task) return { ok: false, message: '任务不存在', list: [] };
  if (!canManageUnfinishedTask(task, currentUser)) {
    return {
      ok: false,
      message: task.status === '已完成' ? '已完成任务不可转派' : '当前账号无转派权限',
      list: []
    };
  }
  const currentIds = getTaskExecutorIds(task);
  const list = dataScope.getAccessibleUserIds(currentUser).map(function (id) {
    const u = dataScope.getUserProfile(id);
    return {
      id: id,
      name: (u && u.name) || id,
      label: dataScope.formatUserDisplay(id),
      dept: (u && u.dept) || '',
      role: (u && u.role) || ''
    };
  });
  return {
    ok: true,
    list: list,
    currentExecutorIds: currentIds,
    currentExecutorName: formatTaskExecutorNames(currentIds),
    progress: task.progress || { done: 0, total: 0 },
    planName: task.planName,
    taskId: task.taskId,
    reassignedFrom: task.reassignedFrom || []
  };
}

function reassignTask(taskId, newExecutorId, currentUser) {
  applyPendingTaskPatches();
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task) return { ok: false, message: '任务不存在' };
  syncTaskProgressFromStore(taskId);
  if (!canManageUnfinishedTask(task, currentUser)) {
    return { ok: false, message: task.status === '已完成' ? '已完成任务不可转派' : '当前账号无转派权限' };
  }
  const newId = String(newExecutorId || '').trim();
  if (!newId) return { ok: false, message: '请选择新执行人' };
  const prev = getTaskExecutorIds(task);
  if (prev.length === 1 && prev[0] === newId) {
    return { ok: false, message: '新执行人不能与当前执行人相同' };
  }
  if (!dataScope.canAccessUserData(currentUser, newId)) {
    return { ok: false, message: '所选执行人不在可访问组织范围' };
  }
  const user = dataScope.getUserProfile(newId);
  if (!user) return { ok: false, message: '所选执行人不存在，请重新选择' };
  const at = formatNowStr();
  enqueueTaskReassignPatch({
    type: 'task_reassign',
    taskId: taskId,
    executorId: newId,
    executorIds: [newId],
    reassignedFrom: prev,
    at: at
  });
  messageStore.pushTaskReassign({
    taskId: task.taskId,
    planName: task.planName,
    objectName: task.objectName,
    scheduled: task.scheduled,
    newExecutorId: newId,
    executorId: newId,
    prevExecutorIds: prev
  }, currentUser);
  return {
    ok: true,
    message: '已转派给 ' + dataScope.formatExecutorDisplay(newId) + '，原执行进度已保留',
    executorId: newId,
    executorName: dataScope.formatExecutorDisplay(newId)
  };
}

function parsePatrolDateTime(str) {
  if (!str) return null;
  const d = new Date(String(str).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function parseRemindBeforeMs(text) {
  const t = String(text || '').trim();
  if (!t || t === '不提醒') return null;
  if (t.indexOf('1 小时') >= 0 || t.indexOf('1小时') >= 0) return 60 * 60 * 1000;
  if (t.indexOf('30 分钟') >= 0 || t.indexOf('30分钟') >= 0) return 30 * 60 * 1000;
  if (t.indexOf('15 分钟') >= 0 || t.indexOf('15分钟') >= 0) return 15 * 60 * 1000;
  return 30 * 60 * 1000;
}

function parseOverdueDelayMs(text) {
  const t = String(text || '').trim();
  if (!t || t === '不提醒') return null;
  if (t.indexOf('1 小时') >= 0 || t.indexOf('1小时') >= 0) return 60 * 60 * 1000;
  if (t.indexOf('30 分钟') >= 0 || t.indexOf('30分钟') >= 0) return 30 * 60 * 1000;
  return 30 * 60 * 1000;
}

/** 与 PC 规则参数对齐（可读 PC 桥接 / 本地缓存 / 默认 JSON） */
function getPatrolRuleDefaults() {
  try {
    const remoteRules = require('../utils/patrol-remote-rules');
    return remoteRules.getPatrolRuleParams();
  } catch (e) {
    return {
      replayDuration: '60 秒',
      snapshotRetainDays: '30',
      taskRemind: '30 分钟前',
      overdueRemind: '超时 30 分钟',
      missAlarm: '推送至执行人+主管'
    };
  }
}

function isScheduledDateBeforeToday(scheduled) {
  const d = parsePatrolDateTime(scheduled);
  if (!d) return false;
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  const startToday = new Date(y, m, day).getTime();
  const schedDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return schedDay < startToday;
}

function syncTaskProgressFromStore(taskId) {
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task) return null;
  const subtasks = taskStore.getSubtasks(taskId);
  if (!subtasks.length) return task;
  const progress = taskStore.computeTaskProgress(subtasks);
  task.progress = progress;
  if (progress.total > 0 && progress.done >= progress.total) {
    if (task.status !== '已完成') {
      task.status = '已完成';
      const times = subtasks.map(function (s) { return s.completedAt || ''; }).filter(Boolean).sort();
      if (times.length) task.completedAt = times[times.length - 1];
    }
    return task;
  }
  // 未完成：按计划日 / 超时规则动态标为已超时（对齐 PC computePatrolTaskAggregate）
  if (task.status !== '已完成') {
    const rules = getPatrolRuleDefaults();
    const delayMs = parseOverdueDelayMs(rules.overdueRemind);
    const scheduledAt = parsePatrolDateTime(task.scheduled);
    const now = Date.now();
    let overdue = isScheduledDateBeforeToday(task.scheduled);
    if (!overdue && scheduledAt && delayMs != null) {
      overdue = now >= (scheduledAt.getTime() + delayMs);
    }
    if (overdue) task.status = '已超时';
    else if (task.status === '已超时') task.status = '待完成';
  }
  return task;
}

var TASK_PATCH_STORAGE_KEY = 'patrol_wxapp_task_patches_v1';

function mergeTaskPatchLists(a, b) {
  const map = {};
  const out = [];
  function push(p) {
    if (!p || !p.taskId) return;
    const key = (p.type || 'task_reassign') + ':' + p.taskId;
    if (map[key] != null) {
      out[map[key]] = p;
      return;
    }
    map[key] = out.length;
    out.push(p);
  }
  (a || []).forEach(push);
  (b || []).forEach(push);
  return out;
}

function loadBundledTaskPatches() {
  try {
    const bundled = require('./patrol-task-patches.json');
    if (Array.isArray(bundled)) return bundled;
  } catch (e) { /* ignore */ }
  return [];
}

function loadTaskPatches() {
  var fromStorage = [];
  try {
    var raw = wx.getStorageSync(TASK_PATCH_STORAGE_KEY);
    if (raw && typeof raw === 'string') raw = JSON.parse(raw);
    if (Array.isArray(raw)) fromStorage = raw;
  } catch (e) { /* ignore */ }
  // H5 / 同源容器：可读 PC 页写入的 localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      var pcRaw = localStorage.getItem(TASK_PATCH_STORAGE_KEY);
      if (pcRaw) {
        var pcList = JSON.parse(pcRaw);
        if (Array.isArray(pcList)) fromStorage = mergeTaskPatchLists(fromStorage, pcList);
      }
    }
  } catch (e2) { /* ignore */ }
  return mergeTaskPatchLists(loadBundledTaskPatches(), fromStorage);
}

function saveTaskPatches(list) {
  try {
    wx.setStorageSync(TASK_PATCH_STORAGE_KEY, list || []);
  } catch (e) { /* ignore */ }
}

function applyTaskReassignPatch(taskId, executorId, options) {
  options = options || {};
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task || !executorId) return false;
  const prev = getTaskExecutorIds(task);
  task.executorId = executorId;
  task.executorIds = [executorId];
  if (prev.length) task.reassignedFrom = prev;
  if (options.at) task.reassignedAt = options.at;
  return true;
}

function applyPendingTaskPatches() {
  const patches = loadTaskPatches();
  if (!patches.length) return;
  patches.forEach(function (patch) {
    if (!patch || patch.type !== 'task_reassign' || !patch.taskId) return;
    applyTaskReassignPatch(patch.taskId, patch.executorId || (patch.executorIds && patch.executorIds[0]), {
      at: patch.at
    });
  });
}

function enqueueTaskReassignPatch(patch) {
  if (!patch || !patch.taskId) return;
  const list = loadTaskPatches().filter(function (p) {
    return !(p && p.taskId === patch.taskId && p.type === 'task_reassign');
  });
  list.push(Object.assign({ type: 'task_reassign' }, patch));
  saveTaskPatches(list);
  applyTaskReassignPatch(patch.taskId, patch.executorId || (patch.executorIds && patch.executorIds[0]), {
    at: patch.at
  });
}

/** 一律规范化为 executorIds 数组，并回写任务对象 */
function normalizeTaskExecutorIds(task) {
  if (!task) return [];
  const ids = getTaskExecutorIds(task);
  task.executorIds = ids;
  if (ids.length) task.executorId = ids[0];
  return ids;
}

function getTaskExecutorIds(task) {
  if (!task) return [];
  if (Array.isArray(task.executorIds) && task.executorIds.length) {
    const seen = {};
    return task.executorIds.map(function (id) { return String(id || '').trim(); }).filter(function (id) {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }
  if (task.executorId) return [String(task.executorId).trim()];
  return [];
}

function formatTaskExecutorNames(ids) {
  const list = getTaskExecutorIds({ executorIds: ids });
  if (!list.length) return '—';
  return list.map(function (id) { return dataScope.formatExecutorDisplay(id); }).join('、');
}

function isTaskMine(task, userId) {
  return !!(userId && getTaskExecutorIds(task).indexOf(userId) >= 0);
}

function resolveIssueFlowLogs(raw, extras) {
  extras = extras || {};
  const rawLogs = Array.isArray(raw.flowLogs) ? raw.flowLogs : [];
  const extraLogs = Array.isArray(extras.flowLogs) ? extras.flowLogs : [];
  if (rawLogs.length >= extraLogs.length && rawLogs.length) return rawLogs;
  if (extraLogs.length) return extraLogs;
  return rawLogs;
}

function syncIssueFlowLogs(raw) {
  if (!raw || !raw.issueNo) return;
  const logs = Array.isArray(raw.flowLogs) ? raw.flowLogs : [];
  if (!ISSUE_EXTRAS[raw.issueNo]) ISSUE_EXTRAS[raw.issueNo] = {};
  ISSUE_EXTRAS[raw.issueNo].flowLogs = logs;
  raw.flowLogs = logs;
}

function normalizeIssueRaw(raw) {
  raw = raw || {};
  const extras = ISSUE_EXTRAS[raw.issueNo] || {};
  const task = raw.taskId
    ? ALL_TASKS.find(function (t) { return t.taskId === raw.taskId; })
    : null;
  const objectName = raw.objectName || (task && task.objectName) || extras.objectName || '';
  const objectId = raw.objectId || extras.objectId || OBJECT_NAME_TO_ID[objectName] || '';
  const taskPlanName = raw.taskPlanName || extras.taskPlanName || (task && task.planName) || '';
  const flowLogs = resolveIssueFlowLogs(raw, extras);
  return Object.assign({}, raw, extras, {
    objectName: objectName,
    objectId: objectId,
    taskPlanName: taskPlanName,
    flowLogs: flowLogs
  });
}

function appendReinspectLogForRaw(raw) {
  const creatorName = patrolIssueCreator.formatCreatorName(
    raw,
    dataScope.formatUserDisplay.bind(dataScope),
    getTaskExecutorId
  );
  patrolIssueFlowLog.appendReinspectLog(raw, creatorName);
  syncIssueFlowLogs(raw);
}

function findIssueRaw(issueNo) {
  return ALL_ISSUES.find(function (i) { return i.issueNo === issueNo; }) || null;
}

function isAutoReinspectIssue(raw) {
  return patrolIssueAction.resolveCheckMethod(raw) === '自动';
}

function autoReinspectShouldPass(raw) {
  const extras = ISSUE_EXTRAS[raw.issueNo] || {};
  if (extras.autoReinspectPass === false || extras.autoReinspectFail) return false;
  return true;
}

function applyAutoIssueReinspect(raw, pass) {
  const patrolIssueReinspect = require('../utils/patrol-issue-reinspect');
  const issue = normalizeIssueRaw(raw);
  const autoResult = patrolIssueReinspect.buildAutoReinspectResult(issue, pass);
  raw.reinspectResult = autoResult.result;
  raw.reinspectRemark = autoResult.remark;
  raw.reinspectAt = formatNowStr();
  raw.reinspectBy = '系统';
  raw.reinspectAi = {
    model: autoResult.model,
    channels: autoResult.channels,
    conclusion: autoResult.conclusion,
    confidence: autoResult.confidence,
    detail: autoResult.detail
  };
  raw.status = pass ? '已完成' : '待整改';
  appendReinspectLogForRaw(raw);
  if (!pass) {
    raw.rectifyDesc = '';
    raw.rectifyAt = '';
    raw.rectifyBy = '';
    raw.rectifyFiles = [];
    raw.reinspectCheckins = {};
  }
  touchIssueUpdatedAt(raw);
  return raw.status;
}

/** 自动巡检问题进入待复检后由系统自动分析，无需创建人手动复检 */
function maybeAutoReinspectPending(raw) {
  if (!raw || raw.status !== '待复检' || !isAutoReinspectIssue(raw)) return null;
  return applyAutoIssueReinspect(raw, autoReinspectShouldPass(raw));
}

function processAllPendingAutoReinspects() {
  ALL_ISSUES.forEach(function (raw) {
    maybeAutoReinspectPending(raw);
  });
}

function formatNowStr() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function objectNameForId(objectId) {
  if (!objectId) return '';
  const keys = Object.keys(OBJECT_NAME_TO_ID);
  for (let i = 0; i < keys.length; i++) {
    if (OBJECT_NAME_TO_ID[keys[i]] === objectId) return keys[i];
  }
  return '';
}

function isIssueEditableRaw(raw) {
  return patrolIssueAction.isIssueEditable(raw);
}

function generateIssueNo() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  const date = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return 'IS-' + date + '-' + seq;
}

/** 巡检异常同步写入问题列表（对齐 PC createPatrolIssueFromSubtask） */
function createIssuesFromAbnormalSubtask(taskId, subtask, currentUser, options) {
  options = options || {};
  if (!subtask || !taskId) return [];
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; }) || {};
  const sourceMap = { '远程': '远程巡检', '自动': '自动巡检', '现场': '现场巡检' };
  const source = sourceMap[subtask.method] || '巡检';
  const creatorId = (currentUser && currentUser.id) ||
    subtask.completedById ||
    ((Array.isArray(subtask.completedByIds) && subtask.completedByIds[0]) || '') ||
    '';
  const handlerId = subtask.issueHandlerId || creatorId || 'lisi';
  const pointPrefix = options.pointName
    ? (options.pointName + '：')
    : (options.pointId ? (options.pointId + '：') : '');
  let issueList = [];
  if (options.pointId && subtask.guardPointResults && subtask.guardPointResults[options.pointId]) {
    const pr = subtask.guardPointResults[options.pointId];
    if (pr.result === '异常') {
      issueList = Array.isArray(pr.issues) && pr.issues.length
        ? pr.issues
        : [{ desc: pr.issueDesc || ((subtask.itemName || '') + ' 巡检异常') }];
    }
  } else if (subtask.result === '异常') {
    issueList = Array.isArray(subtask.issues) && subtask.issues.length
      ? subtask.issues
      : [{ desc: subtask.issueDesc || ((subtask.itemName || '') + ' 巡检异常') }];
  }
  const created = [];
  issueList.forEach(function (iss) {
    const desc = pointPrefix + (iss.desc || (iss.issueDescVoice && iss.issueDescVoice.transcript) || '');
    if (!desc.trim() && !(iss.issueDescVoice)) return;
    const title = desc.trim() || ((subtask.itemName || '') + ' 巡检异常');
    if (iss.issueNo && ALL_ISSUES.some(function (i) { return i.issueNo === iss.issueNo; })) {
      created.push(iss.issueNo);
      return;
    }
    const issueNo = iss.issueNo || generateIssueNo();
    iss.issueNo = issueNo;
    const raw = {
      issueNo: issueNo,
      title: title,
      status: '待整改',
      source: source,
      creatorId: creatorId,
      handlerId: handlerId,
      createdAt: formatNowStr(),
      taskId: taskId,
      objectName: task.objectName || '',
      itemId: subtask.itemId || '',
      itemName: subtask.itemName || '',
      method: subtask.method || '',
      editable: false
    };
    ALL_ISSUES.unshift(raw);
    ISSUE_EXTRAS[issueNo] = Object.assign({}, ISSUE_EXTRAS[issueNo] || {}, {
      objectId: OBJECT_NAME_TO_ID[raw.objectName] || '',
      taskPlanName: task.planName || '',
      source: source,
      issues: [{
        issueNo: issueNo,
        desc: title,
        images: iss.images || [],
        attachments: iss.attachments || []
      }]
    });
    created.push(issueNo);
  });
  return created;
}

function applyIssueReportPayload(raw, payload) {
  payload = payload || {};
  raw.title = payload.desc || raw.title;
  raw.handlerId = payload.handlerId || raw.handlerId;
  raw.objectId = payload.objectId || raw.objectId;
  raw.objectName = objectNameForId(raw.objectId) || raw.objectName;
  raw.itemId = payload.itemId || raw.itemId;
  raw.itemName = payload.itemName || raw.itemName;
  const spec = taskStore.getItemSpec(raw.itemId);
  if (spec && spec.method) raw.method = spec.method;
  const extras = ISSUE_EXTRAS[raw.issueNo] || {};
  ISSUE_EXTRAS[raw.issueNo] = Object.assign({}, extras, {
    objectId: raw.objectId,
    source: '临时上报',
    issues: [{
      issueNo: raw.issueNo,
      desc: payload.desc || '',
      images: payload.images || [],
      attachments: payload.attachments || []
    }]
  });
  touchIssueUpdatedAt(raw);
}

function submitIssueReport(payload, currentUser) {
  const userId = currentUser && currentUser.id;
  if (!userId) return { ok: false, message: '未登录' };
  payload = payload || {};
  const desc = (payload.desc || '').trim();
  if (!payload.objectId) return { ok: false, message: '请选择关联巡检对象' };
  if (!payload.itemId) return { ok: false, message: '请选择关联巡检项' };
  if (!payload.handlerId) return { ok: false, message: '请选择问题处理人' };
  if (!desc) return { ok: false, message: '请填写问题描述' };
  const issueNo = generateIssueNo();
  const raw = {
    issueNo: issueNo,
    title: desc,
    status: '待整改',
    source: '临时上报',
    creatorId: userId,
    handlerId: payload.handlerId,
    createdAt: formatNowStr(),
    objectName: objectNameForId(payload.objectId),
    itemId: payload.itemId,
    itemName: payload.itemName || '',
    editable: true
  };
  applyIssueReportPayload(raw, payload);
  ALL_ISSUES.unshift(raw);
  return { ok: true, issueNo: issueNo };
}

function updateIssueReport(issueNo, payload, currentUser) {
  const raw = findIssueRaw(issueNo);
  const userId = currentUser && currentUser.id;
  if (!raw) return { ok: false, message: '未找到问题' };
  if (!isIssueEditableRaw(raw)) return { ok: false, message: '整改流程已开始，不可再编辑' };
  if (raw.creatorId !== userId) return { ok: false, message: '仅问题创建人可编辑' };
  if (raw.status !== '待整改') return { ok: false, message: '仅初始待整改状态可编辑' };
  payload = payload || {};
  if (!(payload.desc || '').trim()) return { ok: false, message: '请填写问题描述' };
  applyIssueReportPayload(raw, payload);
  return { ok: true, issueNo: issueNo };
}

function submitIssueRectify(issueNo, payload, currentUser) {
  const raw = findIssueRaw(issueNo);
  const userId = currentUser && currentUser.id;
  if (!raw) return { ok: false, message: '未找到问题' };
  if (raw.handlerId !== userId) return { ok: false, message: '仅问题处理人可执行整改' };
  if (raw.status !== '待整改') return { ok: false, message: '当前状态不可整改' };
  const desc = (payload && payload.rectifyDesc || '').trim();
  if (!desc) return { ok: false, message: '请填写整改说明' };
  raw.rectifyDesc = desc;
  raw.rectifyAt = formatNowStr();
  raw.rectifyBy = dataScope.formatUserDisplay(userId);
  raw.rectifyFiles = (payload && payload.files) || [];
  raw.reinspectCheckins = {};
  if (raw.source === '临时上报') raw.editable = false;
  patrolIssueFlowLog.appendRectifyLog(raw);
  syncIssueFlowLogs(raw);
  touchIssueUpdatedAt(raw);
  raw.status = '待复检';
  if (isAutoReinspectIssue(raw)) {
    const pass = autoReinspectShouldPass(raw);
    const status = applyAutoIssueReinspect(raw, pass);
    return {
      ok: true,
      issueNo: issueNo,
      status: status,
      autoReinspected: true,
      autoReinspectPass: pass
    };
  }
  return { ok: true, issueNo: issueNo, status: raw.status };
}

function submitIssueReinspectCheckin(issueNo, pointId, currentUser) {
  const raw = findIssueRaw(issueNo);
  const userId = currentUser && currentUser.id;
  if (!raw) return { ok: false, message: '未找到问题' };
  if (raw.creatorId !== userId) return { ok: false, message: '仅问题创建人可执行复检' };
  if (raw.status !== '待复检') return { ok: false, message: '当前状态不可复检' };
  if (!pointId) return { ok: false, message: '缺少巡更点编号' };
  raw.reinspectCheckins = raw.reinspectCheckins || {};
  raw.reinspectCheckins[pointId] = formatNowStr();
  return { ok: true, checkins: Object.assign({}, raw.reinspectCheckins) };
}

function submitIssueReinspect(issueNo, payload, currentUser) {
  const raw = findIssueRaw(issueNo);
  const userId = currentUser && currentUser.id;
  if (!raw) return { ok: false, message: '未找到问题' };
  patrolIssueCreator.syncCreatorUserId(raw, getTaskExecutorId);
  payload = payload || {};
  const method = payload.method || patrolIssueAction.resolveCheckMethod(raw);
  if (method !== '自动' && raw.creatorId !== userId) {
    return { ok: false, message: '仅问题创建人可执行复检' };
  }
  if (raw.status !== '待复检') return { ok: false, message: '当前状态不可复检' };
  const issue = normalizeIssueRaw(raw);

  if (method === '自动') {
    const pass = (payload.result || '合格') === '合格';
    applyAutoIssueReinspect(raw, pass);
    return { ok: true, issueNo: issueNo, status: raw.status };
  }

  if (method === '现场') {
    const patrolIssueReinspect = require('../utils/patrol-issue-reinspect');
    const pointIds = patrolIssueReinspect.getGuardPointIds(issue);
    const checkins = raw.reinspectCheckins || {};
    const isTempReport = raw.source === '临时上报';
    if (!isTempReport) {
      const allDone = pointIds.length && pointIds.every(function (id) { return !!checkins[id]; });
      if (!allDone) return { ok: false, message: '请先完成关联巡更点线下打卡' };
    }
    const result = (payload.result || '').trim();
    if (!result) return { ok: false, message: '请选择复检结果' };
    raw.reinspectResult = result;
    raw.reinspectRemark = (payload.remark || '').trim();
    raw.reinspectAt = formatNowStr();
    raw.reinspectBy = dataScope.formatUserDisplay(userId);
    raw.reinspectFiles = payload.files || [];
    raw.status = result === '合格' ? '已完成' : '待整改';
    appendReinspectLogForRaw(raw);
    if (result !== '合格') {
      raw.rectifyDesc = '';
      raw.rectifyAt = '';
      raw.rectifyBy = '';
      raw.rectifyFiles = [];
    }
    touchIssueUpdatedAt(raw);
    return { ok: true, issueNo: issueNo, status: raw.status };
  }

  const result = (payload.result || '').trim();
  if (!result) return { ok: false, message: '请选择复检结果' };
  raw.reinspectResult = result;
  raw.reinspectRemark = (payload.remark || '').trim();
  raw.reinspectAt = formatNowStr();
  raw.reinspectBy = dataScope.formatUserDisplay(userId);
  raw.reinspectFiles = payload.files || [];
  raw.status = result === '合格' ? '已完成' : '待整改';
  appendReinspectLogForRaw(raw);
  if (result !== '合格') {
    raw.rectifyDesc = '';
    raw.rectifyAt = '';
    raw.rectifyBy = '';
    raw.rectifyFiles = [];
  }
  touchIssueUpdatedAt(raw);
  return { ok: true, issueNo: issueNo, status: raw.status };
}

function getTaskExecutorId(taskId) {
  if (!taskId) return '';
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  return getTaskExecutorIds(task)[0] || '';
}

function enrichIssue(issue, userId) {
  const normalized = normalizeIssueRaw(issue);
  patrolIssueCreator.syncCreatorUserId(normalized, getTaskExecutorId);
  const view = patrolIssueFormat.enrichIssueView(
    normalized,
    dataScope.formatUserDisplay,
    getTaskExecutorId
  );
  view.isMine = isIssueMine(normalized, userId);
  return patrolIssueAction.attachIssueActions(view, userId);
}

/** 组织任务：任一执行人属于自己所在组织（角色/用户组组织数据权限） */
function isTaskInOrgScope(task, currentUser) {
  const ids = getTaskExecutorIds(task);
  if (!task || !ids.length) return false;
  const scope = dataScope.resolveDataScope(currentUser);
  if (scope.all) return true;
  return ids.some(function (executorId) {
    const executor = dataScope.getUserProfile(executorId);
    if (!executor) return false;
    return dataScope.isOrgInScope(executor.orgId, scope);
  });
}

function filterTasksByDataScope(currentUser, query) {
  applyPendingTaskPatches();
  ALL_TASKS.forEach(normalizeTaskExecutorIds);
  // 先按进度/超时规则刷新状态，再筛选（避免种子「待完成」已被刷成「已超时」仍进待完成 tab）
  ALL_TASKS.forEach(function (t) { syncTaskProgressFromStore(t.taskId); });
  query = query || {};
  const scope = query.scope || 'org';
  const filter = query.filter || 'all';
  const userId = currentUser && currentUser.id;

  let list;
  if (scope === 'mine' && userId) {
    list = ALL_TASKS.filter(function (t) { return isTaskMine(t, userId); });
  } else {
    list = ALL_TASKS.filter(function (t) { return isTaskInOrgScope(t, currentUser); });
  }
  list = list.filter(function (t) { return matchTaskFilter(t, filter); });
  list = list.filter(function (t) {
    return patrolTaskQuery.matchAdvancedQuery(t, {
      executor: query.executor,
      method: query.method,
      status: query.status,
      keyword: query.keyword || ''
    });
  });
  return sortTasks(list).map(function (task) {
    const item = enrichTask(task, currentUser);
    item.isMine = isTaskMine(task, userId);
    return item;
  });
}

function getTaskMeta(taskId) {
  if (!taskId) return null;
  const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
  if (!task) return null;
  return {
    planName: task.planName,
    objectName: task.objectName || ''
  };
}

function filterIssuesByDataScope(currentUser, query) {
  processAllPendingAutoReinspects();
  query = query || {};
  const tab = query.tab || 'all';
  const scope = query.scope || 'org';
  const accessibleIds = dataScope.getAccessibleUserIds(currentUser);
  const userId = currentUser && currentUser.id;
  const statusViaTab = tab === 'rectify' || tab === 'reinspect' || tab === 'done';
  const effectiveStatus = statusViaTab ? patrolIssueQuery.statusFromTab(tab) : (query.status || '');

  let list = ALL_ISSUES.filter(function (issue) {
    return isIssueInOrgScope(issue, accessibleIds, userId);
  });
  if (scope === 'mine' && userId) {
    list = list.filter(function (issue) { return isIssueMine(issue, userId); });
  }
  list = list.filter(function (issue) {
    const taskMeta = getTaskMeta(issue.taskId);
    return patrolIssueQuery.matchAdvancedQuery(issue, {
      status: effectiveStatus,
      source: query.source || '',
      keyword: query.keyword || ''
    }, taskMeta);
  });
  return sortIssues(list, { byActivityOnly: !!effectiveStatus }).map(function (issue) {
    return enrichIssue(issue, userId);
  });
}

module.exports = {
  MOCK_TODAY,

  getTaskExecutorId: getTaskExecutorId,

  workbenchStats(currentUser) {
    applyPendingTaskPatches();
    const userId = currentUser && currentUser.id;
    ALL_TASKS.forEach(function (t) { syncTaskProgressFromStore(t.taskId); });
    const mine = ALL_TASKS.filter(function (t) { return isTaskMine(t, userId); });
    const myIssues = ALL_ISSUES.filter(function (i) { return isIssueMine(i, userId); });
    // 待办仅统计「待我处理」：我执行的未完成任务 / 我整改 / 我复检
    const mineOpen = mine.filter(function (t) {
      return t.status === '待完成' || t.status === '已超时';
    });
    return {
      todayTasks: mineOpen.filter(isTodayTask).length,
      pendingTasks: mine.filter(function (t) { return t.status === '待完成'; }).length,
      overdueTasks: mine.filter(function (t) { return t.status === '已超时'; }).length,
      pendingRectify: myIssues.filter(function (i) { return i.status === '待整改' && i.handlerId === userId; }).length,
      pendingReinspect: myIssues.filter(function (i) {
        return i.status === '待复检' &&
          patrolIssueCreator.resolveCreatorUserId(i, getTaskExecutorId) === userId;
      }).length
    };
  },

  tasks(currentUser, query) {
    const list = filterTasksByDataScope(currentUser, query);
    return { list: list, total: list.length };
  },

  issues(currentUser, query) {
    const list = filterIssuesByDataScope(currentUser, query);
    return { list: list, total: list.length };
  },

  issueDetail(issueNo, currentUser) {
    const raw = findIssueRaw(issueNo);
    if (!raw) return null;
    maybeAutoReinspectPending(raw);
    const userId = currentUser && currentUser.id;
    return enrichIssue(raw, userId);
  },

  submitIssueRectify(issueNo, payload, currentUser) {
    return submitIssueRectify(issueNo, payload, currentUser);
  },

  submitIssueReinspectCheckin(issueNo, pointId, currentUser) {
    return submitIssueReinspectCheckin(issueNo, pointId, currentUser);
  },

  submitIssueReinspect(issueNo, payload, currentUser) {
    return submitIssueReinspect(issueNo, payload, currentUser);
  },

  submitIssueReport(payload, currentUser) {
    return submitIssueReport(payload, currentUser);
  },

  updateIssueReport(issueNo, payload, currentUser) {
    return updateIssueReport(issueNo, payload, currentUser);
  },

  taskDetail(taskId, currentUser) {
    applyPendingTaskPatches();
    const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
    if (!task) return null;
    syncTaskProgressFromStore(taskId);
    const userId = currentUser && currentUser.id;
    const isMine = isTaskMine(task, userId);
    const canManage = canManageUnfinishedTask(task, currentUser);
    const subtasks = taskStore.getSubtasks(taskId).map(function (sub) {
      return Object.assign({}, sub, {
        statusClass: patrolFormat.statusTagClass(sub.status),
        methodClass: patrolFormat.methodTagClass(sub.method),
        action: patrolFormat.getSubtaskAction(sub, { isExecutor: isMine })
      });
    });
    const progress = taskStore.computeTaskProgress(subtasks);
    task.progress = progress;
    const executorIds = getTaskExecutorIds(task);
    return {
      taskId: task.taskId,
      planCode: task.planCode,
      planName: task.planName,
      objectName: task.objectName,
      scheduled: task.scheduled,
      completedAt: task.completedAt || '',
      status: task.status,
      statusClass: patrolFormat.statusTagClass(task.status),
      executorId: task.executorId,
      executorIds: executorIds,
      executorName: formatTaskExecutorNames(executorIds),
      isMine: isMine,
      canUrge: canManage,
      canReassign: canManage,
      hasManageActions: canManage,
      progress: progress,
      subtasks: subtasks
    };
  },

  urgeTask(taskId, currentUser) {
    return urgeTask(taskId, currentUser);
  },

  listReassignCandidates(taskId, currentUser) {
    return listReassignCandidates(taskId, currentUser);
  },

  reassignTask(taskId, newExecutorId, currentUser) {
    return reassignTask(taskId, newExecutorId, currentUser);
  },

  isTaskExecutor(taskId, userId) {
    const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
    return isTaskMine(task, userId);
  },

  guardPoints(ids) {
    return taskStore.guardPoints(ids);
  },

  submitGuardCheckin(taskId, subtaskCode, payload, currentUser) {
    const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
    if (currentUser && !isTaskMine(task, currentUser.id)) {
      return Promise.reject(new Error('仅任务执行人可执行巡检'));
    }
    const res = taskStore.submitGuardCheckin(taskId, subtaskCode, payload, currentUser);
    syncTaskProgressFromStore(taskId);
    if (res && res.ok && payload && payload.result === '异常' && res.subtask) {
      createIssuesFromAbnormalSubtask(taskId, res.subtask, currentUser, {
        pointId: payload.pointId,
        pointName: payload.pointName || ''
      });
    }
    return res;
  },

  submitRemoteResult(taskId, subtaskCode, payload, currentUser) {
    const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
    if (currentUser && !isTaskMine(task, currentUser.id)) {
      return Promise.reject(new Error('仅任务执行人可执行巡检'));
    }
    const res = taskStore.submitRemoteResult(taskId, subtaskCode, payload, currentUser);
    syncTaskProgressFromStore(taskId);
    if (res && res.ok && payload && payload.result === '异常' && res.subtask) {
      createIssuesFromAbnormalSubtask(taskId, res.subtask, currentUser, {});
    }
    return res;
  },

  getSubtask(taskId, subtaskCode) {
    const sub = taskStore.findSubtask(taskId, subtaskCode);
    if (!sub) return null;
    return Object.assign({}, sub, {
      statusClass: patrolFormat.statusTagClass(sub.status),
      methodClass: patrolFormat.methodTagClass(sub.method),
      devices: taskStore.resolveDevices(sub.videoDevices || [])
    });
  },

  runAutoSubtask(taskId, subtaskCode, currentUser, options) {
    options = options || {};
    const uid = currentUser && currentUser.id;
    const asSystem = options.system === true || uid === 'system';
    if (!asSystem) {
      return Promise.reject(new Error('自动巡检仅由系统执行'));
    }
    const updated = taskStore.runAutoSubtask(taskId, subtaskCode, options);
    syncTaskProgressFromStore(taskId);
    if (updated && updated.result === '异常') {
      createIssuesFromAbnormalSubtask(taskId, updated, { id: 'system', name: '系统' }, {});
    }
    return updated;
  },

  /**
   * 任务计划时间已到：系统自动执行未完成的自动巡检项（不依赖用户打开列表/详情）
   */
  ensureSystemAutoSubtasks(taskId) {
    const task = ALL_TASKS.find(function (t) { return t.taskId === taskId; });
    if (!task) return;
    const scheduled = task.scheduled || '';
    const now = formatNowStr();
    if (scheduled && scheduled > now) return;
    const subtasks = taskStore.getSubtasks(taskId);
    subtasks.forEach(function (sub) {
      if (sub.method !== '自动') return;
      if (sub.autoRan || sub.status === '已完成') return;
      const updated = taskStore.runAutoSubtask(taskId, sub.code);
      if (updated && updated.result === '异常') {
        createIssuesFromAbnormalSubtask(taskId, updated, { id: 'system', name: '系统' }, {});
      }
    });
    syncTaskProgressFromStore(taskId);
  },

  ensureAllDueSystemAutoSubtasks() {
    ALL_TASKS.forEach(function (task) {
      if (!task || task.status === '已完成') return;
      module.exports.ensureSystemAutoSubtasks(task.taskId);
    });
  },

  /** 任务提醒：开始前按规则推送 */
  simulateTaskRemindNotifications() {
    const messageStore = require('../utils/message-store');
    const rules = getPatrolRuleDefaults();
    const now = Date.now();
    const beforeMs = parseRemindBeforeMs(rules.taskRemind);
    if (beforeMs == null) return;
    ALL_TASKS.forEach(normalizeTaskExecutorIds);
    ALL_TASKS.forEach(function (task) {
      if (!task || task.status === '已完成') return;
      const scheduledAt = parsePatrolDateTime(task.scheduled);
      if (!scheduledAt) return;
      const remindAt = scheduledAt.getTime() - beforeMs;
      // 已进入提醒窗口且任务尚未开始：推送一次（message-store addOnce 去重）
      if (now < remindAt || now >= scheduledAt.getTime()) return;
      const ids = getTaskExecutorIds(task);
      if (!ids.length) return;
      messageStore.pushTaskRemind({
        taskId: task.taskId,
        planName: task.planName,
        scheduled: task.scheduled,
        scheduledShort: String(task.scheduled || '').slice(11, 16) || task.scheduled,
        executorIds: ids,
        executorId: ids[0]
      });
    });
  },

  /** 超时提醒：先重算状态，再对已超时任务全员扇出 */
  simulateOverdueNotifications() {
    const messageStore = require('../utils/message-store');
    ALL_TASKS.forEach(normalizeTaskExecutorIds);
    ALL_TASKS.forEach(function (task) {
      if (!task || task.status === '已完成') return;
      syncTaskProgressFromStore(task.taskId);
    });
    ALL_TASKS.forEach(function (task) {
      if (!task || task.status === '已完成') return;
      if (task.status !== '已超时') return;
      const ids = getTaskExecutorIds(task);
      if (!ids.length) return;
      messageStore.pushTaskOverdue({
        taskId: task.taskId,
        planName: task.planName,
        scheduled: task.scheduled,
        executorIds: ids,
        executorId: ids[0]
      });
    });
  },

  /**
   * 后台定时任务：到点自动巡检、提醒、超时、自动复检
   * 由 App onLaunch/onShow + 定时器调用，不依赖用户点进任务/问题页
   */
  runPatrolRuntimeJobs() {
    applyPendingTaskPatches();
    module.exports.ensureAllDueSystemAutoSubtasks();
    module.exports.simulateTaskRemindNotifications();
    module.exports.simulateOverdueNotifications();
    processAllPendingAutoReinspects();
  },

  processAllPendingAutoReinspects: processAllPendingAutoReinspects,

  applyTaskReassign(taskId, executorId, options) {
    return applyTaskReassignPatch(taskId, executorId, options);
  },

  enqueueTaskReassignPatch(patch) {
    enqueueTaskReassignPatch(patch);
  },

  syncTaskProgressFromStore(taskId) {
    return syncTaskProgressFromStore(taskId);
  },

  applyPendingTaskPatches() {
    applyPendingTaskPatches();
  },

  getPatrolRuleParams() {
    return getPatrolRuleDefaults();
  },

  messages() {
    const messageStore = require('../utils/message-store');
    const env = require('../config/env');
    const userId = env.mockUserId || 'lisi';
    const list = messageStore.listForUser({ id: userId });
    return {
      list: list,
      unread: messageStore.getUnreadCount({ id: userId })
    };
  },

  mySchedule(userId) {
    return patrolSchedule.buildMyScheduleView(guardScheduleData, userId, dataScope.formatExecutorDisplay.bind(dataScope));
  },

  guardSchedules() {
    return guardScheduleData.slice();
  }
};

// 启动时规范化全部任务的 executorIds
ALL_TASKS.forEach(normalizeTaskExecutorIds);
