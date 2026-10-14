/**
 * 备品领用（对齐 PC device-spare 领用侧）
 * - 数据权限：按物料所属组织（org only，不含区域）
 * - 库存：申请冻结 → 通过扣减 → 驳回回滚
 */
const session = require('../store/session');
const env = require('../config/env');
const mockUsers = require('../config/mock-users');
const orgPerm = require('../config/org-permissions');
const dataScope = require('../utils/data-scope');
const pagePerm = require('../config/page-permissions');

const SPARE_LEDGER_PAGE_ID = 'spare-ledger';
const SPARE_USAGE_PAGE_ID = 'spare-usage';
const USAGE_PENDING = '待审批';
const USAGE_APPROVED = '派发审批通过';
const USAGE_REJECTED = '派发审批驳回';

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function nowStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function dateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function currentUser() {
  const u = session.getUser();
  if (u && u.id) return u;
  return mockUsers[env.mockUserId] || mockUsers.lisi;
}

function syncSpareStock(item) {
  item.availableStock = Math.max(0, +item.availableStock || 0);
  item.frozenStock = Math.max(0, +item.frozenStock || 0);
  item.totalStock = item.availableStock + item.frozenStock;
  return item;
}

function normalizeUsageStatus(status) {
  if (status === '待审核') return USAGE_PENDING;
  if (status === '已通过') return USAGE_APPROVED;
  if (status === '已驳回') return USAGE_REJECTED;
  return status || USAGE_PENDING;
}

function normalizeUsageRecord(rec) {
  rec = rec || {};
  return {
    id: rec.id || '',
    code: rec.code || '',
    spareId: rec.spareId || '',
    spareCode: rec.spareCode || '',
    spareName: rec.spareName || '',
    spareUnit: rec.spareUnit || '',
    qty: Math.max(0, +rec.qty || 0),
    remark: rec.remark || '',
    status: normalizeUsageStatus(rec.status),
    applicantAccount: rec.applicantAccount || '',
    applicantName: rec.applicantName || '',
    applicantOrg: rec.applicantOrg || '',
    useOrgId: rec.useOrgId || '',
    useOrgName: rec.useOrgName || '',
    useRegionId: rec.useRegionId || '',
    useRegionName: rec.useRegionName || '',
    approverAccount: rec.approverAccount || '',
    approverName: rec.approverName || '',
    approverOrg: rec.approverOrg || '',
    auditRemark: rec.auditRemark || '',
    createdAt: rec.createdAt || '',
    auditedAt: rec.auditedAt || ''
  };
}

const LEDGER = [
  syncSpareStock({
    id: 'sp-1', code: 'WL-20260515-001', name: '空调滤网', categoryId: 'spcat-3', categoryName: '暖通备件',
    brand: '3M', model: '600×600', orgId: 'ORG-003', orgName: '工程部',
    regionId: 'AR-ROOT', regionName: '大连国际航运中心大厦',
    location: 'B1仓库A区货架3层', availableStock: 48, frozenStock: 4, unit: '个',
    remark: 'AHU 常用规格', createdAt: '2026-05-15 14:20:00', updatedAt: '2026-05-30 10:00:00'
  }),
  syncSpareStock({
    id: 'sp-2', code: 'WL-20260516-001', name: '深沟球轴承', categoryId: 'spcat-1', categoryName: '机械备件',
    brand: 'SKF', model: '6205-2RS', orgId: 'ORG-003', orgName: '工程部',
    regionId: 'AR-ROOT', regionName: '大连国际航运中心大厦',
    location: 'B1仓库B区', availableStock: 8, frozenStock: 0, unit: '个',
    remark: '', createdAt: '2026-05-16 09:30:00', updatedAt: '2026-05-16 09:30:00'
  }),
  syncSpareStock({
    id: 'sp-3', code: 'WL-20260620-001', name: '接触器', categoryId: 'spcat-2', categoryName: '电气备件',
    brand: '施耐德', model: 'LC1D09M7C', orgId: 'ORG-001', orgName: '物业管理部',
    regionId: 'AR-ROOT', regionName: '大连国际航运中心大厦',
    location: 'B2电气库房', availableStock: 14, frozenStock: 3, unit: '个',
    remark: '22kW 以下电机', createdAt: '2026-06-20 16:45:00', updatedAt: '2026-07-08 11:20:00'
  })
];

