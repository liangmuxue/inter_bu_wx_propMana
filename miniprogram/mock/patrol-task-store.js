/** 巡检任务子项 Mock 数据与运行时状态（对齐 PC patrol-control.js） */
const dataScope = require('../utils/data-scope');
const patrolFormat = require('../utils/patrol-format');
const patrolRefImage = require('../utils/patrol-ref-image');
const patrolDevice = require('../utils/patrol-device');

const GUARD_POINT_MAP = {
  'GP-001': { id: 'GP-001', name: '1F 大堂', type: '门禁', location: '1F 主入口', deviceId: 'DEV-ACS-001', scanCode: 'GP-001', kind: '地点类' },
  'GP-002': { id: 'GP-002', name: 'B2 机房入口', type: '二维码', location: 'B2 层西侧', scanCode: 'GP-002', kind: '地点类' },
  'GP-003': { id: 'GP-003', name: '外广场北侧', type: 'NFC标签', location: '外围北侧', scanCode: 'GP-003', kind: '地点类' },
  'GP-004': { id: 'GP-004', name: '配电间', type: 'NFC标签', location: 'B2 配电间', scanCode: 'GP-004', kind: '地点类' },
  'GP-005': { id: 'GP-005', name: 'UPS 间', type: '二维码', location: 'B2 UPS 室', scanCode: 'GP-005', kind: '地点类' },
  'ZC-20260530-001': {
    id: 'ZC-20260530-001', name: '离心式冷水机组', type: '二维码', location: 'B2 机房',
    scanCode: 'ZC-20260530-001', kind: '资产类', assetId: 'ast-001'
  },
  'ZC-20260618-007': {
    id: 'ZC-20260618-007', name: '冷却塔 1#', type: 'NFC标签', location: '屋面冷却塔区',
    scanCode: 'ZC-20260618-007', kind: '资产类', assetId: 'ast-007'
  },
  'ZC-20260620-010': {
    id: 'ZC-20260620-010', name: '低压配电柜 A1', type: 'NFC标签', location: 'B1 配电室 A列',
    scanCode: 'ZC-20260620-010', kind: '资产类', assetId: 'ast-010'
  }
};

