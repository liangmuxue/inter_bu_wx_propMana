/**
 * 访客管理 Mock（对齐 PC 访客管理2）
 * - 访客列表：审批通过的预约/邀约，按被访组织做角色组织数据权限过滤
 * - 通行记录：对齐 PC passage 字段，按关联单据被访组织过滤
 * - 扫码核验：查单据详情后人工签到/签离，事件写入 guardVerify + 跨端同步存储
 */
const session = require('../store/session');
const mockUsers = require('../config/mock-users');
const dataScope = require('../utils/data-scope');
const presenceSync = require('../utils/visitor-presence-sync');

/** 与 PC visitor-management-2 prototypeNow 对齐 */
function prototypeNow() {
  return new Date('2026-08-11T15:00:00');
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function text(v) {
  return String(v == null ? '' : v).trim();
}

function nowLabel() {
  const d = prototypeNow();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function maskMobile(mobile) {
  const m = text(mobile).replace(/\*/g, '');
  if (/^\d{11}$/.test(m)) return m.slice(0, 3) + '****' + m.slice(-4);
  const raw = text(mobile);
  return raw || '—';
}

function currentUser() {
  const user = session.getUser();
  if (user && user.name) return user;
  return mockUsers.zhangsan || mockUsers.lisi;
}

/** 被访组织名 → 组织主数据 id（演示映射，含 PC 组级名称归并） */
const HOST_ORG_MAP = {
  '物业管理部': { id: 'ORG-001', name: '物业管理部' },
  '安保部': { id: 'ORG-002', name: '安保部' },
  '工程部': { id: 'ORG-003', name: '工程部' },
  '客服部': { id: 'ORG-004', name: '客服部' },
  '综合管理组': { id: 'ORG-001', name: '物业管理部' },
  '强电组': { id: 'ORG-003', name: '工程部' },
  '暖通组': { id: 'ORG-003', name: '工程部' },
  '保洁服务组': { id: 'ORG-001', name: '物业管理部' },
  '智慧园区运营中心': { id: 'ORG-001', name: '物业管理部' },
  '企业A': { id: 'ORG-001', name: '物业管理部' }
};

function resolveHostOrg(deptName) {
  const hit = HOST_ORG_MAP[text(deptName)];
  if (hit) return hit;
  return { id: '', name: text(deptName) || '—' };
}

function companionCountOf(companions) {
  if (Array.isArray(companions)) {
    return companions.filter(function (c) {
      return c && (c.name || c.idCard || c.phone);
    }).length;
  }
  const n = Number(companions);
  return isNaN(n) ? 0 : Math.max(0, n);
}

/** 演示姓名 → 物业端账号 id（用于「我的邀约 / 待我审批 / 我的审批」） */
const PERSON_USER_ID = {
  '张三': 'zhangsan',
  '李四': 'lisi',
  '赵六': 'zhaoliu',
  '陈六': 'chenliu',
  '王五': 'wangwu',
  '系统管理员': 'admin'
};

function resolveUserIdByName(name) {
  return PERSON_USER_ID[text(name)] || '';
}

function createSeedVisits() {
  return [
    /* —— 待审批访客预约（待我审批演示）—— */
    {
      id: 'VA-20260811-801', biz: '访客预约', mode: '普通', name: '待审安保甲', phone: '138****8801',
      company: '安保合作方', host: '张三', dept: '安保部', time: '08-12 10:00–12:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '10:00', endTime: '12:00',
      companions: [], status: '待审批', source: '访客端小程序', reason: '设备巡检配合',
      idCard: '2102**********8801', visitCode: 'AP801',
      createdAt: '2026-08-11 09:20', booker: 'va_guest_a',
      approver: '张三', approverId: 'zhangsan',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    {
      id: 'VA-20260811-802', biz: '访客预约', mode: '快速', name: '待审安保乙', phone: '139****8802',
      company: '', host: '', dept: '安保部', time: '08-12 14:00–16:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '14:00', endTime: '16:00',
      companions: [], status: '待审批', source: '访客端小程序', reason: '现场对接',
      idCard: '2102**********8802', visitCode: 'AP802',
      createdAt: '2026-08-11 10:05', booker: 'va_guest_b',
      approver: '张三', approverId: 'zhangsan',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    /* —— 待审批：当前节点不允许调整通行权限组（仅我的审批可见；审批人对齐默认登录 lisi）—— */
    {
      id: 'VA-20260811-806', biz: '访客预约', mode: '普通', name: '权限锁定演示', phone: '136****8806',
      company: '锁定演示公司', host: '李四', dept: '工程部', time: '08-12 16:00–18:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '16:00', endTime: '18:00',
      companions: [], status: '待审批', source: '访客端小程序', reason: '权限组不可调演示',
      idCard: '2102**********8806', visitCode: 'AP806',
      createdAt: '2026-08-11 11:40', booker: 'va_guest_f',
      approver: '李四', approverId: 'lisi',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客',
      allowPermissionAdjust: false, mineApproveOnly: true, voided: false
    },
    {
      id: 'VA-20260811-803', biz: '访客预约', mode: '普通', name: '待审工程甲', phone: '137****8803',
      company: '机电公司', host: '李四', dept: '工程部', time: '08-13 09:00–11:00',
      visitDate: '2026-08-13', endDate: '2026-08-13', startTime: '09:00', endTime: '11:00',
      companions: [{ name: '同行一', phone: '137****8813', idCard: '' }], status: '待审批',
      source: '访客端小程序', reason: '机房巡检',
      idCard: '2102**********8803', visitCode: 'AP803',
      createdAt: '2026-08-11 11:10', booker: 'va_guest_c',
      approver: '李四', approverId: 'lisi',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    /* —— 我的审批：已驳回 / 已超时演示 —— */
    {
      id: 'VA-20260810-804', biz: '访客预约', mode: '普通', name: '已驳安保', phone: '138****8804',
      company: '外部单位', host: '张三', dept: '安保部', time: '08-11 09:00–11:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '09:00', endTime: '11:00',
      companions: [], status: '已驳回', source: '访客端小程序', reason: '资料不全',
      idCard: '2102**********8804', visitCode: 'AP804',
      createdAt: '2026-08-10 14:20', booker: 'va_guest_d',
      approver: '张三', approverId: 'zhangsan',
      approvedAt: '2026-08-10 15:00', approveRemark: '证件信息不清晰，驳回',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    {
      id: 'VA-20260809-805', biz: '访客预约', mode: '普通', name: '已超时安保', phone: '139****8805',
      company: '维保单位', host: '张三', dept: '安保部', time: '08-10 10:00–12:00',
      visitDate: '2026-08-10', endDate: '2026-08-10', startTime: '10:00', endTime: '12:00',
      companions: [], status: '已超时', source: '访客端小程序', reason: '例行拜访',
      idCard: '2102**********8805', visitCode: 'AP805',
      createdAt: '2026-08-09 09:00', booker: 'va_guest_e',
      approver: '张三', approverId: 'zhangsan',
      approvedAt: '', approveRemark: '超时未审批',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    /* —— 我的邀约演示 —— */
    {
      id: 'SI-20260811-811', biz: '员工邀约', mode: '普通', name: '我的普通邀约', phone: '136****8811',
      company: '合作方', host: '张三', dept: '安保部', time: '08-12 09:30–11:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '09:30', endTime: '11:00',
      companions: [], status: '审批通过', source: '物业端小程序', reason: '业务沟通',
      idCard: '2102**********8811', visitCode: 'MY811',
      createdAt: '2026-08-11 08:40', operator: '张三', booker: '张三',
      inviterId: 'zhangsan', approver: '张三', approverId: 'zhangsan',
      approvedAt: '2026-08-11 08:40', approveRemark: '普通邀约提交即通过',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'SI-20260811-812', biz: '员工邀约', mode: '快速', name: '我的快速邀约', phone: '135****8812',
      company: '', host: '张三', dept: '安保部', time: '—',
      visitDate: '', endDate: '', startTime: '', endTime: '',
      companions: [], status: '待完善', source: '物业端小程序', reason: '',
      idCard: '', visitCode: 'MY812',
      createdAt: '2026-08-11 09:50', operator: '张三', booker: '张三',
      inviterId: 'zhangsan', approver: '', approverId: '',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    {
      id: 'SI-20260809-814', biz: '员工邀约', mode: '普通', name: '已超时邀约', phone: '134****8814',
      company: '超时演示', host: '李四', dept: '工程部', time: '08-09 09:00–11:00',
      visitDate: '2026-08-09', endDate: '2026-08-09', startTime: '09:00', endTime: '11:00',
      companions: [], status: '已超时', source: '物业端小程序', reason: '超时未完善演示',
      idCard: '2102**********8814', visitCode: 'MY814',
      createdAt: '2026-08-08 16:20', operator: '李四', booker: '李四',
      inviterId: 'lisi', approver: '', approverId: '',
      permissionGroupId: '', permissionGroupName: '', voided: false
    },
    {
      id: 'SI-20260811-813', biz: '员工邀约', mode: '普通', name: '工程我的邀约', phone: '133****8813',
      company: '供应商B', host: '李四', dept: '工程部', time: '08-12 15:00–17:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '15:00', endTime: '17:00',
      companions: [], status: '审批通过', source: '物业端小程序', reason: '验收配合',
      idCard: '2102**********8813', visitCode: 'MY813',
      createdAt: '2026-08-11 10:20', operator: '李四', booker: '李四',
      inviterId: 'lisi', approver: '李四', approverId: 'lisi',
      approvedAt: '2026-08-11 10:20', approveRemark: '普通邀约提交即通过',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    /* —— 未生效（访问开始未到）—— */
    {
      id: 'SI-20260812-901', biz: '员工邀约', mode: '普通', name: '未生效演示', phone: '136****9001',
      company: '港航演示', host: '王芳', dept: '物业管理部', time: '08-12 09:00–11:30',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '09:00', endTime: '11:30',
      companions: [], status: '审批通过', source: 'PC端', reason: '未生效状态演示',
      idCard: '2102**********9001', visitCode: 'WX901',
      createdAt: '2026-08-11 09:00', operator: '王芳', booker: '王芳', approver: '王芳',
      approvedAt: '2026-08-11 09:00', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260812-902', biz: '访客预约', mode: '普通', name: '安保未生效', phone: '135****9002',
      company: '安保供应商', host: '张三', dept: '安保部', time: '08-13 14:00–16:00',
      visitDate: '2026-08-13', endDate: '2026-08-13', startTime: '14:00', endTime: '16:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '安保未生效演示',
      idCard: '2102**********9002', visitCode: 'AB902',
      createdAt: '2026-08-10 16:20', booker: 'ab_demo', approver: '张三', approverId: 'zhangsan',
      approvedAt: '2026-08-10 17:00', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'SI-20260812-903', biz: '员工邀约', mode: '普通', name: '工程未生效', phone: '137****9003',
      company: '机电工程', host: '陈晨', dept: '工程部', time: '08-14 09:00–12:00',
      visitDate: '2026-08-14', endDate: '2026-08-14', startTime: '09:00', endTime: '12:00',
      companions: [], status: '审批通过', source: '员工端小程序', reason: '工程未生效演示',
      idCard: '2102**********9003', visitCode: 'GC903',
      createdAt: '2026-08-11 11:00', operator: '赵强', booker: '赵强', approver: '赵强',
      approvedAt: '2026-08-11 11:00', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'SI-20260810-022', biz: '员工邀约', mode: '快速', name: '赵敏', phone: '139****3344',
      company: '港航咨询', host: '王芳', dept: '企业A', time: '08-12 10:00–12:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '10:00', endTime: '12:00',
      companions: [], status: '审批通过', source: '员工端小程序', reason: '方案沟通',
      idCard: '2102**********3041', visitCode: 'ZM022',
      createdAt: '2026-08-10 11:05', operator: '王芳', booker: '王芳', approver: '王芳',
      approvedAt: '2026-08-10 15:20', approveRemark: '同意来访',
      permissionGroupId: 'AG-003', permissionGroupName: 'VIP访客', voided: false
    },

    /* —— 生效中（已到开始、未结束、未签离）—— */
    {
      id: 'SI-20260811-001', biz: '员工邀约', mode: '普通', name: '钱程', phone: '136****7788',
      company: '港航供应链', host: '王芳', dept: '物业管理部', time: '08-11 09:00–18:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '09:00', endTime: '18:00',
      companions: [], status: '审批通过', source: 'PC端', reason: '合同核对（未签到可扫码）',
      idCard: '2102**********5566', visitCode: 'QC001',
      createdAt: '2026-08-11 10:18', operator: '王芳', booker: '王芳', approver: '王芳',
      approvedAt: '2026-08-11 10:18', approveRemark: '普通邀约提交即通过',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260809-031', biz: '访客预约', mode: '普通', name: '何楠', phone: '131****9900',
      company: '港航科技', host: '周然', dept: '综合管理组', time: '08-11 10:00–18:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '10:00', endTime: '18:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '合同会签（已签到）',
      idCard: '2102**********3301', visitCode: 'HN031',
      createdAt: '2026-08-09 09:18', booker: 'hn_henan', approver: '李沐阳',
      approvedAt: '2026-08-09 16:40', approveRemark: '同意来访',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260811-904', biz: '访客预约', mode: '普通', name: '安保生效中', phone: '138****9004',
      company: '安保巡检', host: '张三', dept: '安保部', time: '08-11 08:00–20:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '08:00', endTime: '20:00',
      companions: [{ name: '同行甲', idCard: '2102**********9041', phone: '138****9041' }],
      status: '审批通过', source: '访客端小程序', reason: '安保生效中演示',
      idCard: '2102**********9004', visitCode: 'AB904',
      createdAt: '2026-08-10 18:00', booker: 'ab_active', approver: '王芳',
      approvedAt: '2026-08-10 18:30', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260808-070', biz: '访客预约', mode: '普通', name: '沈婷', phone: '139****3344',
      company: '电力维保', host: '李沐阳', dept: '强电组', time: '08-11 09:30–18:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '09:30', endTime: '18:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '配电巡检',
      idCard: '2102**********6653', visitCode: 'ST070',
      createdAt: '2026-08-08 18:06', booker: 'st_shenting', approver: '赵强',
      approvedAt: '2026-08-09 09:12', approveRemark: '已核对证件与事由',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'SI-20260811-905', biz: '员工邀约', mode: '普通', name: '工程生效中', phone: '136****9005',
      company: '设备维保', host: '赵强', dept: '工程部', time: '08-11 08:00–19:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '08:00', endTime: '19:00',
      companions: [], status: '审批通过', source: 'PC端', reason: '工程生效中·未签到',
      idCard: '2102**********9005', visitCode: 'GC905',
      createdAt: '2026-08-11 08:10', operator: '赵强', booker: '赵强', approver: '赵强',
      approvedAt: '2026-08-11 08:10', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },

    /* —— 已作废 —— */
    {
      id: 'VA-20260806-019', biz: '访客预约', mode: '普通', name: '高蕾', phone: '134****5566',
      company: '物业咨询', host: '李沐阳', dept: '物业管理部', time: '08-12 10:00–12:00',
      visitDate: '2026-08-12', endDate: '2026-08-12', startTime: '10:00', endTime: '12:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '物业对接',
      idCard: '2102**********1190', visitCode: 'GL019',
      createdAt: '2026-08-06 16:48', booker: 'gl_gaolei', approver: '张伟',
      approvedAt: '2026-08-06 18:05', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客',
      voided: true, passAuthStatus: '已作废', voidedAt: '2026-08-10 11:00'
    },
    {
      id: 'VA-20260810-906', biz: '访客预约', mode: '普通', name: '安保已作废', phone: '135****9006',
      company: '安保外包', host: '张三', dept: '安保部', time: '08-11 13:00–15:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '13:00', endTime: '15:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '安保作废演示',
      idCard: '2102**********9006', visitCode: 'AB906',
      createdAt: '2026-08-09 10:00', booker: 'ab_void', approver: '王芳',
      approvedAt: '2026-08-09 11:00', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客',
      voided: true, passAuthStatus: '已作废', voidedAt: '2026-08-10 09:30'
    },
    {
      id: 'SI-20260809-907', biz: '员工邀约', mode: '普通', name: '工程已作废', phone: '133****9007',
      company: '施工方', host: '陈晨', dept: '工程部', time: '08-11 10:00–12:00',
      visitDate: '2026-08-11', endDate: '2026-08-11', startTime: '10:00', endTime: '12:00',
      companions: [], status: '审批通过', source: '员工端小程序', reason: '工程作废演示',
      idCard: '2102**********9007', visitCode: 'GC907',
      createdAt: '2026-08-09 14:00', operator: '赵强', booker: '赵强', approver: '赵强',
      approvedAt: '2026-08-09 14:00', approveRemark: '同意',
      permissionGroupId: 'AG-004', permissionGroupName: '施工访客',
      voided: true, passAuthStatus: '已作废', voidedAt: '2026-08-10 16:00'
    },

    /* —— 已结束（已签离或访问结束）—— */
    {
      id: 'SI-20260808-088', biz: '员工邀约', mode: '普通', name: '周敏', phone: '137****4432',
      company: '港航咨询', host: '李沐阳', dept: '物业管理部', time: '08-09 14:00–17:00',
      visitDate: '2026-08-09', endDate: '2026-08-09', startTime: '14:00', endTime: '17:00',
      companions: [], status: '审批通过', source: '员工端小程序', reason: '设备巡检配合',
      idCard: '2102**********12X', visitCode: 'ZM088',
      createdAt: '2026-08-08 11:28', operator: '李沐阳', booker: '李沐阳', approver: '李沐阳',
      approvedAt: '2026-08-08 11:28', approveRemark: '普通邀约提交即通过',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260807-056', biz: '访客预约', mode: '普通', name: '刘洋', phone: '136****1190',
      company: '城建集团', host: '王芳', dept: '安保部', time: '08-08 10:00–12:00',
      visitDate: '2026-08-08', endDate: '2026-08-08', startTime: '10:00', endTime: '12:00',
      companions: [
        { name: '吴刚', idCard: '2102**********8833', phone: '134****6633' },
        { name: '郑爽', idCard: '2102**********9944', phone: '133****7744' }
      ],
      status: '审批通过', source: '访客端小程序', reason: '拜访安保',
      idCard: '2102**********3367', visitCode: 'LY056',
      createdAt: '2026-08-07 09:50', booker: 'ly_liuyang', approver: '王芳',
      approvedAt: '2026-08-07 15:00', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260805-088', biz: '访客预约', mode: '普通', name: '高蕾', phone: '134****5566',
      company: '物业咨询', host: '李沐阳', dept: '物业管理部', time: '08-05 09:00–12:00',
      visitDate: '2026-08-05', endDate: '2026-08-05', startTime: '09:00', endTime: '12:00',
      companions: [], status: '审批通过', source: '访客端小程序', reason: '现场交底',
      idCard: '2102**********1190', visitCode: 'GL088',
      createdAt: '2026-08-04 15:20', booker: 'gl_gaolei', approver: '李沐阳',
      approvedAt: '2026-08-04 16:10', approveRemark: '同意',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    },
    {
      id: 'VA-20260808-055', biz: '访客预约', mode: '普通', name: '马超', phone: '135****2208',
      company: '机电工程', host: '陈晨', dept: '工程部', time: '08-09 09:00–11:30',
      visitDate: '2026-08-09', endDate: '2026-08-09', startTime: '09:00', endTime: '11:30',
      companions: [
        { name: '孙强', idCard: '2102**********6611', phone: '136****4411' },
        { name: '周杰', idCard: '2102**********7722', phone: '135****5522' }
      ],
      status: '审批通过', source: '访客端小程序', reason: '设备调试',
      idCard: '2102**********7720', visitCode: 'MC055',
      createdAt: '2026-08-08 10:12', booker: 'mc_machao', approver: '王芳',
      approvedAt: '2026-08-08 14:20', approveRemark: '通过',
      permissionGroupId: 'AG-004', permissionGroupName: '施工访客', voided: false
    },
    {
      id: 'SI-20260806-033', biz: '员工邀约', mode: '普通', name: '孙悦', phone: '133****7788',
      company: '供应商', host: '赵强', dept: '客服部', time: '08-06 09:00–12:00',
      visitDate: '2026-08-06', endDate: '2026-08-06', startTime: '09:00', endTime: '12:00',
      companions: [], status: '审批通过', source: 'PC端', reason: '合同交接',
      idCard: '', visitCode: 'SY033',
      createdAt: '2026-08-06 09:40', operator: '赵强', booker: '赵强', approver: '赵强',
      approvedAt: '2026-08-06 09:40', approveRemark: '普通邀约提交即通过',
      permissionGroupId: 'AG-002', permissionGroupName: '标准访客', voided: false
    }
  ].map(function (row) {
    const org = resolveHostOrg(row.dept);
    const inviterId = row.inviterId || resolveUserIdByName(row.operator || row.booker || '');
    let approverId = row.approverId || resolveUserIdByName(row.approver || '');
    // 安保部已通过预约：默认审批人归演示账号张三，便于「我的审批」
    if (!approverId && row.biz === '访客预约' && row.status === '审批通过' && org.id === 'ORG-002') {
      approverId = 'zhangsan';
    }
    return Object.assign({}, row, {
      hostOrgId: org.id,
      hostOrgName: org.name,
      visitDepartmentName: row.dept,
      inviterId: inviterId || '',
      approverId: approverId || '',
      approver: row.approver || (approverId === 'zhangsan' ? '张三' : row.approver) || ''
    });
  });
}

function createSeedPassage() {
  return [
    {
      id: 'PS-001', time: '2026-08-09 13:52', type: '门禁', method: '人脸',
      name: '周敏', phone: '137****4432', order: 'SI-20260808-088',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '进', result: '成功',
      remark: '签到进门，人脸比对通过'
    },
    {
      id: 'PS-002', time: '2026-08-09 14:05', type: '门禁', method: '人脸',
      name: '周敏', phone: '137****4432', order: 'SI-20260808-088',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '进', result: '成功',
      remark: '楼内二次通行'
    },
    {
      id: 'PS-003', time: '2026-08-09 14:18', type: '门禁', method: '人脸',
      name: '周敏', phone: '137****4432', order: 'SI-20260808-088',
      deviceId: 'DEV-ACS-15F-ELV', device: '15F客梯厅门禁', dir: '进', result: '失败',
      remark: '设备不在「标准访客」通行权限组范围内'
    },
    {
      id: 'PS-004', time: '2026-08-09 16:40', type: '门禁', method: '人脸',
      name: '周敏', phone: '137****4432', order: 'SI-20260808-088',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '出', result: '成功',
      remark: '签离出门，门禁事件触发权限回收'
    },
    {
      id: 'PS-005', time: '2026-08-09 08:55', type: '门禁', method: '身份证',
      name: '马超', phone: '135****2208', order: 'VA-20260808-055',
      deviceId: 'DEV-ACS-1F-W', device: '1F西闸机', dir: '进', result: '成功',
      remark: '签到进门'
    },
    {
      id: 'PS-006', time: '2026-08-09 09:40', type: '门禁', method: '身份证',
      name: '马超', phone: '135****2208', order: 'VA-20260808-055',
      deviceId: 'DEV-ACS-FREIGHT', device: '货运通道闸机', dir: '进', result: '成功',
      remark: '施工区域通行'
    },
    {
      id: 'PS-007', time: '2026-08-09 11:20', type: '门禁', method: '二维码',
      name: '马超', phone: '135****2208', order: 'VA-20260808-055',
      deviceId: 'DEV-ACS-1F-W', device: '1F西闸机', dir: '出', result: '成功',
      remark: '签离出门'
    },
    {
      id: 'PS-008', time: '2026-08-11 09:28', type: '门禁', method: '人脸',
      name: '沈婷', phone: '139****3344', order: 'VA-20260808-070',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '进', result: '成功',
      remark: '签到进门，访问未结束'
    },
    {
      id: 'PS-009', time: '2026-08-08 17:05', type: '门禁', method: '人脸',
      name: '刘洋', phone: '136****1190', order: 'VA-20260807-056',
      deviceId: 'DEV-ACS-1F-W', device: '1F西闸机', dir: '出', result: '成功',
      remark: '门禁事件签离'
    },
    {
      id: 'PS-010', time: '2026-08-06 09:05', type: '门禁', method: '二维码',
      name: '孙悦', phone: '133****7788', order: 'SI-20260806-033',
      deviceId: 'DEV-ACS-1F-MAIN', device: '1F大堂闸机', dir: '进', result: '成功',
      remark: '签到进门'
    },
    {
      id: 'PS-011', time: '2026-08-06 11:45', type: '门禁', method: '二维码',
      name: '孙悦', phone: '133****7788', order: 'SI-20260806-033',
      deviceId: 'DEV-ACS-1F-MAIN', device: '1F大堂闸机', dir: '出', result: '成功',
      remark: '被访人帮签离后出门'
    },
    {
      id: 'PS-012', time: '2026-08-10 10:12', type: '门禁', method: '人脸',
      name: '陈晓明', phone: '138****0000', order: '—',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '进', result: '失败',
      remark: '命中受限名单，禁止通行'
    },
    {
      id: 'PS-013', time: '2026-08-05 09:12', type: '门禁', method: '人脸',
      name: '高蕾', phone: '134****5566', order: 'VA-20260805-088',
      deviceId: 'DEV-ACS-1F-E', device: '1F东闸机', dir: '进', result: '成功',
      remark: '签到进门（演示超期未签离自动签离）'
    }
  ];
}

/** 种子：物业扫码核验（与 PC 一致） */
function createSeedGuardVerify() {
  return [
    {
      id: 'GV-001', orderId: 'VA-20260809-031', action: 'checkIn',
      time: '2026-08-11 10:08', name: '何楠', source: '物业端小程序', remark: '扫码核验签到'
    },
    {
      id: 'GV-002', orderId: 'SI-20260806-033', action: 'checkOut',
      time: '2026-08-06 12:05', name: '孙悦', source: '物业端小程序', remark: '扫码核验签离'
    }
  ];
}

let visits = createSeedVisits();
let passage = createSeedPassage();
let guardVerifyEvents = createSeedGuardVerify();
let gvSeq = 100;

function mergeSyncedGuardEvents() {
  const synced = presenceSync.readEvents() || [];
  synced.forEach(function (ev) {
    if (!ev || !ev.orderId || !ev.action) return;
    const exists = guardVerifyEvents.some(function (e) {
      return e.orderId === ev.orderId && e.action === ev.action;
    });
    if (!exists) guardVerifyEvents.push(ev);
  });
}

function isVisitorListRow(r) {
  return !!(r && r.status === '审批通过');
}

function inOrgScope(row) {
  const scope = dataScope.resolveDataScope(currentUser());
  return dataScope.matchesDataScope(scope, {
    orgId: row.hostOrgId || '',
    orgName: row.hostOrgName || row.dept || ''
  });
}

function successfulPassageForOrder(orderId) {
  if (!orderId || orderId === '—') return [];
  return passage.filter(function (p) {
    return p && p.order === orderId && p.result === '成功';
  });
}

function hasPassageDir(orderId, dir) {
  return successfulPassageForOrder(orderId).some(function (p) {
    return p.dir === dir;
  });
}

function hasGuardVerifyAction(orderId, action) {
  mergeSyncedGuardEvents();
  return guardVerifyEvents.some(function (e) {
    return e && e.orderId === orderId && e.action === action;
  }) || presenceSync.hasAction(orderId, action);
}

function parseVisitEndDate(r) {
  if (!r || !r.visitDate || !r.endTime) return null;
  const d = String(r.visitDate).split('-');
  const t = String(r.endTime).split(':');
  if (d.length < 3 || t.length < 2) return null;
  return new Date(
    Number(d[0]), Number(d[1]) - 1, Number(d[2]),
    Number(t[0]), Number(t[1]), 0
  );
}

function parseVisitStartDate(r) {
  if (!r || !r.visitDate || !r.startTime) return null;
  const d = String(r.visitDate).split('-');
  const t = String(r.startTime).split(':');
  if (d.length < 3 || t.length < 2) return null;
  return new Date(
    Number(d[0]), Number(d[1]) - 1, Number(d[2]),
    Number(t[0]), Number(t[1]), 0
  );
}

function resolveVisitPresence(r) {
  if (!r || !r.id) return { hasCheckIn: false, hasCheckOut: false, autoCheckedOut: false };
  let hasIn = hasPassageDir(r.id, '进') || hasGuardVerifyAction(r.id, 'checkIn');
  let hasOut = hasPassageDir(r.id, '出') || hasGuardVerifyAction(r.id, 'checkOut');
  let autoCheckedOut = false;
  if (hasIn && !hasOut) {
    const end = parseVisitEndDate(r);
    if (end && prototypeNow().getTime() >= end.getTime()) {
      autoCheckedOut = true;
      hasOut = true;
    }
  }
  return { hasCheckIn: hasIn, hasCheckOut: hasOut, autoCheckedOut: autoCheckedOut };
}

function displayCheckInStatus(r) {
  const presence = resolveVisitPresence(r);
  if (presence.hasCheckOut) return '已签离';
  if (presence.hasCheckIn) return '已签到';
  return '—';
}

function checkInStatusMeta(status) {
  // 色调对齐员工端小程序2：已签到 green，已签离 / — slate
  if (status === '已签到') return { label: '已签到', tone: 'green', statusClass: 'tone-green' };
  if (status === '已签离') return { label: '已签离', tone: 'slate', statusClass: 'tone-slate' };
  return { label: '—', tone: 'slate', statusClass: 'tone-slate' };
}

function displayPassAuthStatus(r) {
  if (!r) return '—';
  if (r.voided || r.passAuthStatus === '已作废') return '已作废';
  if (displayCheckInStatus(r) === '已签离') return '已结束';
  const end = parseVisitEndDate(r);
  const start = parseVisitStartDate(r);
  const now = prototypeNow().getTime();
  if (end && now >= end.getTime()) return '已结束';
  if (start && now < start.getTime()) return '未生效';
  if (start && (!end || now < end.getTime())) return '生效中';
  if (!start) return '未生效';
  return '生效中';
}

function passAuthStatusMeta(status) {
  // 色调对齐员工端小程序2：未生效 blue / 生效中 green / 已作废 red / 已结束 slate
  const map = {
    '未生效': { label: '未生效', tone: 'blue', statusClass: 'tone-blue' },
    '生效中': { label: '生效中', tone: 'green', statusClass: 'tone-green' },
    '已作废': { label: '已作废', tone: 'red', statusClass: 'tone-red' },
    '已结束': { label: '已结束', tone: 'slate', statusClass: 'tone-slate' }
  };
  return map[status] || { label: status || '—', tone: 'slate', statusClass: 'tone-slate' };
}

function displayVisitorListBiz(r) {
  if (!r) return '—';
  const biz = r.biz === '员工邀约' ? '员工邀约' : (r.biz === '访客预约' ? '访客预约' : (r.biz || '—'));
  const mode = (r.mode === '快速' || r.mode === 'quick') ? '快速' : '普通';
  return biz + ' · ' + mode;
}

function flowStatusMeta(status) {
  const map = {
    '待审批': { label: '待审批', tone: 'amber', statusClass: 'tone-amber' },
    '待完善': { label: '待完善', tone: 'blue', statusClass: 'tone-blue' },
    '审批通过': { label: '已通过', tone: 'green', statusClass: 'tone-green' },
    '已驳回': { label: '已驳回', tone: 'red', statusClass: 'tone-red' },
    '已超时': { label: '已超时', tone: 'slate', statusClass: 'tone-slate' }
  };
  return map[status] || { label: status || '—', tone: 'slate', statusClass: 'tone-slate' };
}

function currentUserId() {
  const user = currentUser();
  return text(user && (user.id || user.account)) || '';
}

function isMineApprover(row) {
  if (!row) return false;
  const uid = currentUserId();
  if (!uid) return false;
  if (text(row.approverId) === uid) return true;
  return text(row.approver) === text(currentUser().name);
}

function isMineInviter(row) {
  if (!row) return false;
  const uid = currentUserId();
  if (!uid) return false;
  if (text(row.inviterId) === uid) return true;
  const me = text(currentUser().name);
  return text(row.operator) === me || text(row.booker) === me;
}

function matchKeyword(row, keyword) {
  if (!keyword) return true;
  const blob = [
    row.id, row.name, row.phone, row.host, row.dept, row.visitCode,
    row.company, displayVisitorListBiz(row), row.status, row.operator, row.booker
  ].join(' ').toLowerCase();
  return blob.indexOf(keyword) >= 0;
}

function sortByVisitDesc(list) {
  return list.slice().sort(function (a, b) {
    const da = (a.createdAt || '') + (a.visitDate || '') + (a.startTime || '');
    const db = (b.createdAt || '') + (b.visitDate || '') + (b.startTime || '');
    return da < db ? 1 : da > db ? -1 : 0;
  });
}

function formatVisitStartEnd(r) {
  const start = (r.visitDate || '') + ' ' + (r.startTime || '');
  const end = (r.endDate || r.visitDate || '') + ' ' + (r.endTime || '');
  return {
    start: text(start) || '—',
    end: text(end) || '—',
    range: (r.visitDate || '') + ' ' + (r.startTime || '') + '–' + (r.endTime || '')
  };
}

const PERMISSION_GROUP_DEVICES = {
  '标准访客': '1F东闸机、1F西闸机',
  'VIP访客': '1F东闸机、1F西闸机、15F客梯厅门禁',
  '施工访客': '1F西闸机、货运通道闸机、B1消防通道门禁',
  '东侧权限组': '1F东闸机、B1消防通道门禁',
  '系统默认通行权限组': '1F东闸机、1F西闸机、1F大堂闸机'
};

const PERMISSION_GROUPS = [
  { permissionGroupId: 'AG-002', permissionGroupName: '标准访客' },
  { permissionGroupId: 'AG-003', permissionGroupName: 'VIP访客' },
  { permissionGroupId: 'AG-004', permissionGroupName: '施工访客' },
  { permissionGroupId: 'AG-001', permissionGroupName: '东侧权限组' },
  { permissionGroupId: 'AG-000', permissionGroupName: '系统默认通行权限组' }
];

function listPermissionGroups() {
  return PERMISSION_GROUPS.map(function (g) {
    return {
      permissionGroupId: g.permissionGroupId,
      permissionGroupName: g.permissionGroupName,
      deviceText: PERMISSION_GROUP_DEVICES[g.permissionGroupName] || '—'
    };
  });
}

function findPermissionGroup(idOrName) {
  const key = text(idOrName);
  if (!key) return null;
  return listPermissionGroups().find(function (g) {
    return g.permissionGroupId === key || g.permissionGroupName === key;
  }) || null;
}

function formatPermissionGroupDisplay(row) {
  const name = text(row && row.permissionGroupName);
  if (!name || name === '—') return '—';
  const devices = PERMISSION_GROUP_DEVICES[name] || '';
  return devices ? (name + '（' + devices + '）') : name;
}

function canVoidVisitorPass(row) {
  if (!isVisitorListRow(row)) return false;
  if (!isMineApprover(row)) return false;
  const st = displayPassAuthStatus(row);
  if (st === '已作废' || st === '已结束') return false;
  if (st === '未生效') return true;
  if (st === '生效中') {
    return !resolveVisitPresence(row).hasCheckIn;
  }
  return false;
}

function voidVisitorPass(payload) {
  payload = payload || {};
  const row = findVisitById(payload.visitId || payload.id);
  if (!row) return { ok: false, message: '未找到访客单据' };
  if (!canVoidVisitorPass(row)) {
    return { ok: false, message: '仅审批人可作废，且当前通行状态不可作废' };
  }
  const user = currentUser();
  row.voided = true;
  row.passAuthStatus = '已作废';
  row.voidedAt = nowLabel();
  row.voidedBy = text(user.name);
  row.voidedById = text(user.id);
  return { ok: true, message: '已作废通行授权', visit: decorateVisit(row) };
}

function approvalOverallForVisit(row) {
  const st = row && row.status;
  if (st === '已超时') {
    return { label: '审批超时', tone: 'slate', copy: '超过访问开始时间，系统自动结束', symbol: '·' };
  }
  if (st === '已驳回') {
    return { label: '审批驳回', tone: 'red', copy: '审批流程已结束', symbol: '!' };
  }
  if (st === '审批通过') {
    return { label: '审批通过', tone: 'green', copy: '审批流程已完成', symbol: '✓' };
  }
  if (st === '待完善') {
    return { label: '待完善', tone: 'blue', copy: '等待访客完善信息后生效', symbol: '···' };
  }
  return { label: '待审批', tone: 'amber', copy: '请核对访客与到访信息', symbol: '审' };
}

function hasApprovalDecision(row) {
  if (!row) return false;
  return row.status === '审批通过' || row.status === '已驳回';
}

function buildApprovalFlowSteps(row) {
  if (!row) return [];
  const isStaff = row.biz === '员工邀约';
  const isQuick = row.mode === '快速' || row.mode === 'quick';
  const created = text(row.createdAt);
  const createdShort = created.length >= 16 ? created.slice(5, 16) : created;
  const initiator = isStaff
    ? (row.operator || row.host || '—')
    : (row.booker || '—');
  const submitTitle = isStaff
    ? (isQuick ? '员工提交快速邀约' : '员工提交普通邀约')
    : (isQuick ? '访客提交快速预约' : '访客提交普通预约');
  const steps = [{
    className: 'done',
    icon: '✓',
    title: submitTitle,
    meta: initiator + (createdShort ? ' · ' + createdShort : ''),
    label: '已提交',
    opinion: ''
  }];

  if (isStaff && isQuick && row.status === '待完善') {
    steps.push({
      className: 'current',
      icon: '·',
      title: '访客完善信息',
      meta: '等待访客应邀补全',
      label: '处理中',
      opinion: ''
    });
    return steps;
  }

  const st = row.status;
  let nodeClass = 'current';
  let nodeIcon = '·';
  let nodeLabel = '处理中';
  if (st === '审批通过') {
    nodeClass = 'done';
    nodeIcon = '✓';
    nodeLabel = '已通过';
  } else if (st === '已驳回') {
    nodeClass = 'rejected';
    nodeIcon = '!';
    nodeLabel = '已驳回';
  } else if (st === '已超时') {
    nodeClass = 'skipped';
    nodeIcon = '·';
    nodeLabel = '已超时';
  } else if (st === '待审批') {
    nodeClass = 'current';
    nodeIcon = '·';
    nodeLabel = '处理中';
  } else {
    return steps;
  }

  const approvedShort = text(row.approvedAt).length >= 16
    ? text(row.approvedAt).slice(5, 16)
    : text(row.approvedAt);
  const metaParts = [
    row.approver || '审批人',
    '指定人员'
  ];
  if (approvedShort && (st === '审批通过' || st === '已驳回')) {
    metaParts.push(approvedShort);
  }
  steps.push({
    className: nodeClass,
    icon: nodeIcon,
    title: '被访组织审批',
    meta: metaParts.join(' · '),
    label: nodeLabel,
    opinion: (st === '审批通过' || st === '已驳回') ? text(row.approveRemark) : ''
  });
  return steps;
}

function decorateVisit(row) {
  if (!row) return null;
  const checkIn = displayCheckInStatus(row);
  const checkMeta = checkInStatusMeta(checkIn);
  const passAuth = displayPassAuthStatus(row);
  const passMeta = passAuthStatusMeta(passAuth);
  const range = formatVisitStartEnd(row);
  const presence = resolveVisitPresence(row);
  const isStaff = row.biz === '员工邀约';
  const isQuick = row.mode === '快速' || row.mode === 'quick';
  // 对齐员工端详情 schema：访客快速预约无被访人；其余展示被访人
  const showHostPerson = isStaff || !isQuick;
  const companions = Array.isArray(row.companions)
    ? row.companions.filter(function (c) {
      return c && (c.name || c.idCard || c.phone);
    })
    : [];
  const flowMeta = flowStatusMeta(row.status);
  const overall = approvalOverallForVisit(row);
  const decided = hasApprovalDecision(row);
  const isTimeout = row.status === '已超时';
  const pending = row.status === '待审批';
  return Object.assign({}, row, {
    bizLabel: displayVisitorListBiz(row),
    visitDepartmentName: row.dept || row.visitDepartmentName || '—',
    hostName: text(row.host) || '—',
    showHostPerson: showHostPerson,
    visitorName: row.name || '—',
    visitorMobileMasked: maskMobile(row.phone),
    companions: companions,
    companionCount: companions.length,
    reasonText: text(row.reason) || '—',
    companyText: text(row.company) || '—',
    checkInStatus: checkIn,
    checkInStatusClass: checkMeta.statusClass,
    checkInTone: checkMeta.tone,
    passAuthStatus: passAuth,
    passAuthStatusClass: passMeta.statusClass,
    passAuthTone: passMeta.tone,
    flowStatus: flowMeta.label,
    flowStatusClass: flowMeta.statusClass,
    flowStatusTone: flowMeta.tone,
    approvalHeroLabel: overall.label,
    approvalHeroTone: overall.tone,
    approvalHeroSymbol: overall.symbol,
    approvalHeroCopy: overall.copy,
    approvalHeroDetail: (pending ? '当前节点' : '我的节点') + '：被访组织审批 · ' + overall.copy,
    approvalPersonText: decided ? (text(row.approver) || '—') : '—',
    approvalTimeText: decided ? (text(row.approvedAt) || '—') : '—',
    approvalRemarkText: decided ? (text(row.approveRemark) || '—') : (isTimeout ? '—' : '—'),
    showApprovePermissionGroup: !isTimeout && row.status === '审批通过',
    flowSteps: buildApprovalFlowSteps(row),
    visitStartText: range.start,
    visitEndText: range.end,
    planTimeText: range.range,
    orderNo: row.id,
    canCheckIn: !row.voided && checkIn === '—' && isVisitorListRow(row),
    canCheckOut: !row.voided && checkIn === '已签到',
    canApprove: row.status === '待审批' && isMineApprover(row) && row.biz === '访客预约',
    canVoid: canVoidVisitorPass(row),
    canAdjustPermission: row.status === '待审批' && row.allowPermissionAdjust !== false,
    hasCheckIn: presence.hasCheckIn,
    hasCheckOut: presence.hasCheckOut,
    permissionRevoked: checkIn === '已签离',
    permissionGroupDisplay: formatPermissionGroupDisplay(row),
    modeLabel: isStaff
      ? (isQuick ? '快速' : '普通')
      : (isQuick ? '快速预约' : '普通预约'),
    createdLabel: isStaff ? '邀约时间' : '预约时间',
    operatorLabel: isStaff ? '邀约操作人' : '预约人',
    operatorValue: isStaff
      ? (row.operator || row.host || '—')
      : (row.booker || '—'),
    passHint: ({
      '未生效': '访问开始前通行尚未生效',
      '生效中': '请按预约时间到访并出示凭证',
      '已作废': '通行授权已作废，无法核验通行',
      '已结束': checkIn === '已签离' ? '已签离，通行权限已收回' : '本次通行已结束'
    })[passAuth] || '',
    flowHint: ({
      '待审批': '请核对访客与到访信息后审批',
      '待完善': '等待访客完善信息后生效',
      '审批通过': '已审批通过',
      '已驳回': '已驳回，不可通行',
      '已超时': '审批已超时'
    })[row.status] || ''
  });
}

function findVisitById(id) {
  const key = text(id);
  if (!key) return null;
  return visits.find(function (row) {
    return text(row.id) === key || text(row.orderNo) === key;
  }) || null;
}

function normalizePassCode(raw) {
  let code = text(raw);
  if (!code) return '';
  if (code.indexOf('VIS|') === 0 || code.indexOf('vis|') === 0 ||
      code.indexOf('PASS|') === 0 || code.indexOf('pass|') === 0) {
    const parts = code.split('|');
    code = parts[1] || parts[parts.length - 1] || code;
  }
  return text(code).toUpperCase();
}

function findVisitByCode(code) {
  const key = normalizePassCode(code);
  if (!key) return null;
  return visits.find(function (row) {
    return text(row.visitCode).toUpperCase() === key ||
      text(row.id).toUpperCase() === key;
  }) || null;
}

function listVisitorPass(query) {
  query = query || {};
  const keyword = text(query.keyword).toLowerCase();
  const passFilter = text(query.passAuth) || 'all';
  const tab = text(query.tab) || 'org';

  let list = visits.filter(function (row) {
    if (!isVisitorListRow(row)) return false;
    if (tab === 'mine') return isMineApprover(row);
    return inOrgScope(row);
  });

  if (passFilter && passFilter !== 'all') {
    list = list.filter(function (row) {
      return displayPassAuthStatus(row) === passFilter;
    });
  }

  if (keyword) {
    list = list.filter(function (row) {
      return matchKeyword(row, keyword);
    });
  }

  return sortByVisitDesc(list).map(decorateVisit);
}

function listAppointments(query) {
  query = query || {};
  const keyword = text(query.keyword).toLowerCase();
  const statusFilter = text(query.status) || 'all';
  const tab = text(query.tab) || 'org';

  let list = visits.filter(function (row) {
    if (!row || row.biz !== '访客预约') return false;
    // 专供「我的审批」的演示单：绝不进组织预约
    if (row.mineApproveOnly) {
      return (tab === 'mine' || tab === 'pendingMine') && isMineApprover(row);
    }
    if (tab === 'mine' || tab === 'pendingMine') {
      return isMineApprover(row);
    }
    return inOrgScope(row);
  });

  if (statusFilter && statusFilter !== 'all') {
    list = list.filter(function (row) { return row.status === statusFilter; });
  }
  if (keyword) {
    list = list.filter(function (row) { return matchKeyword(row, keyword); });
  }
  return sortByVisitDesc(list).map(decorateVisit);
}

function listInvites(query) {
  query = query || {};
  const keyword = text(query.keyword).toLowerCase();
  const statusFilter = text(query.status) || 'all';
  const tab = text(query.tab) || 'org';

  let list = visits.filter(function (row) {
    if (!row || row.biz !== '员工邀约') return false;
    if (tab === 'mine') return isMineInviter(row);
    return inOrgScope(row);
  });

  if (statusFilter && statusFilter !== 'all') {
    list = list.filter(function (row) { return row.status === statusFilter; });
  }
  if (keyword) {
    list = list.filter(function (row) { return matchKeyword(row, keyword); });
  }
  return sortByVisitDesc(list).map(decorateVisit);
}

function getVisit(id, opts) {
  opts = opts || {};
  const row = findVisitById(id);
  if (!row) return null;
  const allowFlow = !!opts.flow || !!opts.allowFlow;
  if (!allowFlow && !isVisitorListRow(row)) return null;

  const visible =
    inOrgScope(row) ||
    isMineApprover(row) ||
    isMineInviter(row);
  if (!visible) return null;
  return decorateVisit(row);
}

function listAccessibleOrgs() {
  const orgPerm = require('../config/org-permissions');
  const scope = dataScope.resolveDataScope(currentUser());
  const all = Object.keys(orgPerm.ORGS || {}).map(function (id) {
    return { id: id, name: orgPerm.ORGS[id].name };
  });
  if (scope.all) return all;
  return all.filter(function (o) {
    return (scope.orgIds || []).indexOf(o.id) >= 0;
  });
}

function nextInviteId(prefix) {
  const d = prototypeNow();
  const day = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  let max = 900;
  visits.forEach(function (row) {
    const m = String(row.id || '').match(new RegExp('^' + prefix + '-\\d{8}-(\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return prefix + '-' + day + '-' + String(max + 1).padStart(3, '0');
}

function createInvite(payload) {
  payload = payload || {};
  const mode = (payload.mode === '快速' || payload.mode === 'quick') ? '快速' : '普通';
  const user = currentUser();
  const orgId = text(payload.visitDepartmentId || payload.hostOrgId);
  const orgPerm = require('../config/org-permissions');
  const orgName = text(payload.visitDepartmentName || payload.dept) ||
    ((orgPerm.ORGS[orgId] && orgPerm.ORGS[orgId].name) || '');
  if (!orgId && !orgName) {
    return { ok: false, message: '请选择被访组织' };
  }
  if (!inOrgScope({ hostOrgId: orgId, hostOrgName: orgName, dept: orgName })) {
    return { ok: false, message: '被访组织不在当前账号组织数据权限内' };
  }

  const name = text(payload.name);
  const phone = text(payload.phone);
  if (!name) return { ok: false, message: '请填写访客姓名' };
  if (!phone) return { ok: false, message: '请填写手机号' };

  if (mode === '普通') {
    if (!text(payload.idCard)) return { ok: false, message: '请填写证件号' };
    if (!text(payload.visitDate) || !text(payload.startTime)) {
      return { ok: false, message: '请填写访问开始时间' };
    }
    if (!text(payload.endDate || payload.visitDate) || !text(payload.endTime)) {
      return { ok: false, message: '请填写访问结束时间' };
    }
  }

  const id = nextInviteId('SI');
  const visitCode = 'SI' + String(Date.now()).slice(-6);
  const now = nowLabel();
  const row = {
    id: id,
    biz: '员工邀约',
    mode: mode,
    name: name,
    phone: phone,
    company: text(payload.company),
    host: text(payload.host) || text(user.name),
    dept: orgName,
    hostOrgId: orgId || resolveHostOrg(orgName).id,
    hostOrgName: resolveHostOrg(orgName).name || orgName,
    visitDepartmentName: orgName,
    time: mode === '快速'
      ? '—'
      : ((payload.visitDate || '').slice(5) + ' ' + (payload.startTime || '') + '–' + (payload.endTime || '')),
    visitDate: mode === '快速' ? '' : text(payload.visitDate),
    endDate: mode === '快速' ? '' : text(payload.endDate || payload.visitDate),
    startTime: mode === '快速' ? '' : text(payload.startTime),
    endTime: mode === '快速' ? '' : text(payload.endTime),
    companions: Array.isArray(payload.companions) ? payload.companions : [],
    status: mode === '快速' ? '待完善' : '审批通过',
    source: '物业端小程序',
    reason: text(payload.reason),
    idCard: text(payload.idCard),
    visitCode: visitCode,
    createdAt: now,
    operator: text(user.name),
    booker: text(user.name),
    inviterId: text(user.id),
    approver: mode === '快速' ? '' : text(user.name),
    approverId: mode === '快速' ? '' : text(user.id),
    approvedAt: mode === '快速' ? '' : now,
    approveRemark: mode === '快速' ? '' : '普通邀约提交即通过',
    permissionGroupId: mode === '快速' ? '' : 'AG-002',
    permissionGroupName: mode === '快速' ? '' : '标准访客',
    voided: false
  };
  visits.unshift(row);
  return { ok: true, message: mode === '快速' ? '快速邀约已发出，等待访客完善' : '普通邀约已生效', visit: decorateVisit(row) };
}

function decideAppointment(payload) {
  payload = payload || {};
  const row = findVisitById(payload.visitId || payload.id);
  if (!row) return { ok: false, message: '未找到预约单' };
  if (row.biz !== '访客预约') return { ok: false, message: '仅访客预约可审批' };
  if (row.status !== '待审批') return { ok: false, message: '当前状态不可审批' };
  if (!isMineApprover(row)) return { ok: false, message: '仅待我审批的单据可操作' };

  const pass = payload.decision === 'reject' || payload.pass === false ? false : true;
  const remark = text(payload.remark || payload.approveRemark || payload.opinion);
  const user = currentUser();
  row.status = pass ? '审批通过' : '已驳回';
  row.approver = text(user.name);
  row.approverId = text(user.id);
  row.approvedAt = nowLabel();
  row.approveRemark = remark || (pass ? '同意' : '驳回');
  if (pass) {
    const canAdjust = row.allowPermissionAdjust !== false;
    if (canAdjust) {
      const group = findPermissionGroup(payload.permissionGroupId || payload.permissionGroupName) ||
        findPermissionGroup('AG-002');
      if (!group) {
        return { ok: false, message: '请选择通行权限组' };
      }
      row.permissionGroupId = group.permissionGroupId;
      row.permissionGroupName = group.permissionGroupName;
    } else {
      row.permissionGroupId = row.permissionGroupId || 'AG-002';
      row.permissionGroupName = row.permissionGroupName || '标准访客';
    }
  }
  return {
    ok: true,
    message: pass ? '已通过' : '已驳回',
    visit: decorateVisit(row)
  };
}

function lookupPassCode(code) {
  const row = findVisitByCode(code);
  if (!row) return null;
  if (!isVisitorListRow(row)) return null;
  if (!inOrgScope(row)) return null;
  return decorateVisit(row);
}

function enrichPassageRow(r) {
  const invite = findVisitById(r.order);
  let groupName = '';
  let dept = '';
  let biz = '';
  let phone = r.phone || '';
  let name = r.name || '';
  let hostOrgId = '';
  let hostOrgName = '';
  if (invite) {
    name = invite.name || name;
    phone = invite.phone || phone;
    dept = invite.dept || '';
    biz = invite.biz || '';
    groupName = invite.permissionGroupName || '';
    hostOrgId = invite.hostOrgId || '';
    hostOrgName = invite.hostOrgName || '';
  }
  return {
    id: r.id || '',
    time: r.time || '—',
    type: r.type || '门禁',
    method: r.method || '人脸',
    name: name || '—',
    phone: phone || '—',
    order: r.order || '—',
    biz: biz || '—',
    dept: dept || '—',
    groupName: groupName || '—',
    device: r.device || '—',
    deviceId: r.deviceId || '',
    dir: r.dir || '—',
    result: r.result || '—',
    remark: r.remark || '',
    resultClass: r.result === '成功' ? 'tag-success' : (r.result === '失败' ? 'tag-danger' : 'tag-info'),
    hostOrgId: hostOrgId,
    hostOrgName: hostOrgName
  };
}

function listPassage(query) {
  query = query || {};
  const result = text(query.result);
  const dir = text(query.dir);
  const method = text(query.method);
  const keyword = text(query.keyword).toLowerCase();
  const scope = dataScope.resolveDataScope(currentUser());

  return passage.map(enrichPassageRow).filter(function (r) {
    if (r.order && r.order !== '—') {
      if (!dataScope.matchesDataScope(scope, {
        orgId: r.hostOrgId || '',
        orgName: r.hostOrgName || r.dept || ''
      })) return false;
    } else if (!scope.all) {
      return false;
    }
    if (result && r.result !== result) return false;
    if (dir && r.dir !== dir) return false;
    if (method && r.method !== method) return false;
    if (!keyword) return true;
    const hay = [
      r.id, r.time, r.name, r.phone, r.order, r.biz, r.dept,
      r.groupName, r.device, r.deviceId, r.method, r.dir, r.result, r.remark
    ].join(' ').toLowerCase();
    return hay.indexOf(keyword) >= 0;
  }).sort(function (a, b) {
    return String(b.time).localeCompare(String(a.time));
  });
}

function getPassage(id) {
  const raw = passage.find(function (p) { return p.id === id; });
  if (!raw) return null;
  const row = enrichPassageRow(raw);
  const scope = dataScope.resolveDataScope(currentUser());
  if (row.order && row.order !== '—') {
    if (!dataScope.matchesDataScope(scope, {
      orgId: row.hostOrgId || '',
      orgName: row.hostOrgName || row.dept || ''
    })) return null;
  } else if (!scope.all) {
    return null;
  }
  return row;
}

/**
 * 扫码后打开详情（不自动签到）
 */
function resolveScan(payload) {
  payload = payload || {};
  let row = null;
  if (payload.visitId) row = findVisitById(payload.visitId);
  if (!row && payload.code) row = findVisitByCode(payload.code);
  if (!row) {
    return { ok: false, message: '未找到通行凭证对应的访客单据', visit: null };
  }
  if (!isVisitorListRow(row)) {
    return { ok: false, message: '该单据未审批通过，无法核验', visit: decorateVisit(row) };
  }
  if (!inOrgScope(row)) {
    return { ok: false, message: '当前账号无该被访组织的数据权限', visit: null };
  }
  return { ok: true, message: '', visit: decorateVisit(row) };
}

function pushGuardVerify(orderId, action, name) {
  gvSeq += 1;
  const event = {
    id: 'GV-' + gvSeq,
    orderId: orderId,
    action: action,
    time: nowLabel(),
    name: name || '',
    source: '物业端小程序',
    remark: action === 'checkIn' ? '扫码核验签到' : '扫码核验签离'
  };
  guardVerifyEvents.unshift(event);
  presenceSync.upsertEvent(event);
  return event;
}

/**
 * 人工签到 / 签离（确认后写入，跨端同步存储）
 */
function confirmPresence(payload) {
  payload = payload || {};
  const action = payload.action === 'checkOut' ? 'checkOut' : 'checkIn';
  const row = findVisitById(payload.visitId || payload.id);
  if (!row) return { ok: false, message: '未找到访客单据' };
  if (!isVisitorListRow(row)) return { ok: false, message: '该单据不可核验' };
  if (!inOrgScope(row)) return { ok: false, message: '当前账号无该被访组织的数据权限' };
  if (row.voided) return { ok: false, message: '通行授权已作废' };

  const decorated = decorateVisit(row);
  if (action === 'checkIn') {
    if (!decorated.canCheckIn) {
      return { ok: false, message: decorated.checkInStatus === '已签到' ? '已签到，请勿重复操作' : '当前状态不可签到' };
    }
  } else if (!decorated.canCheckOut) {
    return { ok: false, message: '当前状态不可签离' };
  }

  pushGuardVerify(row.id, action, row.name);
  return {
    ok: true,
    message: action === 'checkIn' ? '签到成功' : '签离成功',
    visit: decorateVisit(row)
  };
}

function getDemoScanChoices() {
  const rows = visits.filter(isVisitorListRow).filter(inOrgScope).map(decorateVisit);
  // 扫码签到演示：未签到优先，默认第一项可直接签到
  rows.sort(function (a, b) {
    const rank = function (v) {
      if (v.canCheckIn) return 0;
      if (v.canCheckOut) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });
  return rows.slice(0, 6).map(function (row) {
    const tip = row.canCheckIn ? '未签到·可签到' : (row.checkInStatus || '—');
    return {
      label: (row.visitorName || row.name || '') + ' · ' + (row.visitCode || row.id) + '（' + tip + '）',
      code: row.visitCode || row.id
    };
  });
}

module.exports = {
  prototypeNow: prototypeNow,
  maskMobile: maskMobile,
  normalizePassCode: normalizePassCode,
  listVisitorPass: listVisitorPass,
  listAppointments: listAppointments,
  listInvites: listInvites,
  listAccessibleOrgs: listAccessibleOrgs,
  createInvite: createInvite,
  decideAppointment: decideAppointment,
  listPermissionGroups: listPermissionGroups,
  voidVisitorPass: voidVisitorPass,
  listPassage: listPassage,
  getPassage: getPassage,
  getVisit: getVisit,
  lookupPassCode: lookupPassCode,
  resolveScan: resolveScan,
  confirmPresence: confirmPresence,
  getDemoScanChoices: getDemoScanChoices,
  displayCheckInStatus: displayCheckInStatus,
  displayPassAuthStatus: displayPassAuthStatus,
  /** 兼容旧调用名 */
  listTodayPending: function (q) { return listVisitorPass(q); },
  listRecords: function (q) { return listPassage(q); },
  verifyAndCheckIn: function (payload) {
    const scanned = resolveScan(payload);
    if (!scanned.ok) return scanned;
    return { ok: true, message: '已识别通行凭证', visit: scanned.visit, redirect: true };
  }
};
