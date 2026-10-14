const patrolTask = require('../../../services/patrol-task');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const patrolIssueFormat = require('../../../utils/patrol-issue-format');
const patrolAttachment = require('../../../utils/patrol-attachment');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    issue: null,
    issueNo: ''
  },

  _audio: null,

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const issueNo = (options && options.issueNo) || '';
    if (!issueNo) {
      wx.showToast({ title: '缺少问题编号', icon: 'none' });
      return;
    }
    this.setData({ issueNo: issueNo });
    this.loadDetail(issueNo);
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (this.data.issueNo) {
      this.loadDetail(this.data.issueNo, true);
    }
  },

  onUnload() {
    patrolIssueMedia.destroyAudio(this._audio);
    this._audio = null;
  },

  loadDetail(issueNo, silent) {
    if (!silent) {
      this.setData({ loading: true });
    }
    patrolTask.getIssueDetail(issueNo).then(function (issue) {
      if (!issue) {
        wx.showToast({ title: '未找到问题', icon: 'none' });
        this.setData({ loading: false, issue: null });
        return;
      }
      wx.setNavigationBarTitle({ title: issue.issueNo || '问题详情' });
      const display = patrolIssueFormat.prepareIssueDetailDisplay(issue);
      display.hasPageActions = display.canEdit || display.canRectify || display.canReinspect;
      this.setData({
        issue: display,
        loading: false
      });
    }.bind(this)).catch(function () {
      this.setData({ loading: false });
    }.bind(this));
  },

  openIssueAction(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: url });
  },

  previewIssueImage(e) {
    const issueIndex = e.currentTarget.dataset.issueIndex;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    const issues = (this.data.issue && this.data.issue.issues) || [];
    const item = issues[issueIndex] || {};
    const displayImages = item.displayImages || [];
    const img = displayImages[imgIndex];
    if (img && !img.showUrl && img.caption) {
      wx.showModal({ title: img.thumbLabel || '问题图片', content: img.caption, showCancel: false });
      return;
    }
    patrolIssueMedia.previewIssueImages(item.images || [], imgIndex);
  },

  previewTimelineImage(e) {
    const nodeIndex = e.currentTarget.dataset.nodeIndex;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    const timeline = (this.data.issue && this.data.issue.timeline) || [];
    const node = timeline[nodeIndex] || {};
    const displayImages = node.displayImages || [];
    const img = displayImages[imgIndex];
    if (img && !img.showUrl && img.caption) {
      wx.showModal({ title: img.thumbLabel || '图片', content: img.caption, showCancel: false });
      return;
    }
    patrolIssueMedia.previewIssueImages(node.images || [], imgIndex);
  },

  onIssueImageError(e) {
    const issueIndex = e.currentTarget.dataset.issueIndex;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    this.setData({
      ['issue.issues[' + issueIndex + '].displayImages[' + imgIndex + '].showUrl']: false
    });
  },

  onTimelineImageError(e) {
    const nodeIndex = e.currentTarget.dataset.nodeIndex;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    this.setData({
      ['issue.timeline[' + nodeIndex + '].displayImages[' + imgIndex + '].showUrl']: false
    });
  },

  playTimelineAttachment(e) {
    const nodeIndex = e.currentTarget.dataset.nodeIndex;
    const attIndex = e.currentTarget.dataset.attIndex;
    const timeline = (this.data.issue && this.data.issue.timeline) || [];
    const att = timeline[nodeIndex] && timeline[nodeIndex].attachments
      ? timeline[nodeIndex].attachments[attIndex]
      : null;
    if (!att) return;
    this.openMediaAttachment(att);
  },

  playIssueAttachment(e) {
    const issueIndex = e.currentTarget.dataset.issueIndex;
    const attIndex = e.currentTarget.dataset.attIndex;
    const issues = (this.data.issue && this.data.issue.issues) || [];
    const att = issues[issueIndex] && issues[issueIndex].attachments
      ? issues[issueIndex].attachments[attIndex]
      : null;
    if (!att) return;
    this.openMediaAttachment(att);
  },

  openMediaAttachment(att) {
    const url = patrolAttachment.resolveAttachmentUrl(att);
    if (att.type === 'image' && url) {
      wx.previewImage({ urls: [url], current: url });
      return;
    }
    patrolAttachment.playIssueAttachment(att);
  }
});
