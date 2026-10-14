/** 班组排班演示数据（对齐 PC #guardScheduleTableBody，支持同日多人） */
module.exports = [
  {
    id: 'BZ-001',
    name: '日班内圈-A组',
    orgId: 'ORG-002',
    orgName: '安保部',
    config: {
      mode: 'cycle',
      cycle: {
        startDate: '2026-06-01',
        members: [
          { ids: ['zhangsan', 'chenliu'], names: ['张三', '陈六'], days: 2 },
          { ids: ['lisi'], names: ['李四'], days: 1 }
        ]
      },
      week: { '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '' },
      month: {}
    },
    linkedPlans: ['全楼消防周检']
  },
  {
    id: 'BZ-002',
    name: '综合保障组',
    orgId: 'ORG-003',
    orgName: '工程部',
    config: {
      mode: 'week',
      cycle: { startDate: '', members: [] },
      week: {
        '1': ['lisi', 'zhaoliu'],
        '2': ['lisi'],
        '3': ['lisi', 'zhaoliu'],
        '4': ['lisi'],
        '5': ['lisi', 'zhaoliu'],
        '6': ['zhaoliu'],
        '7': ['zhaoliu']
      },
      month: {}
    },
    linkedPlans: ['暖通设备周检', 'B2 机房日检']
  },
  {
    id: 'BZ-004',
    name: '工程夜巡组',
    orgId: 'ORG-003',
    orgName: '工程部',
    config: {
      mode: 'cycle',
      cycle: {
        startDate: '2026-06-01',
        members: [
          { ids: ['lisi', 'zhaoliu'], names: ['李四', '赵六'], days: 2 }
        ]
      },
      week: { '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': '' },
      month: {}
    },
    linkedPlans: []
  },
  {
    id: 'BZ-003',
    name: '客服值班组',
    orgId: 'ORG-004',
    orgName: '客服部',
    config: {
      mode: 'week',
      cycle: { startDate: '', members: [] },
      week: {
        '1': ['wangwu'],
        '2': ['wangwu'],
        '3': ['wangwu'],
        '4': ['wangwu'],
        '5': ['wangwu'],
        '6': [],
        '7': []
      },
      month: {}
    },
    linkedPlans: []
  }
];
