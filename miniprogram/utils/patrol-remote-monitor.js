/** 远程巡检监控区交互（码流切换 / 自适应 / 全屏） */

function streamMeta(streamType) {
  return streamType === 'sub' ? '720P · 子码流' : '1080P · 主码流';
}

function buildMonitorMeta(deviceLabel, streamType) {
  const label = (deviceLabel || '—').trim();
  return label + ' · ' + streamMeta(streamType || 'main');
}

function getInitialData() {
  return {
    streamType: 'main',
    monitorMeta: '',
    videoFit: 'cover',
    audioOn: true
  };
}

function syncMonitorMeta(page, deviceLabel) {
  const streamType = (page.data && page.data.streamType) || 'main';
  page.setData({
    monitorMeta: buildMonitorMeta(deviceLabel, streamType)
  });
}

function onStreamSwitch(page, e) {
  const stream = e.currentTarget.dataset.stream;
  if (!stream || stream === page.data.streamType) return;
  const deviceLabel = page.data.currentDeviceLabel || extractDeviceLabel(page.data.monitorMeta);
  page.setData({
    streamType: stream,
    monitorMeta: buildMonitorMeta(deviceLabel, stream)
  });
  wx.showToast({
    title: '已切换至' + (stream === 'main' ? '主' : '子') + '码流',
    icon: 'none'
  });
}

function extractDeviceLabel(monitorMeta) {
  const text = (monitorMeta || '').trim();
  if (!text) return '—';
  const idx = text.indexOf(' · ');
  return idx >= 0 ? text.slice(0, idx) : text;
}

function onToggleFit(page) {
  const videoFit = page.data.videoFit === 'cover' ? 'contain' : 'cover';
  page.setData({ videoFit: videoFit });
  wx.showToast({
    title: videoFit === 'contain' ? '已切换画面自适应' : '已恢复默认缩放',
    icon: 'none'
  });
}

function restorePortrait() {
  if (typeof wx.setPageOrientation !== 'function') return;
  wx.setPageOrientation({ orientation: 'portrait' });
  setTimeout(function () {
    wx.setPageOrientation({ orientation: 'portrait' });
  }, 100);
}

function onMonitorPageShow() {
  restorePortrait();
}

function enterFullscreen(page, options) {
  options = options || {};
  const d = page.data || {};
  const title = encodeURIComponent(options.title || '实时视频');
  wx.navigateTo({
    url: '/packages/patrol/remote-monitor-fullscreen/index?monitorMeta=' +
      encodeURIComponent(d.monitorMeta || '') +
      '&streamType=' + encodeURIComponent(d.streamType || 'main') +
      '&videoFit=' + encodeURIComponent(d.videoFit || 'cover') +
      '&audioOn=' + (d.audioOn ? '1' : '0') +
      '&title=' + title,
    events: {
      monitorStateChange: function (data) {
        const patch = {
          streamType: data.streamType,
          monitorMeta: data.monitorMeta,
          videoFit: data.videoFit,
          audioOn: data.audioOn
        };
        if (data.monitorTab) patch.monitorTab = data.monitorTab;
        page.setData(patch);
      }
    }
  });
}

function onToggleFullscreen(page, options) {
  enterFullscreen(page, options);
}

function onMonitorVc(page, e) {
  const action = e.currentTarget.dataset.action;
  if (!action) return;
  if (action === 'fit') {
    onToggleFit(page);
    return;
  }
  if (action === 'capture') {
    wx.showToast({ title: '抓图成功', icon: 'success' });
    return;
  }
  if (action === 'replay') {
    page.setData({ monitorTab: 'replay' });
    wx.showToast({ title: '已切换即时回放', icon: 'none' });
    return;
  }
  if (action === 'audio') {
    const audioOn = !page.data.audioOn;
    page.setData({ audioOn: audioOn });
    wx.showToast({ title: audioOn ? '声音已开启' : '声音已关闭', icon: 'none' });
  }
}

module.exports = {
  streamMeta: streamMeta,
  buildMonitorMeta: buildMonitorMeta,
  getInitialData: getInitialData,
  syncMonitorMeta: syncMonitorMeta,
  onStreamSwitch: onStreamSwitch,
  onToggleFit: onToggleFit,
  onToggleFullscreen: onToggleFullscreen,
  onMonitorVc: onMonitorVc,
  restorePortrait: restorePortrait,
  onMonitorPageShow: onMonitorPageShow
};