const ITEM_SPECS = {
  'PI-001': { method: '现场', standard: '无堆放物、标识清晰', hasRefImage: true, guardConfig: { sourceMode: 'points', orderMode: 'sequential', pointIds: ['GP-001', 'GP-002'] } },
  'PI-002': { method: '远程', standard: '温度≤35℃ 湿度≤75%', hasRefImage: true, videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'] },
  'PI-003': { method: '自动', standard: '0.4~0.6 MPa', hasRefImage: true, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128' },
  'PI-004': { method: '现场', standard: '箱门完好、水带齐全', hasRefImage: true, guardConfig: { sourceMode: 'route', routeId: 'RT-001', orderMode: 'random', pointIds: ['GP-001', 'GP-002', 'GP-003'] } },
  'PI-005': { method: '现场', standard: '环境整洁、无异味、温湿度正常；核对资产标签', hasRefImage: true, guardConfig: { sourceMode: 'points', orderMode: 'sequential', pointIds: ['GP-002', 'ZC-20260530-001', 'ZC-20260618-007'] } },
  'PI-006': { method: '自动', standard: '负载正常、无告警', aiModel: 'UPS运行监测', aiChannels: 'DEV-CAM-128, DEV-CAM-502' },
  'PI-007': { method: '远程', standard: '画面清晰、通道无遮挡', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'] },
  'PI-008': { method: '远程', standard: '人流正常、无异常滞留', videoDevices: ['DEV-CAM-101', 'DEV-CAM-502'] },
  'PI-009': { method: '远程', standard: '出风温度 16~22℃', videoDevices: ['DEV-CAM-502'] },
  'PI-010': { method: '现场', standard: '设备运行平稳；扫资产标签完成打卡', hasRefImage: true, guardConfig: { sourceMode: 'points', orderMode: 'sequential', pointIds: ['ZC-20260620-010', 'GP-001'] } },
  'PI-011': { method: '自动', standard: '静压差正常', aiModel: '设备运行监测', aiChannels: 'DEV-CAM-128' }
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nowStr() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

const INITIAL_SUBTASKS = {
  'TK-20260530-100': [
    {
      code: 'ST-100-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      hasRefImage: true,
      refImage: {
        itemId: 'PI-002',
        itemName: '配电室温湿度',
        tone: 'env',
        caption: '配电室温湿度读数正常，监控画面清晰可对照'
      }
    },
    {
      code: 'ST-100-02', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: { 'GP-002': '2026-05-30 08:20:00', 'GP-004': '2026-05-30 08:35:00' },
      guardPointResults: {
        'GP-002': { result: '正常', remark: '入口正常', issues: [] },
        'GP-004': { result: '正常', remark: '配电间正常', issues: [] }
      }
    },
    {
      code: 'ST-100-03', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260530-R01': [
    {
      code: 'ST-R01-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-30 13:18', result: '正常',
      remark: '原执行人李四已完成，转派后进度保留', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'lisi', completedBySystem: false
    },
    {
      code: 'ST-R01-02', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: { 'GP-002': '2026-05-30 13:25', 'GP-004': '2026-05-30 13:40' },
      guardPointResults: {}
    },
    {
      code: 'ST-R01-03', itemId: 'PI-006', itemName: 'UPS 运行状态', method: '自动',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: 'UPS运行监测', aiChannels: 'DEV-CAM-128, DEV-CAM-502'
    }
  ],
  'TK-20260530-R02': [
    {
      code: 'ST-R02-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-30 15:42', result: '正常',
      remark: '原执行人张三已完成', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'zhangsan', completedBySystem: false
    },
    {
      code: 'ST-R02-02', itemId: 'PI-007', itemName: 'B1车库视频监控', method: '远程',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-30 15:55', result: '正常',
      remark: '原执行人张三已完成，转派后进度保留', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'zhangsan', completedBySystem: false
    },
    {
      code: 'ST-R02-03', itemId: 'PI-008', itemName: '主入口通行监控', method: '远程',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-101', 'DEV-CAM-502']
    }
  ],
  'TK-20260527-305': [
    {
      code: 'ST-305-01', itemId: 'PI-006', itemName: 'UPS 运行状态', method: '自动',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-27 08:12', result: '正常',
      remark: '算法未识别到异常，系统按正常完成巡检', autoRan: true, algoMissed: true,
      completedBySystem: true, completedById: '', completedByIds: [],
      aiResult: {
        model: '烟火检测', channels: 'DEV-CAM-128, DEV-CAM-502',
        conclusion: '正常', confidence: '0.91',
        detail: '算法分析未发现明显异常，未触发告警规则'
      },
      aiConfidence: '0.91', aiDetail: '算法分析未发现明显异常，未触发告警规则'
    }
  ],
  'TK-20260527-306': [
    {
      code: 'ST-306-01', itemId: 'PI-006', itemName: 'UPS 运行状态', method: '自动',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-27 14:08', result: '异常',
      remark: '算法识别到 UPS 负载偏高', issueDesc: 'UPS 负载超过 80%，存在运行风险',
      autoRan: true, completedBySystem: true, completedById: '', completedByIds: [],
      aiResult: {
        model: '烟火检测', channels: 'DEV-CAM-128, DEV-CAM-502',
        conclusion: '异常', confidence: '0.88',
        detail: '检测到运行指标异常，负载超限'
      },
      aiConfidence: '0.88', aiDetail: '检测到运行指标异常，负载超限',
      issues: [
        { issueNo: 'IS-20260527-306-A', desc: 'UPS 负载超过 80%，存在运行风险' },
        { issueNo: 'IS-20260527-306-B', desc: 'UPS 电池组温度偏高，建议安排检修' }
      ]
    }
  ],
  'TK-20260530-ABN': [
    {
      code: 'ST-ABN-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-30 15:12', result: '异常',
      remark: '远程监控发现温湿度与画面两项异常',
      issueDesc: '配电室湿度 78% 超过标准上限；监控画面存在遮挡',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'lisi', completedByIds: ['lisi'], completedBySystem: false,
      issues: [
        {
          id: 'abn-r1', issueNo: 'IS-20260530-ABN-1',
          desc: '配电室湿度 78%，超过标准上限 75%',
          attachments: [
            { type: 'video', name: '配电室监控录像.mp4', label: '配电室监控录像.mp4', durationSec: 30 }
          ]
        },
        {
          id: 'abn-r2', issueNo: 'IS-20260530-ABN-2',
          desc: '监控画面存在遮挡，无法完整读取温湿度表',
          images: [
            { path: 'https://picsum.photos/seed/patrol-humid/400/400', label: '监控画面截图', name: '监控画面截图' }
          ],
          attachments: []
        }
      ]
    },
    {
      code: 'ST-ABN-02', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-30 15:28', result: '异常',
      remark: '2 个巡更点上报异常',
      issueDesc: '配电间地面有积水；配电柜下方线缆未整理；UPS 间有轻微异味',
      completedById: 'lisi', completedByIds: ['lisi', 'zhaoliu'], completedBySystem: false,
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: {
        'GP-002': '2026-05-30 15:10:00',
        'GP-004': '2026-05-30 15:18:00',
        'GP-005': '2026-05-30 15:28:00'
      },
      guardPointResults: {
        'GP-002': { result: '正常', remark: '入口通道畅通，温湿度读数正常', issues: [], issueDesc: '', completedById: 'lisi' },
        'GP-004': {
          result: '异常', remark: '发现地面积水',
          issueDesc: '配电间地面有积水；配电柜下方线缆未整理',
          completedById: 'zhaoliu',
          issues: [
            {
              id: 'abn-g4-1', desc: '配电间地面有积水，可能存在漏点',
              images: [
                { path: 'https://picsum.photos/seed/patrol-water/400/400', label: '配电间地面积水', name: '配电间地面积水' }
              ],
              attachments: [{ type: 'video', name: '配电间积水.mp4', label: '配电间积水.mp4', durationSec: 15 }]
            },
            { id: 'abn-g4-2', desc: '配电柜下方线缆未整理，存在绊倒隐患' }
          ]
        },
        'GP-005': {
          result: '异常', remark: '环境异常',
          issueDesc: 'UPS 间有轻微异味，待进一步排查',
          completedById: 'lisi',
          issues: [
            {
              id: 'abn-g5-1',
              desc: 'UPS 间有轻微异味，待进一步排查',
              issueDescSource: 'voice+text',
              issueDescVoice: { durationSec: 8, tempFilePath: '', transcript: 'UPS 间有轻微异味' }
            }
          ]
        }
      }
    },
    {
      code: 'ST-ABN-03', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-30 15:35', result: '异常',
      remark: 'AI 分析判定指标超限',
      issueDesc: '压力表读数 0.72 MPa 超出合格区间；关联通道检测到人员靠近设备',
      autoRan: true, completedBySystem: true, completedById: '', completedByIds: [],
      aiModel: '区域入侵', aiChannels: 'DEV-CAM-128',
      aiResult: {
        model: '区域入侵', channels: 'DEV-CAM-128',
        conclusion: '异常', confidence: '0.91',
        detail: '压力表读数超出 0.4~0.6 MPa 标准，同时检测到区域入侵风险'
      },
      aiConfidence: '0.91',
      aiDetail: '压力表读数超出 0.4~0.6 MPa 标准，同时检测到区域入侵风险',
      issues: [
        {
          issueNo: 'IS-20260530-ABN-3',
          desc: '压力表读数 0.72 MPa，超出合格区间 0.4~0.6 MPa',
          images: [
            { path: 'https://picsum.photos/seed/patrol-pressure/400/400', label: '压力表读数截图', name: '压力表读数截图' }
          ]
        },
        { issueNo: 'IS-20260530-ABN-4', desc: '关联通道检测到人员靠近设备，存在安全隐患' }
      ]
    }
  ],
  'TK-20260530-101': [
    {
      code: 'ST-101-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502']
    },
    {
      code: 'ST-101-02', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260528-301': [
    {
      code: 'ST-301-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-28 07:18', result: '正常',
      remark: '监控画面正常', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'zhangsan', completedBySystem: false
    },
    {
      code: 'ST-301-02', itemId: 'PI-007', itemName: 'B1车库视频监控', method: '远程',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-28 07:32', result: '异常',
      remark: '发现通道堆放杂物', issueDesc: 'B1车库入口通道有杂物堆放',
      videoDevices: ['DEV-CAM-128'],
      completedById: 'chenliu', completedBySystem: false,
      issues: [{ issueNo: 'IS-20260528-016', desc: 'B1车库入口通道有杂物堆放' }]
    }
  ],
  'TK-20260530-102': [
    {
      code: 'ST-102-01', itemId: 'PI-004', itemName: '消火栓外观检查', method: '现场',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '',
      guardConfig: clone(ITEM_SPECS['PI-004'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    },
    {
      code: 'ST-102-02', itemId: 'PI-001', itemName: '消防通道畅通', method: '现场',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '',
      guardConfig: clone(ITEM_SPECS['PI-001'].guardConfig),
      guardCheckins: { 'GP-001': '2026-05-30 09:10:00' },
      guardPointResults: { 'GP-001': { result: '正常', remark: '', issues: [] } }
    }
  ],
  'TK-20260530-103': [
    {
      code: 'ST-103-01', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: { 'GP-002': '2026-05-30 11:10:00', 'GP-004': '2026-05-30 11:22:00', 'GP-005': '2026-05-30 11:35:00' },
      guardPointResults: {
        'GP-002': { result: '正常', remark: '', issues: [] },
        'GP-004': { result: '正常', remark: '', issues: [] },
        'GP-005': { result: '正常', remark: '', issues: [] }
      }
    }
  ],
  'TK-20260601-105': [
    {
      code: 'ST-105-01', itemId: 'PI-006', itemName: 'UPS 运行状态', method: '自动',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: 'UPS运行监测', aiChannels: 'DEV-CAM-128, DEV-CAM-502'
    }
  ],
  'TK-20260529-204': [
    {
      code: 'ST-204-01', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '已超时', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    }
  ],
  'TK-20260529-205': [
    {
      code: 'ST-205-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-29 08:35', result: '正常',
      remark: '远程监控正常', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'lisi', completedByIds: ['lisi'], completedBySystem: false,
      hasRefImage: true,
      refImage: {
        itemId: 'PI-002',
        itemName: '配电室温湿度',
        tone: 'env',
        caption: '配电室温湿度读数正常，监控画面清晰可对照'
      }
    },
    {
      code: 'ST-205-02', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '已超时', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: { 'GP-002': '2026-05-29 08:22:00' },
      guardPointResults: { 'GP-002': { result: '正常', remark: '', issues: [] } }
    },
    {
      code: 'ST-205-03', itemId: 'PI-006', itemName: 'UPS 运行状态', method: '自动',
      issueHandlerId: 'lisi', status: '已完成', completedAt: '2026-05-29 08:05', result: '正常',
      remark: '任务开始时系统自动完成分析', autoRan: true,
      completedBySystem: true, completedById: '', completedByIds: [],
      aiResult: {
        model: '烟火检测', channels: 'DEV-CAM-128, DEV-CAM-502',
        conclusion: '正常', confidence: '0.95', detail: '算法分析完成，各项指标正常'
      },
      aiConfidence: '0.95', aiDetail: '算法分析完成，各项指标正常'
    }
  ],
  'TK-20260529-201': [
    {
      code: 'ST-201-01', itemId: 'PI-007', itemName: 'B1车库视频监控', method: '远程',
      issueHandlerId: 'lisi', status: '已超时', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-128']
    },
    {
      code: 'ST-201-02', itemId: 'PI-008', itemName: '主入口通行监控', method: '远程',
      issueHandlerId: 'zhangsan', status: '已超时', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-101', 'DEV-CAM-502']
    }
  ],
  'TK-20260529-203': [
    {
      code: 'ST-203-01', itemId: 'PI-001', itemName: '消防通道畅通', method: '现场',
      issueHandlerId: 'zhangsan', status: '已超时', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-001'].guardConfig),
      guardCheckins: { 'GP-001': '2026-05-29 09:35:00' },
      guardPointResults: { 'GP-001': { result: '正常', remark: '', issues: [] } }
    }
  ],
  'TK-20260528-302': [
    {
      code: 'ST-302-01', itemId: 'PI-008', itemName: '主入口通行监控', method: '远程',
      issueHandlerId: 'zhangsan', status: '已完成', completedAt: '2026-05-28 10:15', result: '正常',
      remark: '人流正常，无异常滞留', videoDevices: ['DEV-CAM-101', 'DEV-CAM-502'],
      completedById: 'zhangsan', completedByIds: ['zhangsan'], completedBySystem: false
    }
  ],
  'TK-20260529-206': [
    {
      code: 'ST-206-01', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'wangwu', status: '已超时', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260530-Z06': [
    {
      code: 'ST-Z06-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      hasRefImage: true,
      refImage: {
        itemId: 'PI-002',
        itemName: '配电室温湿度',
        tone: 'env',
        caption: '赵六专属任务：远程巡检演示'
      }
    },
    {
      code: 'ST-Z06-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      guardCheckins: {},
      guardPointResults: {}
    }
  ],
  'TK-20260530-104': [
    {
      code: 'ST-104-01', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260530-106': [
    {
      code: 'ST-106-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502']
    },
    {
      code: 'ST-106-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    },
    {
      code: 'ST-106-03', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260528-303': [
    {
      code: 'ST-303-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'zhaoliu', status: '已完成', completedAt: '2026-05-28 14:10', result: '正常',
      remark: '温湿度正常', videoDevices: ['DEV-CAM-128'],
      completedById: 'lisi', completedBySystem: false
    },
    {
      code: 'ST-303-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'zhaoliu', status: '已完成', completedAt: '2026-05-28 14:25', result: '正常',
      remark: '运行平稳', guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      completedById: 'zhaoliu', completedByIds: ['lisi', 'zhaoliu'], completedBySystem: false,
      guardCheckins: { 'ZC-20260620-010': '2026-05-28 14:20:00', 'GP-001': '2026-05-28 14:25:00' },
      guardPointResults: {
        'ZC-20260620-010': { result: '正常', remark: '', issues: [], completedById: 'lisi' },
        'GP-001': { result: '正常', remark: '', issues: [], completedById: 'zhaoliu' }
      }
    },
    {
      code: 'ST-303-03', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'zhaoliu', status: '已完成', completedAt: '2026-05-28 14:35', result: '正常',
      remark: 'AI 分析正常', autoRan: true, completedBySystem: true, completedById: '',
      aiResult: {
        model: '区域入侵', channels: 'DEV-CAM-128',
        conclusion: '正常', confidence: '0.94',
        detail: '压力表读数位于合格区间'
      },
      aiConfidence: '0.94', aiDetail: '压力表读数位于合格区间'
    }
  ],
  'TK-20260601-107': [
    {
      code: 'ST-107-01', itemId: 'PI-009', itemName: '空调出风温度', method: '远程',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '',
      videoDevices: ['DEV-CAM-502']
    },
    {
      code: 'ST-107-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    }
  ],
  'TK-20260530-DEMO': [
    {
      code: 'ST-DEMO-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502']
    },
    {
      code: 'ST-DEMO-02', itemId: 'PI-004', itemName: '消火栓外观检查', method: '现场',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-004'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    },
    {
      code: 'ST-DEMO-03', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '区域入侵', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-20260529-DEMO': [
    {
      code: 'ST-DEMO-11', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-29 14:10', result: '正常',
      remark: '对照参考图，温湿度读数正常', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'lisi', completedByIds: ['lisi'], completedBySystem: false
    },
    {
      code: 'ST-DEMO-12', itemId: 'PI-001', itemName: '消防通道畅通', method: '现场',
      issueHandlerId: 'zhangsan', status: '已完成', completedAt: '2026-05-29 14:28', result: '正常',
      remark: '通道畅通无堆放', guardConfig: clone(ITEM_SPECS['PI-001'].guardConfig),
      completedById: 'zhangsan', completedByIds: ['lisi', 'zhangsan'], completedBySystem: false,
      guardCheckins: { 'GP-001': '2026-05-29 14:15:00', 'GP-002': '2026-05-29 14:28:00' },
      guardPointResults: {
        'GP-001': { result: '正常', remark: '', issues: [], completedById: 'lisi' },
        'GP-002': { result: '正常', remark: '', issues: [], completedById: 'zhangsan' }
      }
    },
    {
      code: 'ST-DEMO-13', itemId: 'PI-003', itemName: '锅炉压力表读数', method: '自动',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-05-29 14:05', result: '正常',
      remark: 'AI 分析正常', autoRan: true, completedBySystem: true, completedById: '', completedByIds: [],
      aiResult: {
        model: '区域入侵', channels: 'DEV-CAM-128',
        conclusion: '正常', confidence: '0.93',
        detail: '压力表读数位于合格区间'
      },
      aiConfidence: '0.93', aiDetail: '压力表读数位于合格区间'
    }
  ],
  'TK-PENDING-L01': [
    {
      code: 'ST-PL01-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502']
    },
    {
      code: 'ST-PL01-02', itemId: 'PI-005', itemName: '机房环境检查', method: '现场',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-005'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    }
  ],
  'TK-PENDING-L02': [
    {
      code: 'ST-PL02-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'wangwu', status: '已完成', completedAt: '2026-07-26 09:10', result: '正常',
      remark: '读数正常', videoDevices: ['DEV-CAM-128', 'DEV-CAM-502'],
      completedById: 'lisi', completedBySystem: false
    },
    {
      code: 'ST-PL02-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    },
    {
      code: 'ST-PL02-03', itemId: 'PI-011', itemName: '静压差监测', method: '自动',
      issueHandlerId: 'lisi', status: '待完成', completedAt: '', result: '', remark: '',
      autoRan: false, aiModel: '设备运行监测', aiChannels: 'DEV-CAM-128'
    }
  ],
  'TK-PENDING-L03': [
    {
      code: 'ST-PL03-01', itemId: 'PI-004', itemName: '消火栓外观检查', method: '现场',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '',
      guardConfig: clone(ITEM_SPECS['PI-004'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    },
    {
      code: 'ST-PL03-02', itemId: 'PI-001', itemName: '消防通道畅通', method: '现场',
      issueHandlerId: 'zhangsan', status: '待完成', completedAt: '', result: '',
      guardConfig: clone(ITEM_SPECS['PI-001'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    }
  ],
  'TK-PENDING-Z01': [
    {
      code: 'ST-PZ01-01', itemId: 'PI-002', itemName: '配电室温湿度', method: '远程',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      videoDevices: ['DEV-CAM-128', 'DEV-CAM-502']
    },
    {
      code: 'ST-PZ01-02', itemId: 'PI-010', itemName: '风机运行检查', method: '现场',
      issueHandlerId: 'zhaoliu', status: '待完成', completedAt: '', result: '', remark: '', issueDesc: '',
      guardConfig: clone(ITEM_SPECS['PI-010'].guardConfig),
      guardCheckins: {}, guardPointResults: {}
    }
  ]
};

let runtimeSubtasks = clone(INITIAL_SUBTASKS);

function normalizeCompletedSubtaskActors(sub, fallbackExecutorId) {
  if (!sub || sub.status !== '已完成') return sub;
  if (sub.method === '自动' || sub.autoRan || sub.completedBySystem) {
    sub.completedBySystem = true;
    sub.autoRan = true;
    sub.completedById = '';
    sub.completedByIds = [];
    return sub;
  }
  const results = sub.guardPointResults || {};
  const pointIds = Object.keys(results);
  const fallback = String(sub.completedById || fallbackExecutorId || '').trim();
  if (pointIds.length) {
    pointIds.forEach(function (pid) {
      if (!results[pid]) return;
      if (!results[pid].completedById && fallback) results[pid].completedById = fallback;
    });
    sub.guardPointResults = results;
  }
  const ids = patrolFormat.collectSubtaskActualExecutorIds(sub);
  if (ids.length) {
    sub.completedByIds = ids;
    sub.completedById = ids[ids.length - 1];
    sub.completedBySystem = false;
    return sub;
  }
  if (fallback) {
    sub.completedById = fallback;
    sub.completedByIds = [fallback];
    sub.completedBySystem = false;
  }
  return sub;
}

Object.keys(runtimeSubtasks).forEach(function (taskId) {
  const list = runtimeSubtasks[taskId] || [];
  list.forEach(function (sub) {
    normalizeCompletedSubtaskActors(sub, '');
  });
});

function enrichSubtask(sub) {
  const spec = ITEM_SPECS[sub.itemId] || {};
  const item = Object.assign({}, spec, sub);
  item.issueHandlerName = dataScope.formatUserDisplay(item.issueHandlerId);
  item.completedByName = patrolFormat.formatSubtaskActualExecutorName(item);
  item.standard = item.standard || spec.standard || '—';
  if (!item.guardConfig && spec.guardConfig) item.guardConfig = clone(spec.guardConfig);
  if (!item.videoDevices && spec.videoDevices) item.videoDevices = spec.videoDevices.slice();
  if (!item.aiModel && spec.aiModel) item.aiModel = spec.aiModel;
  if (!item.aiChannels && spec.aiChannels) item.aiChannels = spec.aiChannels;
  item.issues = item.issues || [];
  if (item.result === '异常' && item.issueDesc && !item.issues.length) {
    item.issues = [{ desc: item.issueDesc, issueNo: item.issueNo || '' }];
  }
  if (sub.refImage) {
    item.refImage = clone(sub.refImage);
  } else {
    item.refImage = patrolRefImage.resolve(sub.itemId, sub.itemName);
  }
  return item;
}

function getSubtasks(taskId) {
  const list = runtimeSubtasks[taskId] || [];
  return list.map(enrichSubtask);
}

function findSubtask(taskId, subtaskCode) {
  const list = getSubtasks(taskId);
  return list.find(function (s) { return s.code === subtaskCode; }) || null;
}

function saveSubtask(taskId, subtaskCode, patch) {
  const list = runtimeSubtasks[taskId];
  if (!list) return null;
  const idx = list.findIndex(function (s) { return s.code === subtaskCode; });
  if (idx < 0) return null;
  runtimeSubtasks[taskId][idx] = Object.assign({}, list[idx], patch);
  return enrichSubtask(runtimeSubtasks[taskId][idx]);
}

function isPointComplete(pr, checkin) {
  return !!(checkin && pr && pr.result);
}

function isOnsiteComplete(sub) {
  const cfg = sub.guardConfig || {};
  const ids = cfg.pointIds || [];
  const checkins = sub.guardCheckins || {};
  const results = sub.guardPointResults || {};
  if (!ids.length) return false;
  return ids.every(function (id) {
    return isPointComplete(results[id], checkins[id]);
  });
}

function aggregateOnsiteResult(sub) {
  const results = sub.guardPointResults || {};
  const ids = (sub.guardConfig && sub.guardConfig.pointIds) || [];
  let hasAbnormal = false;
  const descs = [];
  ids.forEach(function (id) {
    const pr = results[id];
    if (pr && pr.result === '异常') {
      hasAbnormal = true;
      if (pr.issueDesc) {
        descs.push(pr.issueDesc);
      } else if (Array.isArray(pr.issues) && pr.issues.length) {
        pr.issues.forEach(function (iss) {
          const text = iss.desc || (iss.issueDescVoice && iss.issueDescVoice.transcript) || '';
          if (text) descs.push(text);
        });
      }
    }
  });
  return {
    result: hasAbnormal ? '异常' : '正常',
    issueDesc: descs.join('；')
  };
}

function submitGuardCheckin(taskId, subtaskCode, payload, currentUser) {
  const sub = findSubtask(taskId, subtaskCode);
  if (!sub) return { ok: false, message: '子项不存在' };

  const cfg = sub.guardConfig || { orderMode: 'sequential', pointIds: [] };
  const pointId = payload.pointId;
  const ordered = cfg.pointIds || [];
  const checkins = Object.assign({}, sub.guardCheckins || {});
  const pointResults = Object.assign({}, sub.guardPointResults || {});
  const actorId = (currentUser && currentUser.id) || payload.completedById || '';
  const existingPr = pointResults[pointId] || {};
  const existingCheckedAt = String(checkins[pointId] || '').trim();
  const now = nowStr();
  const incomingAt = String(payload.checkedAt || now).trim() || now;

  // 同点并发：操作时间优先（已打卡且本次不早于已有时间 → 拒绝）
  if (isPointComplete(existingPr, existingCheckedAt) && incomingAt >= existingCheckedAt) {
    return { ok: false, message: '该巡更点已打卡，以先提交者为准' };
  }

  if (cfg.orderMode !== 'random') {
    const nextIdx = ordered.findIndex(function (id) {
      return !isPointComplete(pointResults[id], checkins[id]);
    });
    if (nextIdx >= 0 && ordered[nextIdx] !== pointId) {
      return { ok: false, message: '请按巡更点顺序依次打卡' };
    }
  }

  checkins[pointId] = incomingAt;
  let normalized = [];

  if (payload.result === '异常') {
    const patrolIssue = require('../utils/patrol-issue');
    const issues = payload.issues || [];
    const check = patrolIssue.validateIssues(issues);
    if (!check.ok) return check;
    normalized = patrolIssue.serializeIssuesForSubmit(issues);
    const issueDesc = normalized.map(function (iss) {
      return iss.desc || (iss.issueDescVoice && iss.issueDescVoice.transcript) ||
        (iss.issueDescVoice ? '（语音描述）' : '');
    }).filter(Boolean).join('；');
    pointResults[pointId] = {
      result: payload.result || '异常',
      remark: payload.remark || '',
      issues: normalized,
      issueDesc: issueDesc,
      completedById: actorId
    };
  } else {
    pointResults[pointId] = {
      result: payload.result || '正常',
      remark: payload.remark || '',
      issues: [],
      issueDesc: '',
      completedById: actorId
    };
  }

  const merged = Object.assign({}, sub, { guardCheckins: checkins, guardPointResults: pointResults });
  const allDone = isOnsiteComplete(merged);
  const agg = aggregateOnsiteResult(merged);
  const patch = {
    guardCheckins: checkins,
    guardPointResults: pointResults,
    status: allDone ? '已完成' : sub.status,
    completedAt: allDone ? incomingAt : (sub.completedAt || ''),
    result: allDone ? agg.result : (sub.result || ''),
    issueDesc: allDone ? agg.issueDesc : (sub.issueDesc || '')
  };
  if (allDone) {
    const actorIds = patrolFormat.collectSubtaskActualExecutorIds(
      Object.assign({}, sub, { guardPointResults: pointResults, completedById: actorId })
    );
    if (actorIds.length) {
      patch.completedByIds = actorIds;
      patch.completedById = actorIds[actorIds.length - 1];
      patch.completedBySystem = false;
    } else if (actorId) {
      patch.completedByIds = [actorId];
      patch.completedById = actorId;
      patch.completedBySystem = false;
    }
  }

  if (payload.result === '异常' && pointResults[pointId].issueDesc) {
    patch.issues = normalized.map(function (iss, idx) {
      return { issueNo: 'IS-' + Date.now() + '-' + idx, desc: iss.desc || pointResults[pointId].issueDesc };
    });
  }

  saveSubtask(taskId, subtaskCode, patch);
  return { ok: true, completed: allDone, subtask: findSubtask(taskId, subtaskCode) };
}

function submitRemoteResult(taskId, subtaskCode, payload, currentUser) {
  const sub = findSubtask(taskId, subtaskCode);
  if (!sub) return { ok: false, message: '子项不存在' };
  const now = nowStr();
  const incomingAt = String(payload.completedAt || now).trim() || now;
  // 同项并发：操作时间优先（已完成且本次不早于已有完成时间 → 拒绝）
  if (sub.status === '已完成' && sub.completedAt && incomingAt >= String(sub.completedAt).trim()) {
    return { ok: false, message: '该巡检项已提交，以先提交者为准' };
  }
  let normalized = [];
  if (payload.result === '异常') {
    const patrolIssue = require('../utils/patrol-issue');
    const issues = payload.issues || [];
    const check = patrolIssue.validateSubtaskIssues(issues);
    if (!check.ok) return check;
    normalized = patrolIssue.serializeIssuesForSubmit(issues);
  }
  const issueDesc = normalized.map(function (iss) { return iss.desc; }).filter(Boolean).join('；');
  const issueImages = normalized.reduce(function (acc, iss) {
    return acc.concat(iss.images || []);
  }, []);
  const actorId = (currentUser && currentUser.id) || payload.completedById || '';
  const patch = {
    result: payload.result,
    remark: payload.remark || '',
    issueDesc: issueDesc,
    issueImages: issueImages,
    status: '已完成',
    completedAt: incomingAt,
    completedById: actorId,
    completedByIds: actorId ? [actorId] : [],
    completedBySystem: false
  };
  if (payload.result === '异常') {
    patch.issues = normalized.map(function (iss, idx) {
      return Object.assign({}, iss, { issueNo: 'IS-' + Date.now() + '-' + idx });
    });
  } else {
    patch.issues = [];
  }
  saveSubtask(taskId, subtaskCode, patch);
  return { ok: true, subtask: findSubtask(taskId, subtaskCode) };
}

function runAutoSubtask(taskId, subtaskCode, options) {
  options = options || {};
  const sub = findSubtask(taskId, subtaskCode);
  if (!sub || sub.method !== '自动') return sub;
  if (sub.autoRan) return sub;
  const now = nowStr();
  const abnormal = !!(options.forceAbnormal || sub.forceAbnormal);
  const patch = {
    autoRan: true,
    status: '已完成',
    completedAt: now,
    result: abnormal ? '异常' : '正常',
    remark: abnormal ? '系统检测到运行指标异常' : '任务到点后系统自动完成分析',
    issueDesc: abnormal ? (sub.issueDesc || ((sub.itemName || '') + ' 指标超限')) : '',
    completedById: '',
    completedBySystem: true,
    aiResult: {
      model: sub.aiModel || 'UPS运行监测',
      channels: sub.aiChannels || '—',
      conclusion: abnormal ? '异常' : '正常',
      confidence: abnormal ? '0.88' : '0.95',
      detail: abnormal ? '算法分析完成，发现异常指标' : '算法分析完成，各项指标正常'
    },
    aiConfidence: abnormal ? '0.88' : '0.95',
    aiDetail: abnormal ? '算法分析完成，发现异常指标' : '算法分析完成，各项指标正常'
  };
  if (abnormal) {
    patch.issues = [{
      id: 'auto-issue-1',
      desc: patch.issueDesc,
      issueDescSource: 'text',
      images: [],
      attachments: []
    }];
  } else {
    patch.issues = [];
  }
  saveSubtask(taskId, subtaskCode, patch);
  return findSubtask(taskId, subtaskCode);
}

function guardPoints(ids) {
  return (ids || []).map(function (id) {
    const pt = GUARD_POINT_MAP[id];
    return pt ? Object.assign({}, pt) : null;
  }).filter(Boolean);
}

function getItemSpec(itemId) {
  const spec = ITEM_SPECS[itemId];
  if (!spec) return null;
  const item = Object.assign({}, spec);
  if (!item.method) {
    if (item.aiModel) item.method = '自动';
    else if (item.videoDevices && item.videoDevices.length) item.method = '远程';
    else item.method = '现场';
  }
  return item;
}

function resolveDevices(ids) {
  return patrolDevice.resolveDevices(ids);
}

function computeTaskProgress(subtasks) {
  const total = subtasks.length;
  const done = subtasks.filter(function (s) { return s.status === '已完成'; }).length;
  return { done: done, total: total };
}

module.exports = {
  GUARD_POINT_MAP,
  ITEM_SPECS,
  getSubtasks,
  findSubtask,
  saveSubtask,
  submitGuardCheckin,
  submitRemoteResult,
  runAutoSubtask,
  guardPoints,
  getItemSpec,
  resolveDevices,
  computeTaskProgress,
  resetForDemo: function () {
    runtimeSubtasks = clone(INITIAL_SUBTASKS);
  }
};