let usages = [
  normalizeUsageRecord({
    id: 'sus-1', code: 'LY-20260530-002', spareId: 'sp-1', spareCode: 'WL-20260515-001', spareName: '空调滤网', spareUnit: '个',
    qty: 4, remark: 'AHU-028 滤网更换', status: USAGE_PENDING,
    applicantAccount: 'lisi', applicantName: '李四', applicantOrg: '工程部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    createdAt: '2026-05-30 08:30:00'
  }),
  normalizeUsageRecord({
    id: 'sus-4', code: 'LY-20260708-001', spareId: 'sp-3', spareCode: 'WL-20260620-001', spareName: '接触器', spareUnit: '个',
    qty: 3, remark: '配电室备用接触器补充', status: USAGE_PENDING,
    applicantAccount: 'zhangsan', applicantName: '张三', applicantOrg: '安保部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    createdAt: '2026-07-08 11:20:00'
  }),
  normalizeUsageRecord({
    id: 'sus-2', code: 'LY-20260529-001', spareId: 'sp-2', spareCode: 'WL-20260516-001', spareName: '深沟球轴承', spareUnit: '个',
    qty: 2, remark: 'B2 水泵维修更换轴承', status: USAGE_APPROVED,
    applicantAccount: 'zhangsan', applicantName: '张三', applicantOrg: '安保部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    approverAccount: 'admin', approverName: '系统管理员', approverOrg: '大连国际航运中心大厦',
    auditRemark: '同意领用', createdAt: '2026-05-29 14:20:00', auditedAt: '2026-05-29 15:00:00'
  }),
  normalizeUsageRecord({
    id: 'sus-5', code: 'LY-20260528-001', spareId: 'sp-1', spareCode: 'WL-20260515-001', spareName: '空调滤网', spareUnit: '个',
    qty: 6, remark: 'AHU-015 滤网周期性更换', status: USAGE_APPROVED,
    applicantAccount: 'zhaoliu', applicantName: '赵六', applicantOrg: '工程部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    approverAccount: 'admin', approverName: '系统管理员', approverOrg: '大连国际航运中心大厦',
    auditRemark: '同意，按维保计划领用', createdAt: '2026-05-28 09:00:00', auditedAt: '2026-05-28 10:15:00'
  }),
  normalizeUsageRecord({
    id: 'sus-3', code: 'LY-20260622-001', spareId: 'sp-3', spareCode: 'WL-20260620-001', spareName: '接触器', spareUnit: '个',
    qty: 2, remark: '客梯机房控制柜接触器更换', status: USAGE_REJECTED,
    applicantAccount: 'lisi', applicantName: '李四', applicantOrg: '工程部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    approverAccount: 'admin', approverName: '系统管理员', approverOrg: '大连国际航运中心大厦',
    auditRemark: '现场核实暂不需要更换，驳回申请', createdAt: '2026-06-22 09:10:00', auditedAt: '2026-06-22 10:30:00'
  }),
  normalizeUsageRecord({
    id: 'sus-6', code: 'LY-20260618-001', spareId: 'sp-2', spareCode: 'WL-20260516-001', spareName: '深沟球轴承', spareUnit: '个',
    qty: 1, remark: '地下车库排污泵轴承备用', status: USAGE_REJECTED,
    applicantAccount: 'zhaoliu', applicantName: '赵六', applicantOrg: '工程部',
    useOrgId: 'ORG-003', useOrgName: '工程部', useRegionId: 'AR-ROOT', useRegionName: '大连国际航运中心大厦',
    approverAccount: 'admin', approverName: '系统管理员', approverOrg: '大连国际航运中心大厦',
    auditRemark: '该型号库存紧张，建议改用同等规格 SKF 6204', createdAt: '2026-06-18 15:40:00', auditedAt: '2026-06-18 16:20:00'
  })
];

function findSpare(idOrCode) {
  if (!idOrCode) return null;
  const key = String(idOrCode);
  return LEDGER.find(function (s) { return s.id === key || s.code === key; }) || null;
}

