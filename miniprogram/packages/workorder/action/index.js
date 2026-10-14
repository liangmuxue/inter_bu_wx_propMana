const workorderService = require('../../../services/workorder');
const pageAccess = require('../../../utils/page-access');

const MAX_IMAGES = 4;
const MAX_ATTACHMENTS = 5;

const TYPE_META = {
  dispatch: {
    title: '派单',
    remarkLabel: '派单说明',
    remarkPlaceholder: '请填写派单说明（选填）',
    remarkRequired: false,
    needHandlers: true,
    needCategory: true,
    needMedia: false
  },
  transfer: {
    title: '转派',
    remarkLabel: '转派说明',
    remarkPlaceholder: '请填写转派说明（选填）',
    remarkRequired: false,
    needHandlers: true,
    needCategory: true,
    needMedia: false
  },
  finish: {
    title: '完工',
    remarkLabel: '完工说明',
    remarkPlaceholder: '请填写现场处理情况',
    remarkRequired: true,
    needHandlers: false,
    needCategory: false,
    needMedia: true,
    imageLabel: '完工图片',
    attachmentLabel: '完工附件',
    hint: '实际处理人提交完工后进入「已完结」。完工说明必填；图片最多 4 张、附件选填（可多个）。'
  },
  'direct-close': {
    title: '直接完结',
    remarkLabel: '完结说明',
    remarkPlaceholder: '例如：已现场说明处理办法 / 属咨询类问题已答复，无需派工。',
    remarkRequired: true,
    needHandlers: false,
    needCategory: true,
    needMedia: true,
    imageLabel: '完结图片',
    attachmentLabel: '完结附件'
  }
};

function buildTypeMeta(type, order) {
  const base = TYPE_META[type];
  if (!base) return null;
  const meta = Object.assign({}, base);
  if (type === 'direct-close' && order) {
    meta.hint = order.status === '已派单'
      ? '无人接单时，区域调度管理员可直接完结。完结说明对上报人可见；将覆盖原派单时间/说明与指派人。'
      : '待派单或待派单（退回）可直接完结。完结说明对上报人可见，提交后进入「已完结」。';
  }
  if ((type === 'dispatch' || type === 'transfer') && order) {
    meta.hint = '处理人仅可从本区域处理人中选择；任一被指派处理人接单后进入处理中。';
  }
  return meta;
}

function syncHandlerSelection(handlers, selectedIds) {
  handlers = handlers || [];
  selectedIds = selectedIds || [];
  const selectedNames = [];
  const nextHandlers = handlers.map(function (h) {
    const checked = selectedIds.indexOf(h.id) >= 0;
    if (checked) selectedNames.push(h.name);
    return Object.assign({}, h, { checked: checked });
  });
  return {
    handlers: nextHandlers,
    selectedIds: selectedIds.slice(),
    selectedSummary: selectedNames.join('、'),
    selectedCount: selectedNames.length
  };
}

