/** 监控设备详情（对齐 PC 基础设置 · 设备管理 / patrol-control.js queryPatrolRemoteDevice） */

const DEVICE_REGISTRY = {
  'DEV-CAM-101': {
    id: 'DEV-CAM-101',
    name: '主入口摄像头',
    category: '视频监控设备',
    ip: '192.168.1.101',
    region: '15层'
  },
  'DEV-CAM-201': {
    id: 'DEV-CAM-201',
    name: '15F走廊摄像头',
    category: '视频监控设备',
    ip: '192.168.1.201',
    region: '15层'
  },
  'DEV-CAM-128': {
    id: 'DEV-CAM-128',
    name: 'B1车库入口摄像头',
    category: '视频监控设备',
    ip: '192.168.1.128',
    region: '地下停车场'
  },
  'DEV-CAM-502': {
    id: 'DEV-CAM-502',
    name: '大堂客流统计摄像机',
    category: '视频监控设备',
    ip: '192.168.1.502',
    region: '15层'
  }
};

const DETAIL_FIELDS = [
  { key: 'id', label: '设备编号' },
  { key: 'name', label: '设备名称' },
  { key: 'category', label: '设备分类' },
  { key: 'ip', label: 'IP 地址' },
  { key: 'region', label: '所属区域' }
];

function resolveDevice(deviceId) {
  const base = DEVICE_REGISTRY[deviceId];
  if (base) return Object.assign({}, base);
  return { id: deviceId, name: deviceId };
}

function resolveDevices(ids) {
  return (ids || []).map(function (id) {
    return resolveDevice(id);
  });
}

function buildDeviceDetailRows(device) {
  device = device || {};
  return DETAIL_FIELDS.map(function (field) {
    const value = device[field.key];
    if (!value) return null;
    return { label: field.label, value: String(value) };
  }).filter(Boolean);
}

function formatDeviceDetailContent(device) {
  return buildDeviceDetailRows(device).map(function (row) {
    return row.label + '：' + row.value;
  }).join('\n');
}

module.exports = {
  DEVICE_REGISTRY: DEVICE_REGISTRY,
  DETAIL_FIELDS: DETAIL_FIELDS,
  resolveDevice: resolveDevice,
  resolveDevices: resolveDevices,
  buildDeviceDetailRows: buildDeviceDetailRows,
  formatDeviceDetailContent: formatDeviceDetailContent
};
