/** 临时问题上报/编辑（对齐 PC buildPatrolIssueReportFormHtml） */
const taskStore = require('../mock/patrol-task-store');
const patrolIssueAction = require('./patrol-issue-action');
const dataScope = require('./data-scope');

const PATROL_OBJECTS = [
  { id: 'PO-001', name: '地下一层设备巡检' },
  { id: 'PO-002', name: '15楼消防检查' },
  { id: 'PO-003', name: '15楼卫生检查' },
  { id: 'PO-004', name: '15楼空调机房' }
];

const ITEM_NAMES = {
  'PI-001': '消防通道畅通',
  'PI-002': '配电室温湿度',
  'PI-003': '锅炉压力表读数',
  'PI-004': '消火栓外观检查',
  'PI-005': '机房环境检查',
  'PI-006': 'UPS 运行状态',
  'PI-007': 'B1车库视频监控',
  'PI-008': '主入口通行监控',
  'PI-009': '空调机房监控',
  'PI-010': '风机运行检查',
  'PI-011': '风管静压检测'
};

const OBJECT_ITEM_IDS = {
  'PO-001': ['PI-002', 'PI-003', 'PI-005', 'PI-006', 'PI-007'],
  'PO-002': ['PI-001', 'PI-004'],
  'PO-003': ['PI-010'],
  'PO-004': ['PI-009', 'PI-011']
};

function listObjects() {
  return PATROL_OBJECTS.map(function (o) {
    return {
      id: o.id,
      name: o.name,
      label: o.id + ' · ' + o.name
    };
  });
}

function listItemsForObject(objectId) {
  const ids = OBJECT_ITEM_IDS[objectId] || [];
  return ids.map(function (id) {
    const name = ITEM_NAMES[id] || id;
    const spec = taskStore.getItemSpec(id) || {};
    const method = spec.method || patrolIssueAction.resolveCheckMethod({ itemId: id });
    return {
      id: id,
      name: name,
      label: id + ' · ' + name,
      method: method,
      methodLabel: patrolIssueAction.formatCheckMethodLabel(method)
    };
  });
}

function listHandlers(currentUser) {
  currentUser = currentUser || {};
  const ids = dataScope.getAccessibleUserIds(currentUser);
  return ids.map(function (id) {
    return {
      id: id,
      label: dataScope.formatUserDisplay(id)
    };
  });
}

function buildPickerOptions(list, placeholderLabel) {
  return [{ id: '', label: placeholderLabel, placeholder: true }].concat(list || []);
}

/** 带占位项的下拉索引：未选为 0，已选为 list 中的位置 + 1 */
function pickerIndexForId(id, list) {
  if (!id) return 0;
  const idx = (list || []).findIndex(function (o) { return o.id === id; });
  return idx >= 0 ? idx + 1 : 0;
}

function findObjectIndex(objectId, objects) {
  objects = objects || listObjects();
  const idx = objects.findIndex(function (o) { return o.id === objectId; });
  return idx >= 0 ? idx : -1;
}

function findItemIndex(itemId, items) {
  const idx = (items || []).findIndex(function (o) { return o.id === itemId; });
  return idx >= 0 ? idx : -1;
}

function findHandlerIndex(handlerId, handlers) {
  const idx = (handlers || []).findIndex(function (o) { return o.id === handlerId; });
  return idx >= 0 ? idx : -1;
}

function validateForm(form) {
  form = form || {};
  if (!form.objectId) return { ok: false, message: '请选择关联巡检对象' };
  if (!form.itemId) return { ok: false, message: '请选择关联巡检项' };
  if (!form.handlerId) return { ok: false, message: '请选择问题处理人' };
  const desc = (form.desc || '').trim();
  if (!desc) return { ok: false, message: '请填写问题描述' };
  return { ok: true };
}

function buildSubmitPayload(form) {
  form = form || {};
  const items = listItemsForObject(form.objectId);
  const item = items.find(function (i) { return i.id === form.itemId; }) || {};
  return {
    objectId: form.objectId,
    itemId: form.itemId,
    itemName: item.name || form.itemName || '',
    handlerId: form.handlerId,
    desc: (form.desc || '').trim(),
    images: (form.images || []).map(function (img) {
      return {
        path: img.path,
        previewUrl: img.path,
        label: img.label || img.name || '图片',
        tone: img.tone || 'default'
      };
    }),
    attachments: (form.attachments || []).map(function (att) {
      return {
        type: att.type || 'video',
        name: att.name,
        label: att.label || att.name,
        path: att.path,
        durationSec: att.durationSec || 0
      };
    })
  };
}

function issueToForm(issue) {
  issue = issue || {};
  const first = (issue.issues && issue.issues[0]) || {};
  return {
    objectId: issue.objectId || '',
    itemId: issue.itemId || '',
    itemName: issue.itemName || '',
    handlerId: issue.handlerId || '',
    desc: first.desc || issue.desc || issue.title || '',
    images: (first.images || []).map(function (img) {
      return {
        path: img.path || img.previewUrl || img.url,
        label: img.label || '图片',
        name: img.name || img.label || '图片'
      };
    }),
    attachments: (first.attachments || []).map(function (att) {
      return {
        type: att.type || 'video',
        path: att.path,
        name: att.name,
        label: att.label || att.name,
        durationSec: att.durationSec || 0
      };
    })
  };
}

module.exports = {
  listObjects: listObjects,
  listItemsForObject: listItemsForObject,
  listHandlers: listHandlers,
  buildPickerOptions: buildPickerOptions,
  pickerIndexForId: pickerIndexForId,
  findObjectIndex: findObjectIndex,
  findItemIndex: findItemIndex,
  findHandlerIndex: findHandlerIndex,
  validateForm: validateForm,
  buildSubmitPayload: buildSubmitPayload,
  issueToForm: issueToForm
};
