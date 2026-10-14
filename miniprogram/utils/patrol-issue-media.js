/** 巡检问题图片预览与语音播放 */

function resolveImageUrl(img) {
  img = img || {};
  return img.path || img.previewUrl || img.url || '';
}

function collectImageUrls(images) {
  return (images || [])
    .map(resolveImageUrl)
    .filter(function (url) { return !!url; });
}

function previewIssueImages(images, currentIndex) {
  const urls = collectImageUrls(images);
  if (!urls.length) {
    wx.showToast({ title: '暂无图片预览', icon: 'none' });
    return;
  }
  const idx = currentIndex != null ? currentIndex : 0;
  const current = urls[idx] || urls[0];
  wx.previewImage({
    current: current,
    urls: urls
  });
}

function resolveVoiceSrc(voice) {
  voice = voice || {};
  return voice.tempFilePath || voice.url || voice.demoUrl || '';
}

function playIssueVoice(voice, audio, options) {
  options = options || {};
  voice = voice || {};
  const src = resolveVoiceSrc(voice);

  if (!src) {
    if (typeof options.onSimulatedPlay === 'function') {
      options.onSimulatedPlay(voice);
      return audio;
    }
    if (voice.transcript) {
      wx.showModal({
        title: '语音描述',
        content: voice.transcript,
        showCancel: false
      });
    } else {
      wx.showToast({ title: '暂无语音文件', icon: 'none' });
    }
    return null;
  }

  audio = audio || wx.createInnerAudioContext();
  if (typeof options.onBeforePlay === 'function') {
    options.onBeforePlay();
  }

  audio.stop();
  audio.offEnded();
  audio.offError();

  audio.onEnded(function () {
    if (typeof options.onEnded === 'function') options.onEnded();
  });
  audio.onError(function () {
    if (voice.transcript) {
      wx.showModal({
        title: '语音描述',
        content: voice.transcript,
        showCancel: false
      });
    } else {
      wx.showToast({ title: '语音播放失败', icon: 'none' });
    }
    if (typeof options.onEnded === 'function') options.onEnded();
  });

  audio.src = src;
  audio.play();
  return audio;
}

function startSimulatedVoicePlayback(page, index, voice, timerKey) {
  timerKey = timerKey || '_voiceSimTimer';
  voice = voice || {};
  const durationSec = Math.max(1, Number(voice.durationSec) || 3);
  const playingKey = page.data.voicePlayingIndex === index ? -1 : index;

  if (page[timerKey]) {
    clearTimeout(page[timerKey]);
    page[timerKey] = null;
  }
  if (page.data.voicePlayingIndex === index) {
    page.setData({ voicePlayingIndex: -1 });
    return;
  }
  if (page.audio) page.audio.stop();
  page.setData({ voicePlayingIndex: index });
  page[timerKey] = setTimeout(function () {
    page.setData({ voicePlayingIndex: -1 });
    page[timerKey] = null;
  }, durationSec * 1000);
}

module.exports = {
  resolveImageUrl: resolveImageUrl,
  collectImageUrls: collectImageUrls,
  previewIssueImages: previewIssueImages,
  resolveVoiceSrc: resolveVoiceSrc,
  playIssueVoice: playIssueVoice,
  startSimulatedVoicePlayback: startSimulatedVoicePlayback
};
