const patrolTask = require('../../../services/patrol-task');
const patrolIssueReport = require('../../../utils/patrol-issue-report');
const patrolIssue = require('../../../utils/patrol-issue');
const patrolToast = require('../../../utils/patrol-toast');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    submitting: false,
    isEdit: false,
    issueNo: '',
    objects: [],
    items: [],
    handlers: [],
    objectIndex: 0,
    itemIndex: 0,
    handlerIndex: 0,
    objectId: '',
    itemId: '',
    handlerId: '',
    methodHint: '',
    desc: '',
    images: [],
    attachments: [],
    maxImages: patrolIssue.MAX_IMAGES
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    options = options || {};
    this.mode = options.mode || '';
    this.issueNo = options.issueNo || '';
    this.setData({
      isEdit: this.mode === 'edit' && !!this.issueNo,
      issueNo: this.issueNo
    });
    if (this.data.isEdit) {
      wx.setNavigationBarTitle({ title: '编辑临时问题' });
      this.loadIssueForEdit();
    } else {
      wx.setNavigationBarTitle({ title: '临时上报' });
      this.initCreateForm();
    }
  },

  initCreateForm() {
    const currentUser = userDisplay.normalizeUser(session.getUser());
    const objects = patrolIssueReport.buildPickerOptions(
      patrolIssueReport.listObjects(),
      '请选择巡检对象'
    );
    const handlers = patrolIssueReport.buildPickerOptions(
      patrolIssueReport.listHandlers(currentUser),
      '请选择问题处理人'
    );
    const items = patrolIssueReport.buildPickerOptions([], '请先选择巡检对象');
    this.setData({
      loading: false,
      objects: objects,
      items: items,
      handlers: handlers,
      objectIndex: 0,
      itemIndex: 0,
      handlerIndex: 0,
      objectId: '',
      itemId: '',
      handlerId: '',
      methodHint: '',
      desc: '',
      images: [],
      attachments: []
    });
  },

  loadIssueForEdit() {
    this.setData({ loading: true });
    patrolTask.getIssueDetail(this.issueNo).then(function (issue) {
      if (!issue) {
        wx.showToast({ title: '未找到问题', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      if (!issue.canEdit) {
        wx.showToast({ title: '仅初始待整改状态可编辑', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 800);
        return;
      }
      const currentUser = userDisplay.normalizeUser(session.getUser());
      const form = patrolIssueReport.issueToForm(issue);
      const rawObjects = patrolIssueReport.listObjects();
      const rawHandlers = patrolIssueReport.listHandlers(currentUser);
      const rawItems = patrolIssueReport.listItemsForObject(form.objectId);
      const objects = patrolIssueReport.buildPickerOptions(rawObjects, '请选择巡检对象');
      const handlers = patrolIssueReport.buildPickerOptions(rawHandlers, '请选择问题处理人');
      const items = form.objectId
        ? patrolIssueReport.buildPickerOptions(rawItems, '请选择巡检项')
        : patrolIssueReport.buildPickerOptions([], '请先选择巡检对象');
      const objectIndex = patrolIssueReport.pickerIndexForId(form.objectId, rawObjects);
      const itemIndex = patrolIssueReport.pickerIndexForId(form.itemId, rawItems);
      const handlerIndex = patrolIssueReport.pickerIndexForId(form.handlerId, rawHandlers);
      const selectedItem = rawItems.find(function (i) { return i.id === form.itemId; });
      this.setData({
        loading: false,
        objects: objects,
        items: items,
        handlers: handlers,
        objectIndex: objectIndex,
        itemIndex: itemIndex,
        handlerIndex: handlerIndex,
        objectId: form.objectId || '',
        itemId: form.itemId || '',
        handlerId: form.handlerId || '',
        methodHint: selectedItem ? ('检查方式：' + selectedItem.methodLabel) : '',
        desc: form.desc,
        images: form.images,
        attachments: form.attachments
      });
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    }.bind(this));
  },

  onObjectPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const object = this.data.objects[index];
    if (!object || !object.id) {
      this.setData({
        objectIndex: 0,
        objectId: '',
        items: patrolIssueReport.buildPickerOptions([], '请先选择巡检对象'),
        itemIndex: 0,
        itemId: '',
        methodHint: ''
      });
      return;
    }
    const rawItems = patrolIssueReport.listItemsForObject(object.id);
    this.setData({
      objectIndex: index,
      objectId: object.id,
      items: patrolIssueReport.buildPickerOptions(rawItems, '请选择巡检项'),
      itemIndex: 0,
      itemId: '',
      methodHint: ''
    });
  },

  onItemPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const item = this.data.items[index];
    if (!item || !item.id) {
      this.setData({
        itemIndex: 0,
        itemId: '',
        methodHint: ''
      });
      return;
    }
    this.setData({
      itemIndex: index,
      itemId: item.id,
      methodHint: '检查方式：' + item.methodLabel
    });
  },

  onHandlerPick(e) {
    const index = parseInt(e.detail.value, 10) || 0;
    const handler = this.data.handlers[index];
    if (!handler || !handler.id) {
      this.setData({
        handlerIndex: 0,
        handlerId: ''
      });
      return;
    }
    this.setData({
      handlerIndex: index,
      handlerId: handler.id
    });
  },

  onDescInput(e) {
    this.setData({ desc: e.detail.value });
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
        res.tempFiles.forEach(function (file) {
          images.push({
            path: file.tempFilePath,
            name: '图片' + images.length,
            label: '图片' + images.length
          });
        });
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

  chooseAttachments() {
    const remain = 9 - this.data.attachments.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个附件', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const attachments = this.data.attachments.slice();
        res.tempFiles.forEach(function (file) {
          attachments.push({
            type: 'video',
            path: file.tempFilePath,
            name: '视频' + attachments.length,
            label: '视频' + attachments.length,
            durationSec: Math.ceil((file.duration || 0) / 1000)
          });
        });
        this.setData({ attachments: attachments });
      }.bind(this)
    });
  },

  removeAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.attachments.slice();
    attachments.splice(index, 1);
    this.setData({ attachments: attachments });
  },

  submit() {
    if (this.data.submitting) return;
    const form = {
      objectId: this.data.objectId,
      itemId: this.data.itemId,
      handlerId: this.data.handlerId,
      desc: this.data.desc,
      images: this.data.images,
      attachments: this.data.attachments
    };
    const check = patrolIssueReport.validateForm(form);
    if (!check.ok) {
      wx.showToast({ title: check.message, icon: 'none' });
      return;
    }
    const payload = patrolIssueReport.buildSubmitPayload(form);
    this.setData({ submitting: true });
    const req = this.data.isEdit
      ? patrolTask.updateIssueReport(this.issueNo, payload)
      : patrolTask.submitIssueReport(payload);
    req.then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      patrolToast.showSuccess(this.data.isEdit ? '保存成功' : '上报成功');
      setTimeout(function () { wx.navigateBack(); }, 800);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
    }.bind(this));
  }
});