Page({
  data: {
    type: '',
    typeMeta: null,
    order: null,
    categories: [],
    categoryIndex: 0,
    categoryId: '',
    categoryName: '',
    handlers: [],
    selectedIds: [],
    selectedSummary: '',
    selectedCount: 0,
    showHandlerSheet: false,
    sheetHandlers: [],
    sheetSelectedCount: 0,
    remark: '',
    images: [],
    attachments: [],
    maxImages: MAX_IMAGES,
    maxAttachments: MAX_ATTACHMENTS,
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const type = options.type || '';
    if (!TYPE_META[type]) {
      wx.showToast({ title: '无效操作', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 800);
      return;
    }
    this.orderId = options.id || '';
    this.actionType = type;
    this.setData({ type: type });
    this.loadPageData();
  },

  loadPageData() {
    Promise.all([
      workorderService.getWorkOrder(this.orderId),
      workorderService.listWorkOrderCategories()
    ]).then(function (results) {
      const order = results[0];
      const categories = results[1] || [];
      if (!order) {
        wx.showToast({ title: '工单不存在', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 800);
        return;
      }
      const typeMeta = buildTypeMeta(this.actionType, order);
      const categoryId = order.categoryId || (categories[0] && categories[0].id) || '';
      let categoryIndex = categories.findIndex(function (c) { return c.id === categoryId; });
      if (categoryIndex < 0) categoryIndex = 0;
      const category = categories[categoryIndex] || null;
      const selectedIds = (order.assignees || []).map(function (a) { return a.id; });
      const remark = this.actionType === 'transfer' ? (order.dispatchRemark || '') : '';
      this.setData({
        typeMeta: typeMeta,
        order: order,
        categories: categories,
        categoryIndex: categoryIndex,
        categoryId: category ? category.id : '',
        categoryName: category ? category.name : (order.categoryName || ''),
        selectedIds: selectedIds,
        remark: remark,
        images: [],
        attachments: []
      });
      wx.setNavigationBarTitle({ title: typeMeta.title });
      if (typeMeta.needHandlers) {
        return workorderService.listRegionHandlers(order.regionId).then(function (handlers) {
          const synced = syncHandlerSelection(handlers || [], selectedIds);
          this.setData({
            handlers: synced.handlers,
            selectedIds: synced.selectedIds,
            selectedSummary: synced.selectedSummary,
            selectedCount: synced.selectedCount
          });
        }.bind(this));
      }
    }.bind(this));
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value);
    const category = (this.data.categories || [])[idx];
    this.setData({
      categoryIndex: idx,
      categoryId: category ? category.id : '',
      categoryName: category ? category.name : ''
    });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  preventClose() {},

  openHandlerSheet() {
    const synced = syncHandlerSelection(this.data.handlers, this.data.selectedIds);
    this.setData({
      showHandlerSheet: true,
      sheetHandlers: synced.handlers,
      sheetSelectedCount: synced.selectedCount
    });
  },

  closeHandlerSheet() {
    this.setData({ showHandlerSheet: false });
  },

  onHandlerToggle(e) {
    const id = e.currentTarget.dataset.id;
    const sheetHandlers = (this.data.sheetHandlers || []).map(function (h) {
      if (h.id !== id) return h;
      return Object.assign({}, h, { checked: !h.checked });
    });
    const sheetSelectedCount = sheetHandlers.filter(function (h) { return h.checked; }).length;
    this.setData({ sheetHandlers: sheetHandlers, sheetSelectedCount: sheetSelectedCount });
  },

  confirmHandlerSheet() {
    const selectedIds = (this.data.sheetHandlers || [])
      .filter(function (h) { return h.checked; })
      .map(function (h) { return h.id; });
    const synced = syncHandlerSelection(this.data.handlers, selectedIds);
    this.setData({
      showHandlerSheet: false,
      handlers: synced.handlers,
      selectedIds: synced.selectedIds,
      selectedSummary: synced.selectedSummary,
      selectedCount: synced.selectedCount
    });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxImages + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const images = this.data.images.slice();
        (res.tempFiles || []).forEach(function (file, i) {
          images.push({
            path: file.tempFilePath,
            name: (this.data.typeMeta.imageLabel || '图片') + (images.length + i + 1)
          });
        }.bind(this));
        this.setData({ images: images });
      }.bind(this)
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images: images });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.images.map(function (img) { return img.path; });
    wx.previewImage({ current: urls[index], urls: urls });
  },

  chooseAttachments() {
    const remain = this.data.maxAttachments - this.data.attachments.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxAttachments + ' 个附件', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: remain,
      type: 'file',
      success: function (res) {
        const attachments = this.data.attachments.slice();
        (res.tempFiles || []).forEach(function (file) {
          attachments.push({
            path: file.path,
            name: file.name || '附件',
            type: 'file'
          });
        });
        this.setData({ attachments: attachments });
      }.bind(this),
      fail: function () {
        wx.showToast({ title: '未选择附件', icon: 'none' });
      }
    });
  },

  removeAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.attachments.slice();
    attachments.splice(index, 1);
    this.setData({ attachments: attachments });
  },

  buildPayload() {
    const meta = this.data.typeMeta;
    const remark = String(this.data.remark || '').trim();
    const payload = { remark: remark };
    if (meta.needCategory) {
      payload.categoryId = this.data.categoryId;
      payload.categoryName = this.data.categoryName;
    }
    if (meta.needHandlers) {
      payload.assignees = (this.data.handlers || []).filter(function (h) {
        return (this.data.selectedIds || []).indexOf(h.id) >= 0;
      }.bind(this));
    }
    if (meta.needMedia) {
      payload.images = (this.data.images || []).map(function (img, idx) {
        return {
          name: img.name || ((meta.imageLabel || '图片') + (idx + 1)),
          path: img.path,
          url: img.path
        };
      });
      payload.attachments = (this.data.attachments || []).map(function (file) {
        return {
          name: file.name || '附件',
          type: file.type || 'file',
          path: file.path,
          url: file.path
        };
      });
    }
    return payload;
  },

  submit() {
    if (this.data.submitting) return;
    const meta = this.data.typeMeta;
    const payload = this.buildPayload();
    if (meta.needCategory && !payload.categoryId) {
      wx.showToast({ title: '请选择工单分类', icon: 'none' });
      return;
    }
    if (meta.remarkRequired && !payload.remark) {
      wx.showToast({ title: '请填写' + meta.remarkLabel, icon: 'none' });
      return;
    }
    if (meta.needHandlers && !(payload.assignees || []).length) {
      wx.showToast({ title: '请至少选择一名处理人', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const fnMap = {
      dispatch: workorderService.dispatchWorkOrder,
      transfer: workorderService.transferWorkOrder,
      finish: workorderService.finishWorkOrder,
      'direct-close': workorderService.directCloseWorkOrder
    };
    fnMap[this.data.type](this.orderId, payload).then(function (result) {
      this.setData({ submitting: false });
      if (!result || !result.ok) {
        wx.showToast({ title: (result && result.message) || '操作失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: meta.title + '成功', icon: 'success' });
      setTimeout(function () {
        const pages = getCurrentPages();
        if (pages.length >= 2) wx.navigateBack({ delta: 1 });
        else wx.redirectTo({ url: '/packages/workorder/detail/index?id=' + encodeURIComponent(this.orderId) });
      }.bind(this), 500);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }.bind(this));
  }
});
