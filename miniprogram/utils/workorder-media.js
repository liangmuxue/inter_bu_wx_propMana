/** 工单图片 / 附件演示资源（对齐 PC workorder-service.js） */

const DEMO_WOS_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

function wosDemoImageUrl(label) {
  const text = String(label || '上报图片').slice(0, 14);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#93c5fd"/></linearGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#1e40af" font-size="28" font-family="sans-serif">' +
    text + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function wosDemoFilePreview(name) {
  return '演示附件：' + (name || '未命名文件') + '\n本文件仅用于原型演示，不代表真实业务文档内容。';
}

function isWosVideoName(name) {
  return /\.(mp4|mov|avi|webm|mkv)$/i.test(String(name || ''));
}

function normalizeReportImages(order) {
  if (!order) return [];
  if (Array.isArray(order.reportImages) && order.reportImages.length) {
    return order.reportImages.map(function (img, i) {
      if (typeof img === 'string') {
        return { name: img, url: wosDemoImageUrl(img) };
      }
      const name = img.name || ('上报图片' + (i + 1) + '.jpg');
      return {
        name: name,
        url: img.url || img.path || wosDemoImageUrl(name)
      };
    });
  }
  const n = Number(order.images) || 0;
  const list = [];
  for (let i = 0; i < n; i++) {
    const name = '上报图片' + (i + 1) + '.jpg';
    list.push({ name: name, url: wosDemoImageUrl('图片' + (i + 1)) });
  }
  return list;
}

function normalizeReportAttachments(order) {
  if (!order) return [];
  const list = [];
  if (Array.isArray(order.reportAttachments) && order.reportAttachments.length) {
    order.reportAttachments.forEach(function (f) {
      if (!f) return;
      if (typeof f === 'string') {
        const isVideo = isWosVideoName(f);
        list.push({
          name: f,
          type: isVideo ? 'video' : 'file',
          url: isVideo ? DEMO_WOS_VIDEO_URL : '',
          previewText: isVideo ? '' : wosDemoFilePreview(f)
        });
        return;
      }
      const name = f.name || '附件';
      const isVideo = f.type === 'video' || isWosVideoName(name);
      list.push({
        name: name,
        type: isVideo ? 'video' : (f.type || 'file'),
        url: f.url || f.path || (isVideo ? DEMO_WOS_VIDEO_URL : ''),
        previewText: isVideo ? '' : wosDemoFilePreview(name)
      });
    });
  }
  if (order.video === true || order.video === 1 || order.video === '1') {
    const hasVideo = list.some(function (x) { return x.type === 'video'; });
    if (!hasVideo) {
      list.push({ name: '现场视频.mp4', type: 'video', url: DEMO_WOS_VIDEO_URL, previewText: '' });
    }
  }
  return list;
}

function normalizeNodeImages(list, prefix) {
  return (list || []).map(function (img, idx) {
    if (typeof img === 'string') {
      return { name: img, url: wosDemoImageUrl(img) };
    }
    const name = img.name || ((prefix || '图片') + (idx + 1));
    return {
      name: name,
      url: img.url || img.path || wosDemoImageUrl(name)
    };
  });
}

function normalizeNodeAttachments(list) {
  return (list || []).map(function (file, idx) {
    if (typeof file === 'string') {
      const isVideo = isWosVideoName(file);
      return {
        name: file,
        type: isVideo ? 'video' : 'file',
        url: isVideo ? DEMO_WOS_VIDEO_URL : '',
        previewText: isVideo ? '' : wosDemoFilePreview(file)
      };
    }
    const name = file.name || ('附件' + (idx + 1));
    const isVideo = file.type === 'video' || isWosVideoName(name);
    return {
      name: name,
      type: isVideo ? 'video' : (file.type || 'file'),
      url: file.url || file.path || (isVideo ? DEMO_WOS_VIDEO_URL : ''),
      previewText: isVideo ? '' : wosDemoFilePreview(name)
    };
  });
}

function enrichTimelineNodes(order, reportImages, reportAttachments) {
  return (order.timeline || []).map(function (node) {
    const item = Object.assign({}, node);
    let images = item.images ? item.images.slice() : [];
    let attachments = item.attachments ? item.attachments.slice() : [];
    if (item.stage === '申请') {
      if (!images.length && reportImages.length) images = reportImages.slice();
      if (!attachments.length && reportAttachments.length) attachments = reportAttachments.slice();
      item.imageLabel = item.imageLabel || '上报图片';
      item.attachmentLabel = item.attachmentLabel || '上报附件';
    }
    const displayImages = normalizeNodeImages(images, item.imageLabel || '图片');
    const displayAttachments = normalizeNodeAttachments(attachments);
    item.displayImages = displayImages;
    item.displayAttachments = displayAttachments;
    item.imageUrls = displayImages.map(function (img) { return img.url; }).filter(Boolean);
    item.hasImages = displayImages.length > 0;
    item.hasAttachments = displayAttachments.length > 0;
    item.hasVideos = displayAttachments.some(function (f) { return f.type === 'video'; });
    item.displayVideos = displayAttachments.filter(function (f) { return f.type === 'video'; });
    item.fileAttachments = displayAttachments.filter(function (f) { return f.type !== 'video'; });
    return item;
  });
}

module.exports = {
  DEMO_WOS_VIDEO_URL: DEMO_WOS_VIDEO_URL,
  wosDemoImageUrl: wosDemoImageUrl,
  normalizeReportImages: normalizeReportImages,
  normalizeReportAttachments: normalizeReportAttachments,
  normalizeNodeImages: normalizeNodeImages,
  normalizeNodeAttachments: normalizeNodeAttachments,
  enrichTimelineNodes: enrichTimelineNodes
};
