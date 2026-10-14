const patrolTask = require('../../../services/patrol-task');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    task: null,
    showReassign: false,
    candidateList: [],
    candidateIndex: 0,
    reassignHint: '',
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId;
    this._openReassignOnLoad = options.action === 'reassign';
    this.load();
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (this.taskId) this.load();
  },

  load() {
    patrolTask.getTaskDetail(this.taskId).then(function (task) {
      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(function () {
          wx.navigateBack({ fail: function () {} });
        }, 800);
        return;
      }
      this.setData({ task: task });
      if (this._openReassignOnLoad && task.canReassign) {
        this._openReassignOnLoad = false;
        this.openReassign();
      } else {
        this._openReassignOnLoad = false;
      }
    }.bind(this));
  },

  onUrge() {
    const task = this.data.task;
    if (!task || !task.canUrge || this.data.submitting) return;
    wx.showModal({
      title: '催办确认',
      content: '将向当前可执行人发送站内信催办，是否继续？',
      success: function (res) {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        patrolTask.urgeTask(this.taskId).then(function (result) {
          this.setData({ submitting: false });
          wx.showToast({
            title: (result && result.message) || '催办已发送',
            icon: 'none'
          });
        }.bind(this)).catch(function (err) {
          this.setData({ submitting: false });
          wx.showToast({
            title: (err && err.message) || '催办失败',
            icon: 'none'
          });
        }.bind(this));
      }.bind(this)
    });
  },

  openReassign() {
    const task = this.data.task;
    if (!task || !task.canReassign || this.data.submitting) return;
    patrolTask.listReassignCandidates(this.taskId).then(function (res) {
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '无法转派', icon: 'none' });
        return;
      }
      const list = [{ id: '', label: '请选择新执行人' }].concat(res.list || []);
      if (list.length <= 1) {
        wx.showToast({ title: '无可选执行人', icon: 'none' });
        return;
      }
      const fromHint = (res.reassignedFrom && res.reassignedFrom.length)
        ? '该任务曾转派过，进度将继续保留'
        : '转派后替换为单一执行人，已完成进度保留';
      this.setData({
        showReassign: true,
        candidateList: list,
        candidateIndex: 0,
        reassignHint: fromHint
      });
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' });
    });
  },

  closeReassign() {
    if (this.data.submitting) return;
    this.setData({ showReassign: false });
  },

  onCandidatePick(e) {
    this.setData({ candidateIndex: Number(e.detail.value) || 0 });
  },

  confirmReassign() {
    if (this.data.submitting) return;
    const list = this.data.candidateList || [];
    const picked = list[this.data.candidateIndex];
    if (!picked || !picked.id) {
      wx.showToast({ title: '请选择新执行人', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    patrolTask.reassignTask(this.taskId, picked.id).then(function (result) {
      this.setData({ submitting: false, showReassign: false });
      if (!result || !result.ok) {
        wx.showToast({ title: (result && result.message) || '转派失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: result.message || '转派成功', icon: 'none' });
      this.load();
    }.bind(this)).catch(function (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '转派失败', icon: 'none' });
    }.bind(this));
  },

  preventClose() {},

  openSubtask(e) {
    const ds = e.currentTarget.dataset;
    const code = ds.code;
    const method = ds.method;
    const mode = ds.mode;
    if (mode === 'exec' && this.data.task && !this.data.task.isMine) {
      wx.showToast({ title: '仅任务执行人可执行巡检', icon: 'none' });
      return;
    }
    const viewOnly = mode === 'view' ? '1' : '0';
    let url = '';
    if (method === '现场') {
      url = '/packages/patrol/subtask-onsite/index?taskId=' + this.taskId +
        '&subtaskCode=' + code + '&viewOnly=' + viewOnly;
    } else if (method === '远程') {
      url = '/packages/patrol/subtask-remote/index?taskId=' + this.taskId +
        '&subtaskCode=' + code + '&viewOnly=' + viewOnly;
    } else if (method === '自动') {
      // 自动巡检仅系统执行；已完成可查看结果，待完成无人工入口（列表已显示「系统执行」）
      if (mode !== 'view') {
        wx.showToast({ title: '自动巡检由系统执行', icon: 'none' });
        return;
      }
      url = '/packages/patrol/subtask-auto/index?taskId=' + this.taskId +
        '&subtaskCode=' + code + '&viewOnly=1';
    }
    if (url) wx.navigateTo({ url: url });
  }
});