/** 同 PC：仅按物料所属组织匹配数据权限 */
function spareInDataScope(spare, user) {
  if (!spare) return false;
  const scope = dataScope.resolveDataScope(user || currentUser());
  if (scope.all) return true;
  if (!(spare.orgId || spare.orgName)) return true;
  if (!(scope.orgIds || []).length) return false;
  return dataScope.matchesDataScope(scope, {
    orgId: spare.orgId || '',
    orgName: spare.orgName || ''
  });
}

function usageInDataScope(rec, user) {
  return spareInDataScope(findSpare(rec && (rec.spareId || rec.spareCode)), user);
}

function isUsageMine(rec, user) {
  user = user || currentUser();
  if (!rec || !user) return false;
  return !!(
    (rec.applicantAccount && rec.applicantAccount === user.id) ||
    (rec.applicantName && rec.applicantName === user.name)
  );
}

function statusClass(status) {
  if (status === USAGE_APPROVED) return 'tag-success';
  if (status === USAGE_REJECTED) return 'tag-danger';
  if (status === USAGE_PENDING) return 'tag-warning';
  return 'tag-info';
}

function formatApplicant(rec) {
  if (!rec) return '—';
  const name = rec.applicantName || '—';
  const account = rec.applicantAccount || '';
  return account ? (name + '（' + account + '）') : name;
}

function enrichUsage(rec, user) {
  user = user || currentUser();
  const item = clone(normalizeUsageRecord(rec));
  const canView = pagePerm.canPageAction(user.role, SPARE_USAGE_PAGE_ID, 'view');
  const canAudit = pagePerm.canPageAction(user.role, SPARE_USAGE_PAGE_ID, 'audit');
  const pending = item.status === USAGE_PENDING;
  item.statusClass = statusClass(item.status);
  item.applicantDisplay = formatApplicant(item);
  item.approverDisplay = item.approverAccount
    ? ((item.approverName || '—') + '（' + item.approverAccount + '）')
    : '—';
  item.qtyText = item.qty + (item.spareUnit ? (' ' + item.spareUnit) : '');
  item.remarkText = item.remark || '—';
  item.auditRemarkText = item.auditRemark || '—';
  item.useOrgNameText = item.useOrgName || '—';
  item.useRegionNameText = item.useRegionName || '—';
  item.auditedAtText = item.auditedAt || '—';
  item.isPending = pending;
  item.canView = canView;
  item.canApprove = canView && canAudit && pending && usageInDataScope(item, user);
  item.hasActions = !!(item.canView || item.canApprove);
  return item;
}

function nextUsageCode(list) {
  const day = dateStr().replace(/-/g, '');
  const prefix = 'LY-' + day + '-';
  let max = 0;
  (list || []).forEach(function (r) {
    if ((r.code || '').indexOf(prefix) === 0) {
      const n = +r.code.slice(prefix.length);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  });
  return prefix + String(max + 1).padStart(3, '0');
}

function listSelectableSpares() {
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_LEDGER_PAGE_ID, 'view')) {
    return [];
  }
  return LEDGER
    .filter(function (s) {
      return spareInDataScope(s, user) && s.availableStock > 0;
    })
    .map(function (s) {
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        unit: s.unit || '',
        availableStock: s.availableStock,
        orgName: s.orgName || '',
        regionName: s.regionName || '',
        location: s.location || '',
        brand: s.brand || '',
        model: s.model || '',
        categoryName: s.categoryName || '',
        label: s.code + ' · ' + s.name + '（可用 ' + s.availableStock + (s.unit || '') + '）'
      };
    });
}

function getOrgOptionsForApply() {
  const user = currentUser();
  const scope = dataScope.resolveDataScope(user);
  const all = Object.keys(orgPerm.ORGS).map(function (id) { return orgPerm.ORGS[id]; });
  if (scope.all) return all;
  if (!(scope.orgIds || []).length) {
    const mine = all.filter(function (o) { return o.id === user.orgId; });
    return mine.length ? mine : all;
  }
  return all.filter(function (o) { return (scope.orgIds || []).indexOf(o.id) >= 0; });
}

