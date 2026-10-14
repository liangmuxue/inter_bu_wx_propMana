const patrolTask = require('../../../services/patrol-task');
const patrolRefImage = require('../../../utils/patrol-ref-image');
const patrolIssue = require('../../../utils/patrol-issue');
const patrolAttachment = require('../../../utils/patrol-attachment');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const patrolDevice = require('../../../utils/patrol-device');
const patrolRemoteMonitor = require('../../../utils/patrol-remote-monitor');
const patrolRemoteRules = require('../../../utils/patrol-remote-rules');
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

Page({
  data: {
    subtask: null,
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
    snapshotTimes: buildSnapshotTimes(SNAPSHOT_TOTAL),
    snapshotTotal: SNAPSHOT_TOTAL,
    snapshotScrollIntoView: 'snap-0',
    viewOnly: false,
    result: '正常',
    remark: '',
    issues: [],
    savedIssues: [],
    maxImages: patrolIssue.MAX_IMAGES,
    showDeviceDetail: false,
    deviceDetailRows: [],
    streamType: 'main',
    monitorMeta: '',
    videoFit: 'cover',
    audioOn: true,
    // 同 PC 规则参数
    ruleReplayDuration: '60 秒',
    ruleReplaySec: 60,
    ruleSnapshotRetainDays: '30',
    ruleHint: ''
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId;
    this.subtaskCode = options.subtaskCode;
    this.setData({ viewOnly: options.viewOnly === '1' });
    patrolRemoteMonitor.restorePortrait();
    this.applyRemoteRules();
    this.ensureExecutorThenLoad();
  },

  applyRemoteRules() {
    const rules = patrolRemoteRules.getPatrolRuleParams();
    const replaySec = patrolRemoteRules.parseReplayDurationSec(rules.replayDuration);
    const retainDays = String(rules.snapshotRetainDays || '30');
    const snapTotal = patrolRemoteRules.resolveSnapshotTotal(SNAPSHOT_TOTAL, retainDays);
    const times = buildSnapshotTimes(snapTotal);
    this.setData({
      ruleReplayDuration: rules.replayDuration || '60 秒',
      ruleReplaySec: replaySec,
      ruleSnapshotRetainDays: retainDays,
      snapshotTotal: snapTotal,
      snapshotTimes: times,
      snapshotIndex: 0,
      snapshotScrollIntoView: 'snap-0',
      ruleHint: '回放最长 ' + (rules.replayDuration || '60 秒') +
        ' · 快照保留 ' + retainDays + ' 天'
    });
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

  onShow() {
    patrolRemoteMonitor.onMonitorPageShow();
  },

  noop() {},

  load() {
    patrolTask.getSubtask(this.taskId, this.subtaskCode).then(function (sub) {
      if (!sub) return;
      const devices = sub.devices || [];
      const deviceLabels = devices.map(function (d) { return d.id + ' ' + d.name; });
      const first = devices[0];
      const deviceLabel = first ? (first.id + ' ' + first.name) : '—';
      const savedIssues = (sub.issues || []).map(function (iss, idx) {
        return {
          id: iss.id || ('issue-' + idx),
          desc: iss.desc || '',
          images: (iss.images || []).map(function (img) {
            return {
              path: img.path || img.previewUrl,
              name: img.label || img.name || '图片'
            };
          }),
          attachments: (iss.attachments || []).slice()
        };
      });
      this.setData({
        subtask: sub,
        refImage: sub.refImage || patrolRefImage.resolve(sub.itemId, sub.itemName),
        devices: devices,
        deviceLabels: deviceLabels,
        deviceIndex: 0,
        currentDeviceId: first ? first.id : '',
        currentDeviceLabel: deviceLabel,
        streamType: 'main',
        monitorMeta: patrolRemoteMonitor.buildMonitorMeta(deviceLabel, 'main'),
        videoFit: 'cover',
        audioOn: true,
        monitorTab: 'live',
        snapshotIndex: 0,
        snapshotScrollIntoView: 'snap-0',
        result: sub.result || '正常',
        remark: sub.remark || '',
        savedIssues: savedIssues
      });
    }.bind(this));
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
    patrolRemoteMonitor.onToggleFullscreen(this, { title: '远程巡检' });
  },

  onMonitorVc(e) {
    patrolRemoteMonitor.onMonitorVc(this, e);
  },

  queryDevice(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const device = this.data.devices[idx];
    if (!device) return;
    this.setData({
      showDeviceDetail: true,
      deviceDetailRows: patrolDevice.buildDeviceDetailRows(device)
    });
  },

  closeDeviceDetail() {
    this.setData({ showDeviceDetail: false, deviceDetailRows: [] });
  },

  onMonitorTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.monitorTab) return;
    this.setData({ monitorTab: tab });
    if (tab === 'replay') {
      wx.showToast({
        title: '按规则最长回放 ' + (this.data.ruleReplayDuration || '60 秒'),
        icon: 'none'
      });
    } else if (tab === 'snapshot') {
      wx.showToast({
        title: '快照保留 ' + (this.data.ruleSnapshotRetainDays || '30') + ' 天',
        icon: 'none'
      });
    }
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

  onResultChange(e) {
    const result = e.detail.value;
    const patch = { result: result };
    if (result === '异常' && !this.data.issues.length) {
      patch.issues = [patrolIssue.createEmptyIssue('issue-1')];
    }
    if (result === '正常') {
      patch.issues = [];
    }
    this.setData(patch);
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onIssueDescInput(e) {
    const idx = e.currentTarget.dataset.index;
    const issues = this.data.issues.slice();
    issues[idx] = Object.assign({}, issues[idx], { desc: e.detail.value });
    this.setData({ issues: issues });
  },

  addIssue() {
    const issues = this.data.issues.slice();
    issues.push(patrolIssue.createEmptyIssue('issue-' + Date.now()));
    this.setData({ issues: issues });
  },

  removeIssue(e) {
    const idx = e.currentTarget.dataset.index;
    if (idx <= 0) return;
    const issues = this.data.issues.slice();
    issues.splice(idx, 1);
    this.setData({ issues: issues });
  },

  chooseIssueImages(e) {
    const idx = e.currentTarget.dataset.index;
    const issue = this.data.issues[idx];
    const current = (issue.images || []).length;
    const remain = patrolIssue.MAX_IMAGES - current;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + patrolIssue.MAX_IMAGES + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const issues = this.data.issues.slice();
        const images = (issues[idx].images || []).slice();
        res.tempFiles.forEach(function (file) {
          if (images.length < patrolIssue.MAX_IMAGES) {
            images.push({ path: file.tempFilePath, name: '图片' + (images.length + 1) });
          }
        });
        issues[idx] = Object.assign({}, issues[idx], { images: images });
        this.setData({ issues: issues });
      }.bind(this)
    });
  },

  removeIssueImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgIdx = e.currentTarget.dataset.imgIndex;
    const issues = this.data.issues.slice();
    const images = (issues[idx].images || []).slice();
    images.splice(imgIdx, 1);
    issues[idx] = Object.assign({}, issues[idx], { images: images });
    this.setData({ issues: issues });
  },

  previewIssueImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgIdx = e.currentTarget.dataset.imgIndex;
    patrolIssueMedia.previewIssueImages(this.data.issues[idx].images, imgIdx);
  },

  previewSavedIssueImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgIdx = e.currentTarget.dataset.imgIndex;
    patrolIssueMedia.previewIssueImages(this.data.savedIssues[idx].images, imgIdx);
  },

  playSavedIssueAttachment(e) {
    const idx = e.currentTarget.dataset.index;
    const attIdx = e.currentTarget.dataset.attIndex;
    const att = (this.data.savedIssues[idx].attachments || [])[attIdx];
    if (att) patrolAttachment.playIssueAttachment(att);
  },

  playIssueAttachment(e) {
    const idx = e.currentTarget.dataset.index;
    const attIdx = e.currentTarget.dataset.attIndex;
    const att = (this.data.issues[idx].attachments || [])[attIdx];
    if (att) patrolAttachment.playIssueAttachment(att);
  },

  chooseIssueAttachments(e) {
    const idx = e.currentTarget.dataset.index;
    wx.chooseMedia({
      count: 9,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const issues = this.data.issues.slice();
        const attachments = (issues[idx].attachments || []).slice();
        res.tempFiles.forEach(function (file) {
          attachments.push({
            type: 'video',
            path: file.tempFilePath,
            name: '视频' + (attachments.length + 1) + '.mp4',
            label: '视频' + (attachments.length + 1),
            durationSec: Math.ceil((file.duration || 0) / 1000)
          });
        });
        issues[idx] = Object.assign({}, issues[idx], { attachments: attachments });
        this.setData({ issues: issues });
      }.bind(this)
    });
  },

  removeIssueAttachment(e) {
    const idx = e.currentTarget.dataset.index;
    const attIdx = e.currentTarget.dataset.attIndex;
    const issues = this.data.issues.slice();
    const attachments = (issues[idx].attachments || []).slice();
    attachments.splice(attIdx, 1);
    issues[idx] = Object.assign({}, issues[idx], { attachments: attachments });
    this.setData({ issues: issues });
  },

  submit() {
    const data = this.data;
    if (data.result === '异常') {
      const check = patrolIssue.validateSubtaskIssues(data.issues);
      if (!check.ok) {
        wx.showToast({ title: check.message, icon: 'none' });
        return;
      }
    }
    patrolTask.submitRemoteResult(this.taskId, this.subtaskCode, {
      result: data.result,
      remark: data.remark,
      issues: data.result === '异常' ? data.issues : []
    }).then(function (res) {
      if (!res.ok) {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 600);
    });
  }
});
