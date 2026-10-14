const assetService = require('../../../services/asset');
const assetScan = require('../../../utils/asset-scan');
const pageAccess = require('../../../utils/page-access');

/** 对齐 PC INV_RESULT_STATUSES */
const RESULT_OPTIONS = ['未盘', '相符', '异常', '盘亏'];
const MAX_INV_IMAGES = 4;

Page({
  data: {
    task: null,
    keyword: '',
    pendingCount: 0,
    displayItems: [],
    showSheet: false,
    editing: null,
    resultOptions: RESULT_OPTIONS,
    resultIndex: 0,
    showResultExtra: false,
    invRemark: '',
    invImages: [],
    maxImages: MAX_INV_IMAGES,
    scanMethod: '手动',
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.id || '';
    this.loadTask();
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    if (this.taskId && this.data.task) {
      this.loadTask();
    }
  },

  onAddSurplus() {
    if (!this.taskId) return;
    wx.navigateTo({
      url: '/packages/device/inventory-surplus/index?taskId=' + encodeURIComponent(this.taskId)
    });
  },

  loadTask() {
    wx.showLoading({ title: '加载中' });
    return assetService.getInventory(this.taskId).then(function (task) {
      wx.hideLoading();
      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        return;
      }
      if (!task.canExecute) {
        wx.showToast({ title: '仅盘点人可执行盘点', icon: 'none' });
        setTimeout(function () {
          wx.navigateBack({ fail: function () {} });
        }, 1000);
        return;
      }
      this.setData({ task: task });
      this.applyItemFilter();
    }.bind(this)).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  onSearch() {
    this.applyItemFilter();
  },

  onResetSearch() {
    this.setData({ keyword: '' });
    this.applyItemFilter();
  },

  applyItemFilter() {
    const task = this.data.task;
    if (!task) return;
    const kw = String(this.data.keyword || '').trim().toLowerCase();
    let items = (task.items || []).slice();
    if (kw) {
      items = items.filter(function (it) {
        return String(it.assetCode || '').toLowerCase().indexOf(kw) >= 0 ||
          String(it.assetName || '').toLowerCase().indexOf(kw) >= 0;
      });
    }
    const pendingCount = items.filter(function (it) {
      return it.invStatus === '未盘';
    }).length;
    this.setData({ displayItems: items, pendingCount: pendingCount });
  },

  previewInvImages(e) {
    const assetId = e.currentTarget.dataset.assetId;
    const index = Number(e.currentTarget.dataset.index) || 0;
    const item = (this.data.displayItems || []).find(function (it) {
      return it.assetId === assetId;
    }) || (this.data.task && (this.data.task.items || []).find(function (it) {
      return it.assetId === assetId;
    }));
    const urls = (item && item.invImageUrls) || [];
    if (!urls.length) return;
    wx.previewImage({ current: urls[index] || urls[0], urls: urls });
  },

  openAssetDetail(e) {
    const code = e.currentTarget.dataset.code;
    if (!code) return;
    wx.navigateTo({
      url: '/packages/device/asset-detail/index?code=' + encodeURIComponent(code) + '&from=inventory',
      fail: function () {
        wx.showToast({ title: '暂无资产详情页', icon: 'none' });
      }
    });
  },

  onManualEdit(e) {
    if (!this.data.task || !this.data.task.canExecute) {
      wx.showToast({ title: '仅盘点人可执行盘点', icon: 'none' });
      return;
    }
    const code = e.currentTarget.dataset.code;
    const item = (this.data.task.items || []).find(function (it) {
      return it.assetCode === code;
    });
    if (!item) return;
    if (item.invStatus === '盘盈') {
      wx.showToast({ title: '盘盈请通过删除盘盈处理', icon: 'none' });
      return;
    }
    this.openEdit(item, '手动');
  },

  onDeleteSurplus(e) {
    const assetId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '';
    const page = this;
    wx.showModal({
      title: '删除盘盈',
      content: '确定删除盘盈资产「' + name + '」吗？将从本盘点清单移除（盘盈尚未入账，不影响资产台账）',
      success: function (res) {
        if (!res.confirm) return;
        assetService.deleteInventorySurplus({
          taskId: page.taskId,
          assetId: assetId
        }).then(function (ret) {
          if (!ret || !ret.ok) {
            wx.showToast({ title: (ret && ret.message) || '删除失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: '已删除', icon: 'success' });
          page.setData({ task: ret.task });
          page.applyItemFilter();
        }).catch(function () {
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      }
    });
  },

  /** 开发者工具模拟：取本任务内资产（优先异常 + 标签类型） */
  pickInScopeSimulateAsset(preferTagType) {
    const items = ((this.data.task && this.data.task.items) || []).filter(function (it) {
      return it && it.invStatus !== '盘盈';
    });
    if (!items.length) return null;
    const abnormal = items.filter(function (it) { return it.invStatus === '异常'; });
    const pool = abnormal.length ? abnormal : items;
    const tagMatched = preferTagType
      ? pool.filter(function (it) {
          return String(it.tagType || '') === preferTagType ||
            (preferTagType === 'NFC标签' && String(it.tagType || '').indexOf('NFC') >= 0);
        })
      : [];
    return tagMatched[0] || pool[0] || null;
  },

  /** 开发者工具模拟：取不在本任务内的演示资产编号 */
  pickOutOfScopeSimulateCode(preferTagType) {
    const inCodes = {};
    ((this.data.task && this.data.task.items) || []).forEach(function (it) {
      if (it && it.assetCode) inCodes[it.assetCode] = true;
      if (it && it.assetId) inCodes[it.assetId] = true;
    });
    // 与 mock/asset.js 台账对齐的演示编号
    const qrCandidates = [
      { code: 'ZC-20260601-004', name: '潜污泵 2#' },
      { code: 'ZC-20260530-001', name: '离心式冷水机组' },
      { code: 'ZC-20260619-008', name: '生活水泵 1#' },
      { code: 'ZC-20260718-012', name: '应急照明蓄电池组' }
    ];
    const nfcCandidates = [
      { code: 'ZC-20260618-007', name: '冷却塔 1#' },
      { code: 'ZC-20260620-010', name: '低压配电柜 A1' },
      { code: 'ZC-20260620-011', name: '门禁控制器 大堂' }
    ];
    const pool = preferTagType === 'NFC标签' ? nfcCandidates : qrCandidates;
    const hit = pool.find(function (a) { return !inCodes[a.code]; });
    if (hit) return hit;
    // 兜底：任意不在任务内的演示码
    const all = qrCandidates.concat(nfcCandidates);
    return all.find(function (a) { return !inCodes[a.code]; }) ||
      { code: 'ZC-OUT-OF-SCOPE', name: '范围外演示资产' };
  },

  onScanQr() {
    if (!this.data.task || !this.data.task.canExecute) {
      wx.showToast({ title: '仅盘点人可执行盘点', icon: 'none' });
      return;
    }
    // 开发者工具：二维码固定模拟「本任务内」资产（优先异常）
    const inItem = this.pickInScopeSimulateAsset('二维码');
    const simCode = (inItem && inItem.assetCode) || 'ZC-20260619-008';
    const page = this;
    assetScan.scanQrCode({
      expectHint: simCode,
      simulateCode: simCode
    }).then(function (code) {
      page.handleScannedCode(code, '二维码');
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      wx.showToast({ title: '扫码失败', icon: 'none' });
    });
  },

  onScanNfc() {
    if (!this.data.task || !this.data.task.canExecute) {
      wx.showToast({ title: '仅盘点人可执行盘点', icon: 'none' });
      return;
    }
    // 开发者工具：NFC 固定模拟「不在本任务内」资产
    const outItem = this.pickOutOfScopeSimulateCode('NFC标签');
    const simCode = (outItem && outItem.code) || 'ZC-20260618-007';
    const page = this;
    assetScan.scanNfcTag({
      expectHint: simCode,
      simulateCode: simCode
    }).then(function (code) {
      page.handleScannedCode(code, 'NFC');
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      const msg = err && err.message === 'nfc_unsupported'
        ? '当前设备不支持 NFC'
        : (err && err.message === 'nfc_timeout' ? 'NFC 读取超时，请重试' : 'NFC 读取失败，请重试');
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  normalizeScanCode(raw) {
    return assetScan.normalizeScanCode(raw);
  },

  handleScannedCode(raw, scanMethod) {
    const task = this.data.task;
    if (!task) return;
    const code = this.normalizeScanCode(raw);
    if (!code) {
      wx.showToast({ title: '未识别到资产编号', icon: 'none' });
      return;
    }
    const item = (task.items || []).find(function (it) {
      return code === it.assetCode || code === it.assetId ||
        (it.assetCode && code.indexOf(it.assetCode) >= 0);
    });
    if (!item) {
      wx.showToast({ title: '不在本任务范围：' + code, icon: 'none' });
      return;
    }
    if (item.invStatus === '盘盈') {
      wx.showToast({ title: '盘盈资产请使用删除盘盈', icon: 'none' });
      return;
    }
    this.openEdit(item, scanMethod);
  },

  openEdit(item, scanMethod) {
    let resultIndex = RESULT_OPTIONS.indexOf(item.invStatus);
    if (resultIndex < 0) resultIndex = 0;
    const images = (item.invImages || []).map(function (img) {
      return {
        name: img.name || '盘点图片',
        path: img.path || img.url,
        url: img.url || img.path
      };
    }).filter(function (img) { return !!img.path; });
    const status = RESULT_OPTIONS[resultIndex] || '未盘';
    this.setData({
      showSheet: true,
      editing: item,
      resultIndex: resultIndex,
      showResultExtra: status !== '未盘',
      invRemark: item.invRemark || '',
      invImages: images,
      scanMethod: scanMethod || '手动'
    });
  },

  closeSheet() {
    this.setData({ showSheet: false, editing: null, invImages: [], showResultExtra: false });
  },

  onResultPick(e) {
    const resultIndex = Number(e.detail.value) || 0;
    const status = RESULT_OPTIONS[resultIndex] || '未盘';
    this.setData({
      resultIndex: resultIndex,
      showResultExtra: status !== '未盘'
    });
  },

  onRemarkInput(e) {
    this.setData({ invRemark: e.detail.value });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.invImages.length;
    if (remain <= 0) return;
    const page = this;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const files = (res.tempFiles || []).map(function (f) {
          return {
            name: '盘点图片',
            path: f.tempFilePath,
            url: f.tempFilePath
          };
        });
        page.setData({ invImages: page.data.invImages.concat(files).slice(0, MAX_INV_IMAGES) });
      }
    });
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = this.data.invImages.slice();
    if (index < 0 || index >= images.length) return;
    images.splice(index, 1);
    this.setData({ invImages: images });
  },

  previewSheetImages(e) {
    const index = Number(e.currentTarget.dataset.index) || 0;
    const urls = this.data.invImages.map(function (img) { return img.path || img.url; });
    if (!urls.length) return;
    wx.previewImage({ current: urls[index] || urls[0], urls: urls });
  },

  submitResult() {
    if (this.data.submitting || !this.data.editing) return;
    const item = this.data.editing;
    const invStatus = RESULT_OPTIONS[this.data.resultIndex] || '未盘';
    if (invStatus === '盘盈') {
      wx.showToast({ title: '盘点结果不可设为盘盈', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    assetService.submitInventoryResult({
      taskId: this.taskId,
      assetId: item.assetId,
      assetCode: item.assetCode,
      invStatus: invStatus,
      invRemark: invStatus === '未盘' ? '' : this.data.invRemark,
      invImages: invStatus === '未盘' ? [] : this.data.invImages,
      scanMethod: this.data.scanMethod
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
        return;
      }
      wx.showToast({
        title: res.task && res.task.status === '盘点完成' ? '已全部完成' : '盘点结果已保存',
        icon: 'success'
      });
      this.setData({ showSheet: false, editing: null, invImages: [], showResultExtra: false, task: res.task });
      this.applyItemFilter();
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    }.bind(this));
  },

  preventClose() {}
});
