/**
 * 平台移动端功能入口（对齐 dalian-shipping-smart-ops）
 */
module.exports = [
  {
    id: 'workorder',
    title: '工单服务',
    desc: '区域工单查看与现场处理',
    color: '#DD6B20',
    phase: 1,
    entries: [
      { id: 'wo-mine', name: '区域工单', path: '/packages/workorder/list/index', type: 'navigate' }
    ]
  },
  {
    id: 'patrol',
    title: '巡查管控',
    desc: '巡检任务、现场打卡、问题流转',
    color: '#1A5FDB',
    phase: 1,
    entries: [
      { id: 'patrol-tasks', name: '巡检任务', path: '/packages/patrol/task-list/index', type: 'navigate' },
      { id: 'patrol-issues', name: '巡检问题', path: '/packages/patrol/issue-list/index', type: 'navigate' },
      { id: 'patrol-report', name: '临时上报', path: '/packages/patrol/issue-report/index', type: 'navigate' },
      { id: 'patrol-schedule', name: '班组排班', path: '/packages/patrol/schedule/index', type: 'navigate' }
    ]
  },
  {
    id: 'device',
    title: '资产管理',
    desc: '资产盘点、备品领用、资产报修、扫码查资产',
    color: '#3182CE',
    phase: 1,
    entries: [
      { id: 'dev-inventory', name: '资产盘点', path: '/packages/device/inventory-list/index', type: 'navigate' },
      { id: 'dev-repair', name: '发起报修', path: '/packages/device/repair-create/index', type: 'navigate' },
      { id: 'dev-repair-list', name: '资产报修', path: '/packages/device/repair-list/index', type: 'navigate' },
      { id: 'dev-repair-wo', name: '报修工单', path: '/packages/device/repair-workorder-list/index', type: 'navigate' },
      { id: 'dev-scan', name: '扫码/NFC查资产', action: 'scanAsset', type: 'action' },
      { id: 'dev-spare', name: '备品领用', path: '/packages/device/spare-list/index', type: 'navigate' }
    ]
  },
  {
    id: 'visitor',
    title: '访客管理',
    desc: '扫码核验、预约审批、员工邀约、访客列表、通行记录',
    color: '#38A169',
    phase: 1,
    entries: [
      { id: 'vis-verify', name: '扫码核验', path: '/packages/visitor/verify-result/index', type: 'navigate' },
      { id: 'vis-appointment', name: '访客预约', path: '/packages/visitor/appointment-list/index', type: 'navigate' },
      { id: 'vis-invite', name: '员工邀约', path: '/packages/visitor/invite-list/index', type: 'navigate' },
      { id: 'vis-list', name: '访客列表', path: '/packages/visitor/visitor-list/index', type: 'navigate' },
      { id: 'vis-passage', name: '通行记录', path: '/packages/visitor/passage-list/index', type: 'navigate' }
    ]
  },
  {
    id: 'space',
    title: '会议室管理',
    desc: '预约看板、预约记录、费用统计与会议室占用查看',
    color: '#805AD5',
    phase: 1,
    entries: [
      { id: 'space-board', name: '预约看板', path: '/packages/space/board/index', type: 'navigate' },
      { id: 'space-records', name: '预约记录', path: '/packages/space/record-list/index', type: 'navigate' },
      { id: 'space-fee-stats', name: '费用统计', path: '/packages/space/fee-stats/index', type: 'navigate' }
    ]
  }
];
