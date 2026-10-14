/** 与 PC 端用户管理演示数据对齐 */
module.exports = {
  admin: {
    id: 'admin',
    name: '系统管理员',
    position: '平台管理员',
    dept: '大连国际航运中心大厦',
    orgId: 'ORG-ROOT',
    role: '超级管理员',
    userGroups: []
  },
  zhangsan: {
    id: 'zhangsan',
    name: '张三',
    position: '安保部主管',
    dept: '安保部',
    orgId: 'ORG-002',
    role: '安保主管',
    userGroups: ['监控中心值班组']
  },
  lisi: {
    id: 'lisi',
    name: '李四',
    position: '设备运维工程师',
    dept: '工程部',
    orgId: 'ORG-003',
    role: '运维工程师',
    userGroups: ['工程维修组']
  },
  zhaoliu: {
    id: 'zhaoliu',
    name: '赵六',
    position: '暖通运维工程师',
    dept: '工程部',
    orgId: 'ORG-003',
    role: '运维工程师',
    userGroups: ['工程维修组']
  },
  chenliu: {
    id: 'chenliu',
    name: '陈六',
    position: '安保专员',
    dept: '安保部',
    orgId: 'ORG-002',
    role: '安保主管',
    userGroups: []
  },
  wangwu: {
    id: 'wangwu',
    name: '王五',
    position: '客服专员',
    dept: '客服部',
    orgId: 'ORG-004',
    role: '普通用户',
    userGroups: []
  }
};
