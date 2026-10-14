const patrolTask = require('../../../services/patrol-task');
const patrolIssueFormat = require('../../../utils/patrol-issue-format');
const patrolIssueListRefresh = require('../../../utils/patrol-issue-list-refresh');
const patrolToast = require('../../../utils/patrol-toast');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    submitting: false,
    issue: null,
    rectifyDesc: '',
    files: []
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.issueNo = (options && options.issueNo) || '';
    if (!this.issueNo) {
      wx.showToast({ title: '缺少问题编号', icon: 'none' });
      return;
    }
    this.loadIssue();
  },

  loadIssue() {
    this.setData({ loading: true });
    patrolTask.getIssueDetail(this.issueNo).then(function (issue) {
      if (!issue) {
        wx.showToast({ title: '未找到问题', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      if (!issue.canRectify) {
        wx.showToast({ title: '仅问题处理人可执行整改', icon: 'none' });
        setTimeout(function () { wx.navigateBack(); }, 800);
        return;
      }
      this.setData({
        issue: patrolIssueFormat.prepareIssueDetailDisplay(issue),
        loading: false
      });
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    }.bind(this));
  },

  onDescInput(e) {
    this.setData({ rectifyDesc: e.detail.value });
  },

  chooseFiles() {
    const remain = 9 - this.data.files.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个附件', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const files = this.data.files.slice();
        res.tempFiles.forEach(function (file) {
          const isVideo = file.fileType === 'video' || (file.tempFilePath || '').indexOf('.mp4') >= 0;
          files.push({
            type: isVideo ? 'video' : 'image',
            path: file.tempFilePath,
            name: (isVideo ? '视频' : '图片') + files.length,
            label: (isVideo ? '视频' : '图片') + files.length
          });
        });
        this.setData({ files: files });
      }.bind(this)
    });
  },

  removeFile(e) {
    const index = e.currentTarget.dataset.index;
    const files = this.data.files.slice();
    files.splice(index, 1);
    this.setData({ files: files });
  },

  submit() {
    if (this.data.submitting) return;
    const desc = (this.data.rectifyDesc || '').trim();
    if (!desc) {
      wx.showToast({ title: '请填写整改说明', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    patrolTask.submitIssueRectify(this.issueNo, {
      rectifyDesc: desc,
      files: this.data.files.map(function (f) {
        return {
          type: f.type,
          name: f.name,
          label: f.label || f.name,
          path: f.path
        };
      })
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      let msg = '整改已提交';
      const status = res.status || '待复检';
      if (res.autoReinspected) {
        if (res.autoReinspectPass !== false) {
          msg = '问题已完成';
        } else {
          msg = '已退回待整改';
        }
      }
      patrolToast.showSuccess(msg);
      patrolIssueListRefresh.finishIssueFlow(status, { issueNo: this.issueNo });
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
    }.bind(this));
  }
});
