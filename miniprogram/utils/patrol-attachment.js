/** 巡检问题视频附件播放 */
const DEMO_VIDEO_SRC =
  'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4';

function resolveAttachmentUrl(att) {
  att = att || {};
  return att.path || att.url || att.previewUrl || '';
}

function playIssueAttachment(att) {
  att = att || {};
  const url = resolveAttachmentUrl(att);
  const title = att.label || att.name || '视频附件';

  // 统一走带「关闭」按钮的预览页，避免系统 previewMedia 难以退出
  if (url) {
    wx.navigateTo({
      url: '/packages/patrol/video-preview/index?src=' +
        encodeURIComponent(url) + '&title=' + encodeURIComponent(title)
    });
    return;
  }

  wx.navigateTo({
    url: '/packages/patrol/video-preview/index?demo=1&title=' +
      encodeURIComponent(title) +
      (att.durationSec ? '&duration=' + att.durationSec : '')
  });
}

module.exports = {
  DEMO_VIDEO_SRC: DEMO_VIDEO_SRC,
  resolveAttachmentUrl: resolveAttachmentUrl,
  playIssueAttachment: playIssueAttachment
};
