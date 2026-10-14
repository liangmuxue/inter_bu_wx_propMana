const patrolTask = require('../../../services/patrol-task');
const patrolFormat = require('../../../utils/patrol-format');
const patrolRefImage = require('../../../utils/patrol-ref-image');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    subtask: null,
    refImage: null,
    points: [],
    done: 0,
    total: 0,
    orderHint: '',
    viewOnly: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId;
    this.subtaskCode = options.subtaskCode;
    this.setData({ viewOnly: options.viewOnly === '1' });
    this.ensureExecutorThenLoad();
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (this.taskId) this.load();
  },

  ensureExecutorThenLoad() {
    const self = this;
    patrolTask.getTaskDetail(this.taskId).then(function (task) {
      if (task && !task.isMine && !self.data.viewOnly) {
        self.setData({ viewOnly: true });
        wx.showToast({ title: '仅任务执行人可执行巡检', icon: 'none' });
      }
      self.load();
    }).catch(function () {
      self.load();
    });
  },

  load() {
    patrolTask.getSubtask(this.taskId, this.subtaskCode).then(function (sub) {
      if (!sub) return;
      const cfg = sub.guardConfig || {};
      const orderMode = cfg.orderMode || 'sequential';
      const results = sub.guardPointResults || {};
      const checkins = sub.guardCheckins || {};
      const presetPoints = sub.points || [];
      const points = (cfg.pointIds || presetPoints.map(function (p) { return p.id; }) || []).map(function (id) {
        let pt = null;
        for (let i = 0; i < presetPoints.length; i++) {
          if (presetPoints[i] && presetPoints[i].id === id) {
            pt = presetPoints[i];
            break;
          }
        }
        if (!pt) {
          try {
            pt = require('../../../mock/patrol-task-store').guardPoints([id])[0];
          } catch (e) {
            pt = { id: id, name: id, type: '巡更点', location: '' };
          }
        }
        if (!pt) return null;
        const pr = results[id] || {};
        const done = !!(checkins[id] && pr.result);
        return Object.assign({}, pt, {
          done: done,
          checkinAt: checkins[id] || '',
          result: pr.result || '',
          remark: pr.remark || '',
          issueDesc: pr.issueDesc || '',
          issues: pr.issues || (pr.issueDesc ? [{ desc: pr.issueDesc }] : []),
          completedByName: patrolFormat.formatPointCheckinActorName(pr)
        });
      }).filter(Boolean);

      let firstPendingIdx = -1;
      points.forEach(function (p, idx) {
        if (!p.done && firstPendingIdx < 0) firstPendingIdx = idx;
      });
      if (orderMode === 'sequential') {
        points.forEach(function (p, idx) {
          p.locked = !p.done && idx > firstPendingIdx && firstPendingIdx >= 0;
        });
      } else {
        points.forEach(function (p) { p.locked = false; });
      }
      points.forEach(function (p) {
        if (p.done) p.statusLabel = '已打卡';
        else if (p.locked) p.statusLabel = '未解锁';
        else p.statusLabel = '待打卡';
      });

      const done = points.filter(function (p) { return p.done; }).length;
      this.setData({
        subtask: sub,
        refImage: patrolRefImage.resolve(sub.itemId, sub.itemName),
        points: points,
        done: done,
        total: points.length,
        orderHint: patrolFormat.orderModeLabel(orderMode)
      });
    }.bind(this));
  },

  openPoint(e) {
    const point = e.currentTarget.dataset.point;
    if (!this.data.viewOnly) {
      if (point.locked) {
        wx.showToast({ title: '请按顺序依次打卡', icon: 'none' });
        return;
      }
      if (point.done) {
        wx.navigateTo({
          url: '/packages/patrol/guard-scan/index?taskId=' + this.taskId +
            '&subtaskCode=' + this.subtaskCode + '&pointId=' + point.id + '&viewOnly=1'
        });
        return;
      }
      wx.navigateTo({
        url: '/packages/patrol/guard-scan/index?taskId=' + this.taskId +
          '&subtaskCode=' + this.subtaskCode + '&pointId=' + point.id
      });
      return;
    }
    if (point.done) {
      wx.navigateTo({
        url: '/packages/patrol/guard-scan/index?taskId=' + this.taskId +
          '&subtaskCode=' + this.subtaskCode + '&pointId=' + point.id + '&viewOnly=1'
      });
    }
  }
});
