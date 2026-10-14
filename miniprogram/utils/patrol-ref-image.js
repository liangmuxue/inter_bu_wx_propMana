/** 对齐 PC patrol-control.js PATROL_REF_IMAGE_SAMPLES */
const REF_IMAGE_SAMPLES = {
  'PI-001': { tone: 'fire', caption: '通道无堆放物，地面标识清晰可见' },
  'PI-002': { tone: 'env', caption: '配电室温湿度读数正常，监控画面清晰可对照' },
  'PI-003': { tone: 'boiler', caption: '压力表指针位于 0.4~0.6 MPa 合格区间' },
  'PI-004': { tone: 'hydrant', caption: '箱门完好，水带、栓口及标识齐全' },
  'PI-005': { tone: 'env', caption: '机房环境整洁，温湿度正常，无异味' },
  'PI-010': { tone: 'default', caption: '风机运行平稳，无异常振动' }
};

const HAS_REF_IMAGE = {
  'PI-001': true,
  'PI-002': true,
  'PI-003': true,
  'PI-004': true,
  'PI-005': true,
  'PI-010': true
};

function decodeDisplayName(name) {
  if (!name) return '';
  if (/%[0-9A-Fa-f]{2}/.test(name)) {
    try {
      return decodeURIComponent(name);
    } catch (e) {
      return name;
    }
  }
  return name;
}

function resolve(itemId, itemName) {
  if (!itemId || !HAS_REF_IMAGE[itemId]) return null;
  const sample = REF_IMAGE_SAMPLES[itemId] || { tone: 'default', caption: '现场巡检对照参考图' };
  return {
    itemId: itemId,
    itemName: decodeDisplayName(itemName) || itemId,
    tone: sample.tone,
    caption: sample.caption
  };
}

module.exports = {
  resolve: resolve,
  hasRefImage: function (itemId) {
    return !!HAS_REF_IMAGE[itemId];
  }
};
