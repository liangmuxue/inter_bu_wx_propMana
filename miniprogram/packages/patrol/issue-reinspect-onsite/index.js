const patrolTask = require('../../../services/patrol-task');
const patrolIssueFormat = require('../../../utils/patrol-issue-format');
const patrolIssueReinspect = require('../../../utils/patrol-issue-reinspect');
const patrolRemoteMonitor = require('../../../utils/patrol-remote-monitor');
const patrolIssueListRefresh = require('../../../utils/patrol-issue-list-refresh');
const patrolToast = require('../../../utils/patrol-toast');
const taskStore = require('../../../mock/patrol-task-store');
const pageAccess = require('../../../utils/page-access');

const SNAPSHOT_TOTAL = 24;

function buildSnapshotTimes(total) {
  const list = [];
  for (let i = 0; i < total; i++) {
    const minute = 25 - i;
    const mStr = minute < 10 ? '0' + minute : String(minute);
    list.push('08:' + mStr + ':18');
  }
  return list;
}

const SNAPSHOT_TIMES = buildSnapshotTimes(SNAPSHOT_TOTAL);

Page({
  data: {
    loading: true,
    submitting: false,
    issue: null,
    rawIssue: null,
    method: '现场',
    methodLabel: '现场巡检',
    guardPoints: [],
    checkins: {},
    guardDone: 0,
    guardTotal: 0,
    allGuardDone: false,
    standard: '',
    refImage: null,
    devices: [],
    deviceLabels: [],
    deviceIndex: 0,
    currentDeviceId: '',
    currentDeviceLabel: '',
    monitorTab: 'live',
    replaySpeedOptions: ['1x', '2x', '4x'],
    replaySpeedIndex: 0,
    replaySpeedLabel: '1x',
    snapshotIndex: 0,
    snapshotTimes: SNAPSHOT_TIMES,
    snapshotTotal: SNAPSHOT_TOTAL,
    snapshotScrollIntoView: 'snap-0',
    streamType: 'main',
    monitorMeta: '',
    videoFit: 'cover',
    audioOn: true,
    resultOptions: ['请选择', '合格', '不合格'],
    resultIndex: 0,
    remark: '',
    attachments: [],
    autoLoading: true,
    autoResult: null,
    autoSubmitted: false,
    autoFinalStatus: '',
    isTempReportOnsite: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.issueNo = (options && options.issueNo) || '';
    patrolRemoteMonitor.restorePortrait();
    if (!this.issueNo) {
      wx.showToast({ title: '缺少问题编号', icon: 'none' });
      return;
    }
    this.loadIssue();
  },

  onShow() {
    patrolRemoteMonitor.onMonitorPageShow();
    if (this.issueNo && this.data.method === '现场' && !this.data.loading) {
      this.loadIssue(true);
    }
  },

  loadIssue(silent) {
    if (!silent) this.setData({ loading: true });
    patrolTask.getIssueDetail(this.issueNo).then(function (issue) {
      if (!issue) {
        wx.showToast({ title: '未找到问题', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      const method = patrolIssueReinspect.resolveMethod(issue);
      if (method === '自动' && issue.status !== '待复检') {
        patrolToast.showToast(
          issue.status === '已完成' ? '问题已完成' : '已退回待整改'
        );
        setTimeout(function () { wx.navigateBack(); }, 800);
        return;
      }
      if (method !== '自动' && !issue.canReinspect) {
        wx.showToast({ title: '仅问题创建人可执行复检', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 800);
        return;
      }
      const display = patrolIssueFormat.prepareIssueDetailDisplay(issue);
      const guardPointIds = patrolIssueReinspect.getGuardPointIds(issue);
      const checkins = issue.reinspectCheckins || {};
      const guardPoints = taskStore.guardPoints(guardPointIds);
      const guardDone = guardPointIds.filter(function (id) { return !!checkins[id]; }).length;
      const isTempReportOnsite = patrolIssueReinspect.isTempReportOnsiteIssue(issue);
      const patch = {
        issue: display,
        rawIssue: issue,
        method: method,
        methodLabel: patrolIssueReinspect.formatCheckMethodLabel(method),
        isTempReportOnsite: isTempReportOnsite,
        guardPoints: guardPoints,
        checkins: checkins,
        guardDone: guardDone,
        guardTotal: guardPointIds.length,
        allGuardDone: guardPointIds.length > 0 && guardDone === guardPointIds.length,
        loading: false
      };
      if (method === '远程') {
        const remote = patrolIssueReinspect.getRemoteContext(issue);
        const first = remote.devices[0];
        const deviceLabel = first ? (first.id + ' ' + first.name) : '—';
        Object.assign(patch, {
          standard: remote.standard,
          refImage: remote.refImage,
          devices: remote.devices,
          deviceLabels: remote.deviceLabels,
          deviceIndex: 0,
          currentDeviceId: first ? first.id : '',
          currentDeviceLabel: deviceLabel,
          streamType: 'main',
          monitorMeta: patrolRemoteMonitor.buildMonitorMeta(deviceLabel, 'main'),
          videoFit: 'cover',
          audioOn: true,
          monitorTab: 'live',
          snapshotIndex: 0,
          snapshotScrollIntoView: 'snap-0'
        });
      }
      wx.setNavigationBarTitle({ title: '问题复检' });
      this.setData(patch);
      if (method === '自动' && !this._autoRan) {
        this.runAutoReinspect(issue);
      }
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    }.bind(this));
  },

  runAutoReinspect(issue) {
    if (this._autoRan) return;
    this._autoRan = true;
    this.setData({ autoLoading: true, autoResult: null, autoSubmitted: false, autoFinalStatus: '' });
    setTimeout(function () {
      const autoResult = patrolIssueReinspect.buildAutoReinspectResult(issue, true);
      const payload = {
        method: '自动',
        result: autoResult.result,
        remark: autoResult.remark,
        aiResult: {
          model: autoResult.model,
          channels: autoResult.channels,
          conclusion: autoResult.conclusion,
          confidence: autoResult.confidence,
          detail: autoResult.detail
        }
      };
      patrolTask.submitIssueReinspect(this.issueNo, payload).then(function (res) {
        const ok = res && res.ok;
        this.setData({
          autoLoading: false,
          autoResult: autoResult,
          autoSubmitted: ok,
          autoFinalStatus: ok ? (res.status || '已完成') : ''
        });
        if (ok) {
          const status = res.status || '';
          const msg = status === '已完成' ? '问题已完成' : '已退回待整改';
          patrolToast.showSuccess(msg);
          patrolIssueListRefresh.finishIssueFlow(status || '待整改', { issueNo: this.issueNo });
        } else {
          wx.showToast({ title: (res && res.message) || '自动复检失败', icon: 'none' });
        }
      }.bind(this)).catch(function () {
        this.setData({ autoLoading: false });
      }.bind(this));
    }.bind(this), 900);
  },

  onDeviceChange(e) {
    const idx = Number(e.detail.value);
    const devices = this.data.devices;
    const device = devices[idx];
    if (!device) return;
    const deviceLabel = device.id + ' ' + device.name;
    this.setData({
      deviceIndex: idx,
      currentDeviceId: device.id,
      currentDeviceLabel: deviceLabel,
      monitorMeta: patrolRemoteMonitor.buildMonitorMeta(deviceLabel, this.data.streamType),
      snapshotIndex: 0,
      snapshotScrollIntoView: 'snap-0'
    });
  },

  onStreamSwitch(e) {
    patrolRemoteMonitor.onStreamSwitch(this, e);
  },

  onToggleMonitorFit() {
    patrolRemoteMonitor.onToggleFit(this);
  },

  onToggleMonitorFullscreen() {
    patrolRemoteMonitor.onToggleFullscreen(this, { title: '问题复检' });
  },

  onMonitorVc(e) {
    patrolRemoteMonitor.onMonitorVc(this, e);
  },

  onMonitorTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.monitorTab) return;
    this.setData({ monitorTab: tab });
  },

  onReplaySpeedChange(e) {
    const idx = Number(e.detail.value);
    const options = this.data.replaySpeedOptions;
    this.setData({
      replaySpeedIndex: idx,
      replaySpeedLabel: options[idx] || '1x'
    });
  },

  onSnapshotSelect(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    this.setData({
      snapshotIndex: idx,
      snapshotScrollIntoView: 'snap-' + idx
    });
  },

  onSnapshotSwipe(e) {
    const idx = e.detail.current;
    this.setData({
      snapshotIndex: idx,
      snapshotScrollIntoView: 'snap-' + idx
    });
  },

  onResultPick(e) {
    this.setData({ resultIndex: parseInt(e.detail.value, 10) || 0 });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  chooseAttachments() {
    const remain = 9 - this.data.attachments.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个附件', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const attachments = this.data.attachments.slice();
        res.tempFiles.forEach(function (file) {
          const isVideo = file.fileType === 'video';
          attachments.push({
            type: isVideo ? 'video' : 'image',
            path: file.tempFilePath,
            name: (isVideo ? '视频' : '图片') + attachments.length,
            label: (isVideo ? '视频' : '图片') + attachments.length
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

  goToGuardCheckin(e) {
    const pointId = e.currentTarget.dataset.id;
    if (!pointId || this.data.checkins[pointId]) return;
    const issue = this.data.rawIssue || {};
    const q = [
      'reinspect=1',
      'issueNo=' + encodeURIComponent(this.issueNo),
      'pointId=' + encodeURIComponent(pointId),
      'itemId=' + encodeURIComponent(issue.itemId || ''),
      'itemName=' + encodeURIComponent(issue.itemName || '')
    ];
    if (this.data.isTempReportOnsite) q.push('tempReport=1');
    wx.navigateTo({ url: '/packages/patrol/guard-scan/index?' + q.join('&') });
  },

  submitOnsiteReinspect() {
    const result = this.data.resultIndex > 0 ? this.data.resultOptions[this.data.resultIndex] : '';
    if (!result || result === '请选择') {
      wx.showToast({ title: '请选择复检结果', icon: 'none' });
      return;
    }
    return {
      method: '现场',
      result: result,
      remark: (this.data.remark || '').trim(),
      files: this.data.attachments.map(function (f) {
        return { type: f.type, name: f.name, label: f.label, path: f.path };
      })
    };
  },

  submit() {
    if (this.data.submitting) return;
    const method = this.data.method;
    let payload = { method: method };

    if (method === '远程') {
      const result = this.data.resultIndex > 0 ? this.data.resultOptions[this.data.resultIndex] : '';
      if (!result || result === '请选择') {
        wx.showToast({ title: '请选择复检结果', icon: 'none' });
        return;
      }
      payload.result = result;
      payload.remark = (this.data.remark || '').trim();
      payload.files = this.data.attachments.map(function (f) {
        return { type: f.type, name: f.name, label: f.label, path: f.path };
      });
    } else if (method === '现场' && this.data.isTempReportOnsite) {
      payload = this.submitOnsiteReinspect();
      if (!payload) return;
    } else {
      return;
    }

    this.setData({ submitting: true });
    patrolTask.submitIssueReinspect(this.issueNo, payload).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      const msg = res.status === '已完成' ? '问题已完成' :
        (payload.result === '不合格' ? '已退回待整改' : '复检已提交');
      patrolToast.showSuccess(msg);
      patrolIssueListRefresh.finishIssueFlow(res.status || '待整改', { issueNo: this.issueNo });
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
    }.bind(this));
  }
});