function getRegionOptionsForApply() {
  const user = currentUser();
  const scope = dataScope.resolveDataScope(user);
  const all = Object.keys(orgPerm.REGIONS).map(function (id) { return orgPerm.REGIONS[id]; });
  if (scope.all) return all;
  if (!(scope.regionIds || []).length) return all;
  const filtered = all.filter(function (r) { return (scope.regionIds || []).indexOf(r.id) >= 0; });
  return filtered.length ? filtered : all;
}

function listUsages(filter, scope, query) {
  query = query || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_USAGE_PAGE_ID, 'view')) {
    return [];
  }
  const tab = scope === 'mine' ? 'mine' : 'org';
  const statusFilter = query.status != null && query.status !== ''
    ? query.status
    : (filter || 'all');
  const keyword = String(query.keyword || '').trim().toLowerCase();
  let list = usages.filter(function (r) {
    if (tab === 'mine') return isUsageMine(r, user);
    return usageInDataScope(r, user);
  });
  if (statusFilter && statusFilter !== 'all') {
    list = list.filter(function (r) { return r.status === statusFilter; });
  }
  if (keyword) {
    list = list.filter(function (r) {
      const blob = [
        r.code, r.spareCode, r.spareName, r.applicantName, r.applicantAccount,
        r.applicantOrg, r.useOrgName, r.useRegionName, r.remark, r.approverName, r.auditRemark
      ].join(' ').toLowerCase();
      return blob.indexOf(keyword) >= 0;
    });
  }
  return list
    .slice()
    .sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    })
    .map(function (r) { return enrichUsage(r, user); });
}

function getUsage(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_USAGE_PAGE_ID, 'view')) return null;
  const item = usages.find(function (r) { return r.id === key || r.code === key; });
  if (!item) return null;
  if (!isUsageMine(item, user) && !usageInDataScope(item, user)) return null;
  return enrichUsage(item, user);
}

function submitUsage(payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_LEDGER_PAGE_ID, 'view')) {
    return { ok: false, message: '当前账号无领用申请权限' };
  }
  const spare = findSpare(payload.spareId || payload.spareCode);
  if (!spare) return { ok: false, message: '请选择物料' };
  if (!spareInDataScope(spare, user)) {
    return { ok: false, message: '该物料不在您的数据权限范围内' };
  }
  const qty = Math.floor(+payload.qty || 0);
  if (!qty || qty < 1) return { ok: false, message: '领用数量须为 1 及以上的整数' };
  if (spare.availableStock <= 0) return { ok: false, message: '该物料可用库存不足' };
  if (qty > spare.availableStock) {
    return { ok: false, message: '领用数量不可超过可用库存（' + spare.availableStock + '）' };
  }
  const useOrgId = String(payload.useOrgId || '').trim();
  const useRegionId = String(payload.useRegionId || '').trim();
  const useOrg = orgPerm.ORGS[useOrgId];
  const useRegion = orgPerm.REGIONS[useRegionId];
  if (useOrgId && !useOrg) return { ok: false, message: '所选领用组织不可用' };
  if (useRegionId && !useRegion) return { ok: false, message: '所选领用区域不可用' };
  const remark = String(payload.remark || '').trim();
  if (remark.length > 200) return { ok: false, message: '备注不可超过 200 字' };

  spare.availableStock -= qty;
  spare.frozenStock += qty;
  syncSpareStock(spare);
  spare.updatedAt = nowStr();

  const profile = dataScope.getUserProfile(user.id) || user;
  const row = normalizeUsageRecord({
    id: 'sus-' + Date.now(),
    code: nextUsageCode(usages),
    spareId: spare.id,
    spareCode: spare.code,
    spareName: spare.name,
    spareUnit: spare.unit,
    qty: qty,
    remark: remark,
    status: USAGE_PENDING,
    applicantAccount: user.id,
    applicantName: user.name || user.id,
    applicantOrg: profile.dept || profile.orgName || '',
    useOrgId: useOrgId,
    useOrgName: useOrg ? useOrg.name : '',
    useRegionId: useRegionId,
    useRegionName: useRegion ? useRegion.name : '',
    createdAt: nowStr()
  });
  usages.unshift(row);
  return { ok: true, message: '领用申请已提交，等待派发审批', usage: enrichUsage(row, user) };
}

