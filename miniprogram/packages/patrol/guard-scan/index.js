const patrolTask = require('../../../services/patrol-task');
const patrolIssueListRefresh = require('../../../utils/patrol-issue-list-refresh');
const patrolToast = require('../../../utils/patrol-toast');
const taskStore = require('../../../mock/patrol-task-store');
const patrolRefImage = require('../../../utils/patrol-ref-image');
const patrolIssue = require('../../../utils/patrol-issue');
const patrolAttachment = require('../../../utils/patrol-attachment');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const patrolIssueReinspect = require('../../../utils/patrol-issue-reinspect');
const patrolFormat = require('../../../utils/patrol-format');
const pageAccess = require('../../../utils/page-access');

function nowStr() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function decodeQueryParam(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

function isDevToolsEnv() {
  try {
    return wx.getSystemInfoSync().platform === 'devtools';
  } catch (e) {
    return false;
  }
}

Page({
  data: {
    point: null,
    standard: '',
    refImage: null,
    checkinMode: 'qrcode',
    checkinHint: '',
    verified: false,
    viewOnly: false,
    reinspectMode: false,
    savedResult: null,
    savedIssues: [],
    checkinAt: '',
    pointActorName: '',
    result: '正常',
    remark: '',
    issues: [],
    recordingIssueIndex: -1,
    voicePlayingIndex: -1,
    maxImages: patrolIssue.MAX_IMAGES,
    submitting: false,
    reinspectResultOptions: ['请选择', '合格', '不合格'],
    reinspectResultIndex: 0,
    reinspectRemark: '',
    reinspectAttachments: [],
    reinspectIsLastPoint: true,
    reinspectTempReport: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId;
    this.subtaskCode = options.subtaskCode;
    this.pointId = options.pointId;
    this.issueNo = options.issueNo || '';
    this.itemId = options.itemId || '';
    this.itemName = decodeQueryParam(options.itemName || '');
    this.reinspectMode = options.reinspect === '1';
    this.reinspectTempReport = options.tempReport === '1';
    this.setData({
      viewOnly: options.viewOnly === '1',
      reinspectMode: this.reinspectMode,
      reinspectTempReport: this.reinspectTempReport
    });
    this.recorder = wx.getRecorderManager();
    this.audio = wx.createInnerAudioContext();
    this.bindRecorder();
    this.loadPoint();
  },

  onUnload() {
    if (this._voiceSimTimer) {
      clearTimeout(this._voiceSimTimer);
      this._voiceSimTimer = null;
    }
    if (this.audio) {
      try {
        if (typeof this.audio.stop === 'function') this.audio.stop();
        if (typeof this.audio.destroy === 'function') this.audio.destroy();
      } catch (e) { /* ignore */ }
      this.audio = null;
    }
    if (this.recorder && this.data.recordingIssueIndex >= 0) {
      try { this.recorder.stop(); } catch (e) { /* ignore */ }
    }
  },

  bindRecorder() {
    const page = this;
    this.recorder.onStop(function (res) {
      const idx = page.data.recordingIssueIndex;
      if (idx < 0) return;
      const issues = page.data.issues.slice();
      const issue = Object.assign({}, issues[idx]);
      issue.issueDescVoice = {
        durationSec: Math.max(1, Math.ceil((res.duration || 0) / 1000)),
        recordedAt: nowStr(),
        tempFilePath: res.tempFilePath
      };
      if ((issue.desc || '').trim()) {
        issue.issueDescVoice.transcript = issue.desc.trim();
      }
      issues[idx] = issue;
      page.setData({ issues: issues, recordingIssueIndex: -1 });
      wx.showToast({ title: '语音录入完成', icon: 'success' });
    });
    this.recorder.onError(function () {
      page.setData({ recordingIssueIndex: -1 });
      wx.showToast({ title: '录音失败，请重试', icon: 'none' });
    });
  },

  loadPoint() {
    const points = taskStore.guardPoints([this.pointId]);
    const point = points[0];
    if (!point) return;

    let checkinMode = 'qrcode';
    let checkinHint = isDevToolsEnv()
      ? '开发者工具请点击下方按钮模拟扫码（真机将打开摄像头扫码）'
      : '请扫描巡更点二维码完成验证';
    if (point.kind === '资产类') {
      if (point.type === 'NFC标签') {
        checkinMode = 'nfc';
        checkinHint = '资产类巡更点：请感应资产台账中的 NFC 标签完成验证（演示可点击按钮模拟）';
      } else {
        checkinMode = 'qrcode';
        checkinHint = isDevToolsEnv()
          ? '资产类巡更点：请模拟扫描资产台账二维码（编号 ' + (point.scanCode || point.id) + '）'
          : '资产类巡更点：请扫描资产台账中的二维码标签完成验证';
      }
    } else if (point.type === 'NFC标签') {
      checkinMode = 'nfc';
      checkinHint = '请将手机靠近 NFC 标签完成验证（演示可点击按钮模拟）';
    } else if (point.type === '门禁') {
      checkinMode = 'access';
      checkinHint = '请在门禁设备刷卡通行，或点击确认已完成门禁打卡（演示）';
    }

    const patch = { point: point, checkinMode: checkinMode, checkinHint: checkinHint };

    if (this.reinspectMode) {
      const spec = taskStore.getItemSpec(this.itemId) || {};
      patch.standard = spec.standard || '—';
      patch.refImage = patrolRefImage.resolve(this.itemId, this.itemName);
      this.setData(patch);
      wx.setNavigationBarTitle({ title: '巡更点复检打卡' });
      if (this.issueNo) {
        const page = this;
        patrolTask.getIssueDetail(this.issueNo).then(function (issue) {
          if (!issue) return;
          const isTempReport = patrolIssueReinspect.isTempReportOnsiteIssue(issue);
          page.reinspectTempReport = page.reinspectTempReport || isTempReport;
          const pointIds = patrolIssueReinspect.getGuardPointIds(issue);
          const checkins = issue.reinspectCheckins || {};
          const pendingOthers = pointIds.filter(function (id) {
            return id !== page.pointId && !checkins[id];
          });
          const isLastPoint = isTempReport
            ? false
            : (!pointIds.length || pointIds.length <= 1 || pendingOthers.length === 0);
          const itemName = issue.itemName || page.itemName;
          page.itemName = itemName;
          const patchIssue = {
            reinspectTempReport: page.reinspectTempReport,
            reinspectIsLastPoint: isLastPoint
          };
          if (itemName) {
            patchIssue.refImage = patrolRefImage.resolve(page.itemId, itemName);
          }
          page.setData(patchIssue);
        });
      }
      return;
    }

    patrolTask.getSubtask(this.taskId, this.subtaskCode).then(function (sub) {
      if (sub) {
        patch.standard = sub.standard || '—';
        patch.refImage = patrolRefImage.resolve(sub.itemId, sub.itemName);
      }
      if (this.data.viewOnly) {
        const pr = (sub && sub.guardPointResults || {})[this.pointId] || {};
        const checkinAt = (sub && sub.guardCheckins || {})[this.pointId] || '';
        this.setData(Object.assign(patch, {
          savedResult: pr,
          savedIssues: patrolIssue.normalizeIssuesFromPointResult(pr),
          checkinAt: checkinAt,
          pointActorName: patrolFormat.formatPointCheckinActorName(pr)
        }));
        return;
      }
      this.setData(patch);
    }.bind(this));
  },

  verifyPoint(code) {
    const point = this.data.point;
    const expect = point.scanCode || point.id;
    if (code && code.indexOf(expect) >= 0) {
      this.setData({ verified: true });
      wx.showToast({ title: '验证通过', icon: 'success' });
      return true;
    }
    wx.showToast({ title: '巡更点不匹配', icon: 'none' });
    return false;
  },

  scanCode() {
    const point = this.data.point;
    if (!point) return;
    const expect = point.scanCode || point.id;
    const assetHint = point.kind === '资产类' ? '资产标签「' + expect + '」' : '「' + (point.name || expect) + '」二维码';
    if (isDevToolsEnv()) {
      wx.showModal({
        title: '模拟扫码',
        content: '开发者工具无法调用摄像头。是否模拟扫描' + assetHint + '完成验证？',
        confirmText: '模拟通过',
        success: function (res) {
          if (res.confirm) this.verifyPoint(expect);
        }.bind(this)
      });
      return;
    }
    wx.scanCode({
      onlyFromCamera: true,
      success: function (res) {
        this.verifyPoint(res.result);
      }.bind(this),
      fail: function () {
        wx.showToast({ title: '扫码失败，请重试', icon: 'none' });
      }
    });
  },

  scanNfc() {
    const point = this.data.point;
    if (!point) return;
    const expect = point.scanCode || point.id;
    const assetScan = require('../../../utils/asset-scan');
    assetScan.scanNfcTag({
      expectHint: expect,
      simulateCode: expect
    }).then(function (code) {
      this.verifyPoint(code || expect);
    }.bind(this)).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      const msg = err && err.message === 'nfc_unsupported'
        ? '当前设备不支持 NFC'
        : (err && err.message === 'nfc_timeout' ? 'NFC 读取超时，请重试' : 'NFC 验证失败，请重试');
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  accessCheckin() {
    wx.showModal({
      title: '门禁打卡',
      content: '确认已在「' + this.data.point.name + '」门禁设备完成通行？',
      success: function (res) {
        if (res.confirm) this.setData({ verified: true });
      }.bind(this)
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
      patch.recordingIssueIndex = -1;
    }
    this.setData(patch);
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onReinspectResultPick(e) {
    this.setData({ reinspectResultIndex: parseInt(e.detail.value, 10) || 0 });
  },

  onReinspectRemarkInput(e) {
    this.setData({ reinspectRemark: e.detail.value });
  },

  chooseReinspectAttachments() {
    const remain = 9 - this.data.reinspectAttachments.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个附件', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const attachments = this.data.reinspectAttachments.slice();
        res.tempFiles.forEach(function (file) {
          const isVideo = file.fileType === 'video';
          attachments.push({
            type: isVideo ? 'video' : 'image',
            path: file.tempFilePath,
            name: (isVideo ? '视频' : '图片') + attachments.length,
            label: (isVideo ? '视频' : '图片') + attachments.length
          });
        });
        this.setData({ reinspectAttachments: attachments });
      }.bind(this)
    });
  },

  removeReinspectAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.reinspectAttachments.slice();
    attachments.splice(index, 1);
    this.setData({ reinspectAttachments: attachments });
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

  toggleVoiceRecord(e) {
    const idx = e.currentTarget.dataset.index;
    if (this.data.recordingIssueIndex === idx) {
      this.recorder.stop();
      return;
    }
    if (this.data.recordingIssueIndex >= 0) {
      wx.showToast({ title: '请先结束当前录音', icon: 'none' });
      return;
    }
    wx.authorize({
      scope: 'scope.record',
      success: function () {
        this.setData({ recordingIssueIndex: idx });
        this.recorder.start({ duration: 60000, format: 'mp3' });
        wx.showToast({ title: '正在录音…', icon: 'none' });
      }.bind(this),
      fail: function () {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中允许录音，以便语音录入问题描述',
          confirmText: '去设置',
          success: function (res) {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  removeVoice(e) {
    const idx = e.currentTarget.dataset.index;
    const issues = this.data.issues.slice();
    issues[idx] = Object.assign({}, issues[idx], { issueDescVoice: null });
    this.setData({ issues: issues });
  },

  playVoice(e) {
    this._playIssueVoice(Number(e.currentTarget.dataset.index), 'issues');
  },

  playSavedVoice(e) {
    this._playIssueVoice(Number(e.currentTarget.dataset.index), 'savedIssues');
  },

  _playIssueVoice(index, listKey) {
    const issue = (this.data[listKey] || [])[index] || {};
    const voice = issue.issueDescVoice;
    if (!voice) return;
    const page = this;
    patrolIssueMedia.playIssueVoice(voice, this.audio, {
      onBeforePlay: function () {
        if (page._voiceSimTimer) {
          clearTimeout(page._voiceSimTimer);
          page._voiceSimTimer = null;
        }
        page.setData({ voicePlayingIndex: index });
      },
      onEnded: function () {
        page.setData({ voicePlayingIndex: -1 });
      },
      onSimulatedPlay: function (v) {
        patrolIssueMedia.startSimulatedVoicePlayback(page, index, v, '_voiceSimTimer');
      }
    });
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
    if (!this.data.verified) {
      wx.showToast({ title: '请先完成打卡验证', icon: 'none' });
      return;
    }
    if (this.reinspectMode && this.issueNo) {
      const page = this;
      const isTempReport = this.reinspectTempReport || this.data.reinspectTempReport;
      const isLastPoint = !isTempReport && this.data.reinspectIsLastPoint;
      if (isLastPoint) {
        const result = this.data.reinspectResultIndex > 0
          ? this.data.reinspectResultOptions[this.data.reinspectResultIndex]
          : '';
        if (!result || result === '请选择') {
          wx.showToast({ title: '请选择复检结果', icon: 'none' });
          return;
        }
      }
      this.setData({ submitting: true });
      patrolTask.submitIssueReinspectCheckin(this.issueNo, this.pointId).then(function (res) {
        if (!res || !res.ok) {
          page.setData({ submitting: false });
          wx.showToast({ title: (res && res.message) || '打卡失败', icon: 'none' });
          return;
        }
        if (!isLastPoint) {
          page.setData({ submitting: false });
          wx.showToast({ title: '本点打卡成功', icon: 'success' });
          setTimeout(function () { wx.navigateBack(); }, 600);
          return;
        }
        const result = page.data.reinspectResultOptions[page.data.reinspectResultIndex];
        const payload = {
          method: '现场',
          result: result,
          remark: (page.data.reinspectRemark || '').trim(),
          files: page.data.reinspectAttachments.map(function (f) {
            return { type: f.type, name: f.name, label: f.label, path: f.path };
          })
        };
        patrolTask.submitIssueReinspect(page.issueNo, payload).then(function (res2) {
          page.setData({ submitting: false });
          if (!res2 || !res2.ok) {
            wx.showToast({ title: (res2 && res2.message) || '提交失败', icon: 'none' });
            return;
          }
          const msg = res2.status === '已完成' ? '问题已完成' :
            (result === '不合格' ? '已退回待整改' : '复检已提交');
          patrolToast.showSuccess(msg);
          patrolIssueListRefresh.finishIssueFlow(res2.status || '待整改', { issueNo: page.issueNo });
        }).catch(function () {
          page.setData({ submitting: false });
        });
      }).catch(function () {
        page.setData({ submitting: false });
      });
      return;
    }
    const data = this.data;
    if (data.result === '异常') {
      const check = patrolIssue.validateIssues(data.issues);
      if (!check.ok) {
        wx.showToast({ title: check.message, icon: 'none' });
        return;
      }
    }
    patrolTask.submitGuardCheckin(this.taskId, this.subtaskCode, {
      pointId: this.pointId,
      checkinType: data.checkinMode,
      result: data.result,
      remark: data.remark,
      issues: data.result === '异常' ? data.issues : []
    }).then(function (res) {
      if (!res.ok) {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
        return;
      }
      wx.showToast({
        title: res.completed ? '全部巡更点已完成' : '打卡成功',
        icon: 'success'
      });
      setTimeout(function () { wx.navigateBack(); }, 600);
    });
  }
});
