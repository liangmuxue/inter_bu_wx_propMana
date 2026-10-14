const patrolTask = require('../../../services/patrol-task');
const patrolFormat = require('../../../utils/patrol-format');
const patrolRefImage = require('../../../utils/patrol-ref-image');
const patrolAttachment = require('../../../utils/patrol-attachment');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    subtask: null,
    refImage: null,
    savedIssues: [],
    aiResult: {},
    autoHint: '',
    loading: false,
    pendingSystem: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId;
    this.subtaskCode = options.subtaskCode;
    this.load();
  },

  load() {
    const self = this;
    // 自动巡检仅系统执行：打开页面只查看，不由人工触发分析
    patrolTask.getSubtask(this.taskId, this.subtaskCode).then(function (sub) {
      if (!sub) {
        wx.showToast({ title: '巡检项不存在', icon: 'none' });
        return;
      }
      self.applySubtask(sub);
    });
  },

  applySubtask(sub) {
    const done = sub.autoRan || sub.status === '已完成';
    const aiResult = sub.aiResult || {
      model: sub.aiModel || '—',
      channels: sub.aiChannels || '—',
      conclusion: sub.result === '异常' ? '异常' : '正常',
      confidence: sub.aiConfidence || '—',
      detail: sub.aiDetail || '—'
    };
    let autoHint = '自动巡检由系统执行，任务开始时根据算法模型及关联通道自动完成 AI 智能分析；人工不可执行。';
    if (done) {
      autoHint = '任务开始时系统已根据算法模型及关联通道自动完成 AI 智能分析';
      if (sub.algoMissed) {
        autoHint = '算法未识别到异常，系统已按正常完成本次自动巡检';
      }
    } else {
      autoHint = '自动巡检由系统执行，尚未完成分析；请等待系统在任务开始后自动执行，人工不可操作。';
    }
    this.setData({
      subtask: Object.assign({}, sub, { statusClass: patrolFormat.statusTagClass(sub.status) }),
      refImage: sub.refImage || patrolRefImage.resolve(sub.itemId, sub.itemName),
      savedIssues: (sub.issues || []).map(function (iss, idx) {
        return {
          id: iss.id || iss.issueNo || ('issue-' + idx),
          desc: iss.desc || '',
          images: (iss.images || []).map(function (img) {
            return { path: img.path || img.previewUrl, name: img.label || img.name || '图片' };
          }),
          attachments: (iss.attachments || []).slice()
        };
      }),
      aiResult: aiResult,
      autoHint: autoHint,
      pendingSystem: !done,
      loading: false
    });
  },

  playSavedIssueAttachment(e) {
    const idx = e.currentTarget.dataset.index;
    const attIdx = e.currentTarget.dataset.attIndex;
    const att = (this.data.savedIssues[idx].attachments || [])[attIdx];
    if (att) patrolAttachment.playIssueAttachment(att);
  },

  previewSavedIssueImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgIdx = e.currentTarget.dataset.imgIndex;
    patrolIssueMedia.previewIssueImages(this.data.savedIssues[idx].images, imgIdx);
  }
});