function auditUsage(id, payload) {
  payload = payload || {};
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_USAGE_PAGE_ID, 'audit')) {
    return { ok: false, message: '当前账号无派发审批权限' };
  }
  const rec = usages.find(function (r) { return r.id === id || r.code === id; });
  if (!rec) return { ok: false, message: '领用记录不存在' };
  if (rec.status !== USAGE_PENDING) return { ok: false, message: '该记录不可审批' };
  if (!usageInDataScope(rec, user)) {
    return { ok: false, message: '该物料不在您的数据权限范围内' };
  }
  const result = String(payload.auditResult || payload.result || '').trim();
  if (result !== USAGE_APPROVED && result !== USAGE_REJECTED) {
    return { ok: false, message: '请选择审批结果' };
  }
  const auditRemark = String(payload.auditRemark || '').trim();
  if (auditRemark.length > 200) return { ok: false, message: '派发审批备注不可超过 200 字' };

  const spare = findSpare(rec.spareId || rec.spareCode);
  if (!spare) return { ok: false, message: '关联物料不存在' };

  if (result === USAGE_APPROVED) {
    spare.frozenStock = Math.max(0, spare.frozenStock - rec.qty);
    syncSpareStock(spare);
    rec.status = USAGE_APPROVED;
  } else {
    spare.frozenStock = Math.max(0, spare.frozenStock - rec.qty);
    spare.availableStock += rec.qty;
    syncSpareStock(spare);
    rec.status = USAGE_REJECTED;
  }
  spare.updatedAt = nowStr();
  const profile = dataScope.getUserProfile(user.id) || user;
  rec.approverAccount = user.id;
  rec.approverName = user.name || user.id;
  rec.approverOrg = profile.dept || profile.orgName || '';
  rec.auditRemark = auditRemark;
  rec.auditedAt = nowStr();
  return {
    ok: true,
    message: result === USAGE_APPROVED ? '派发审批已通过' : '派发审批已驳回',
    usage: enrichUsage(rec, user)
  };
}

function canAddUsage() {
  return pagePerm.canPageAction(currentUser().role, SPARE_LEDGER_PAGE_ID, 'view');
}

function enrichSpare(spare) {
  if (!spare) return null;
  syncSpareStock(spare);
  const item = clone(spare);
  item.availableStockText = item.availableStock + (item.unit ? (' ' + item.unit) : '');
  item.frozenStockText = item.frozenStock + (item.unit ? (' ' + item.unit) : '');
  item.totalStockText = item.totalStock + (item.unit ? (' ' + item.unit) : '');
  item.categoryNameText = item.categoryName || '—';
  item.brandText = item.brand || '—';
  item.modelText = item.model || '—';
  item.unitText = item.unit || '—';
  item.orgNameText = item.orgName || '—';
  item.regionNameText = item.regionName || '—';
  item.locationText = item.location || '—';
  item.remarkText = item.remark || '—';
  item.createdAtText = item.createdAt || '—';
  item.updatedAtText = item.updatedAt || '—';
  return item;
}

/** 备品台账详情：组织权限内，或本人有关联领用单时只读可见 */
function getSpare(idOrCode) {
  const user = currentUser();
  if (!pagePerm.canPageAction(user.role, SPARE_LEDGER_PAGE_ID, 'view')) return null;
  const spare = findSpare(idOrCode);
  if (!spare) return null;
  if (spareInDataScope(spare, user)) return enrichSpare(spare);
  const linkedMine = usages.some(function (r) {
    if (!r) return false;
    if (r.spareId !== spare.id && r.spareCode !== spare.code) return false;
    return isUsageMine(r, user);
  });
  if (linkedMine) return enrichSpare(spare);
  return null;
}

module.exports = {
  USAGE_PENDING: USAGE_PENDING,
  USAGE_APPROVED: USAGE_APPROVED,
  USAGE_REJECTED: USAGE_REJECTED,
  listUsages: listUsages,
  getUsage: getUsage,
  getSpare: getSpare,
  listSelectableSpares: listSelectableSpares,
  getOrgOptionsForApply: getOrgOptionsForApply,
  getRegionOptionsForApply: getRegionOptionsForApply,
  submitUsage: submitUsage,
  auditUsage: auditUsage,
  canAddUsage: canAddUsage
};
