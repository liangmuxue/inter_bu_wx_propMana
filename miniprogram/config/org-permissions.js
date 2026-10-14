/** 与 PC settings-user.js ROLE_PERMISSIONS / USER_GROUP_MEMBERS 对齐 */
const ORGS = {
  'ORG-001': { id: 'ORG-001', name: '物业管理部' },
  'ORG-002': { id: 'ORG-002', name: '安保部' },
  'ORG-003': { id: 'ORG-003', name: '工程部' },
  'ORG-004': { id: 'ORG-004', name: '客服部' }
};

/** 区域主数据（演示，与 PC 区域树常用节点对齐） */
const REGIONS = {
  'AR-ROOT': { id: 'AR-ROOT', name: '大连国际航运中心大厦' },
  'AR-B1': { id: 'AR-B1', name: '地下一层' },
  'AR-15F': { id: 'AR-15F', name: '15层' },
  'AR-15F-A': { id: 'AR-15F-A', name: '15层A区' },
  'AR-PARK': { id: 'AR-PARK', name: '园区外场' },
  'AR-1F': { id: 'AR-1F', name: '1层' }
};

const ROLE_ORG_SCOPES = {
  '超级管理员': { all: true, orgIds: [], regionIds: [] },
  '安保主管': {
    orgIds: ['ORG-002', 'ORG-001'],
    regionIds: ['AR-ROOT', 'AR-B1', 'AR-15F', 'AR-15F-A', 'AR-PARK', 'AR-1F']
  },
  '运维工程师': {
    orgIds: ['ORG-003'],
    regionIds: ['AR-B1', 'AR-15F']
  },
  '普通用户': { orgIds: [], regionIds: [] }
};

const USER_GROUP_MEMBERS = {
  '监控中心值班组': ['zhangsan'],
  '工程维修组': ['lisi', 'zhaoliu'],
  '客服接待组': []
};

/** 用户组继承的角色（演示：组内共享该角色数据权限） */
const USER_GROUP_ROLE = {
  '监控中心值班组': '安保主管',
  '工程维修组': '运维工程师',
  '客服接待组': '普通用户'
};

function findRegionIdByName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  const hit = Object.keys(REGIONS).find(function (id) {
    return REGIONS[id].name === n;
  });
  return hit || '';
}

module.exports = {
  ORGS,
  REGIONS,
  ROLE_ORG_SCOPES,
  USER_GROUP_MEMBERS,
  USER_GROUP_ROLE,
  findRegionIdByName
};
