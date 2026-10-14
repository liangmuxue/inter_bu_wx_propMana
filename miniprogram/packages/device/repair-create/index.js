const assetService = require('../../../services/asset');
const assetScan = require('../../../utils/asset-scan');
const session = require('../../../store/session');
const env = require('../../../config/env');
const mockUsers = require('../../../config/mock-users');
const orgPerm = require('../../../config/org-permissions');
const pageAccess = require('../../../utils/page-access');

/** 与 PC device-asset-repair.js 一致：紧急 / 一般 / 轻微 */
const LEVELS = ['紧急', '一般', '轻微'];
const MAX_FAULT_IMAGES = 4;

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function nowStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function splitDateTime(str) {
  const s = String(str || nowStr()).trim();
  const parts = s.split(/\s+/);
  const timeFull = parts[1] || '00:00:00';
  return {
    date: parts[0] || '',
    time: timeFull.slice(0, 5)
  };
}

function joinDateTime(date, time) {
  const t = String(time || '00:00');
  const withSec = t.length === 5 ? t + ':00' : t;
  return (date || '') + ' ' + withSec;
}

function currentUser() {
  const u = session.getUser();
  if (u && u.id) return u;
  return mockUsers[env.mockUserId] || mockUsers.lisi;
}

function buildOrgOptions(user) {
  const all = Object.keys(orgPerm.ORGS).map(function (id) {
    return orgPerm.ORGS[id];
  });
  if (!user || user.orgId === 'ORG-ROOT' || user.role === '超级管理员') {
    return all;
  }
  const mine = all.filter(function (o) { return o.id === user.orgId; });
  return mine.length ? mine : all;
}

Page({
  data: {
    codeHint: '保存后自动生成',
    asset: null,
    reportMethod: '手动填报',
    reporterDisplay: '',
    reporterAccount: '',
    orgOptions: [],
    orgIndex: 0,
    orgId: '',
    orgName: '',
    reportDate: '',
    reportTimePart: '',
    faultDesc: '',
    faultLevel: '一般',
    levelOptions: LEVELS,
    levelIndex: 1,
    assetOptions: [],
    assetIndex: 0,
    faultImages: [],
    maxImages: MAX_FAULT_IMAGES,
    videoAttachment: null,
    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const user = currentUser();
    const orgOptions = buildOrgOptions(user);
    let orgIndex = orgOptions.findIndex(function (o) { return o.id === user.orgId; });
    if (orgIndex < 0) orgIndex = 0;
    const org = orgOptions[orgIndex] || { id: '', name: '' };
    const dt = splitDateTime(nowStr());

    this.setData({
      reporterDisplay: (user.name || '—') + '（' + (user.id || '') + '）',
      reporterAccount: user.id || '',
      orgOptions: orgOptions,
      orgIndex: orgIndex,
      orgId: org.id || '',
      orgName: org.name || '',
      reportDate: dt.date,
      reportTimePart: dt.time
    });

    const code = options.assetCode || options.code || '';
    this.loadAssetOptions().then(function () {
      if (code) this.bindAssetByCode(code, '扫码填报');
    }.bind(this));
  },

  loadAssetOptions() {
    return assetService.listAssets('').then(function (list) {
      const usable = (list || []).filter(function (a) { return a.status === '使用中'; });
      const options = usable.map(function (a) {
        return {
          id: a.id,
          code: a.code,
          label: a.name + '（' + a.code + '）'
        };
      });
      this.setData({ assetOptions: options, assetIndex: 0 });
    }.bind(this));
  },

  bindAssetByCode(code, method) {
    assetService.resolveScanCode(code, 'repair').then(function (res) {
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '未识别到资产', icon: 'none', duration: 2500 });
        return;
      }
      const asset = res.asset;
      if (asset.status !== '使用中') {
        wx.showToast({ title: '仅「使用中」资产可报修', icon: 'none' });
        return;
      }
      const idx = this.data.assetOptions.findIndex(function (o) { return o.id === asset.id; });
      this.setData({
        asset: asset,
        reportMethod: method || '扫码填报',
        assetIndex: idx >= 0 ? idx : 0
      });
      wx.showToast({ title: '已关联资产', icon: 'success' });
    }.bind(this));
  },

  onScanQr() {
    const page = this;
    assetScan.scanQrCode({
      expectHint: 'ZC-20260530-001',
      simulateCode: 'ZC-20260530-001'
    }).then(function (code) {
      page.bindAssetByCode(code, '扫码填报');
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      wx.showToast({ title: '扫码失败', icon: 'none' });
    });
  },

  onScanNfc() {
    const page = this;
    assetScan.scanNfcTag({
      expectHint: 'ZC-20260620-010',
      simulateCode: 'ZC-20260620-010'
    }).then(function (code) {
      page.bindAssetByCode(code, '扫码填报');
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      const msg = err && err.message === 'nfc_unsupported'
        ? '当前设备不支持 NFC'
        : (err && err.message === 'nfc_timeout' ? 'NFC 读取超时，请重试' : 'NFC 读取失败，请重试');
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  onAssetPick(e) {
    const idx = Number(e.detail.value) || 0;
    const opt = this.data.assetOptions[idx];
    if (!opt) return;
    assetService.getAsset(opt.id, 'repair').then(function (res) {
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '仅「使用中」资产可报修', icon: 'none', duration: 2500 });
        return;
      }
      const asset = res.asset;
      if (asset.status !== '使用中') {
        wx.showToast({ title: '仅「使用中」资产可报修', icon: 'none' });
        return;
      }
      this.setData({
        assetIndex: idx,
        asset: asset,
        reportMethod: '手动填报'
      });
    }.bind(this));
  },

  onOrgPick(e) {
    const idx = Number(e.detail.value) || 0;
    const org = this.data.orgOptions[idx] || {};
    this.setData({
      orgIndex: idx,
      orgId: org.id || '',
      orgName: org.name || ''
    });
  },

  onReportDateChange(e) {
    this.setData({ reportDate: e.detail.value });
  },

  onReportTimeChange(e) {
    this.setData({ reportTimePart: e.detail.value || '00:00' });
  },

  onLevelPick(e) {
    const idx = Number(e.detail.value) || 0;
    this.setData({
      levelIndex: idx,
      faultLevel: LEVELS[idx] || '一般'
    });
  },

  onDescInput(e) {
    this.setData({ faultDesc: e.detail.value });
  },

  clearAsset() {
    this.setData({ asset: null, reportMethod: '手动填报' });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.faultImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxImages + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const images = this.data.faultImages.slice();
        (res.tempFiles || []).forEach(function (file) {
          images.push({
            path: file.tempFilePath,
            name: '故障图' + (images.length + 1)
          });
        });
        this.setData({ faultImages: images });
      }.bind(this)
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.faultImages.slice();
    images.splice(index, 1);
    this.setData({ faultImages: images });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.faultImages.map(function (img) { return img.path; });
    wx.previewImage({ current: urls[index], urls: urls });
  },

  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({
          videoAttachment: {
            path: file.tempFilePath,
            name: '故障视频.mp4',
            durationSec: Math.ceil((file.duration || 0) / 1000)
          }
        });
      }.bind(this)
    });
  },

  removeVideo() {
    this.setData({ videoAttachment: null });
  },

  validate() {
    if (!this.data.asset) {
      wx.showToast({ title: '请选择报修资产', icon: 'none' });
      return false;
    }
    if (this.data.asset.status !== '使用中') {
      wx.showToast({ title: '仅「使用中」资产可报修', icon: 'none' });
      return false;
    }
    if (!this.data.orgId) {
      wx.showToast({ title: '请选择报修组织', icon: 'none' });
      return false;
    }
    if (!this.data.reportDate || !this.data.reportTimePart) {
      wx.showToast({ title: '请选择报修时间', icon: 'none' });
      return false;
    }
    if (!this.data.faultLevel) {
      wx.showToast({ title: '请选择故障等级', icon: 'none' });
      return false;
    }
    const desc = String(this.data.faultDesc || '').trim();
    if (!desc) {
      wx.showToast({ title: '请填写故障描述', icon: 'none' });
      return false;
    }
    if (desc.length < 5) {
      wx.showToast({ title: '故障描述至少 5 个字', icon: 'none' });
      return false;
    }
    if (this.data.faultImages.length > MAX_FAULT_IMAGES) {
      wx.showToast({ title: '故障图片不可超过 ' + MAX_FAULT_IMAGES + ' 张', icon: 'none' });
      return false;
    }
    return true;
  },

  submit() {
    if (this.data.submitting) return;
    if (!this.validate()) return;

    const asset = this.data.asset;
    const user = currentUser();
    this.setData({ submitting: true });
    assetService.createRepair({
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      brand: asset.brand || '',
      model: asset.model || '',
      categoryName: asset.categoryName || '',
      regionName: asset.regionName || '',
      location: asset.location || '',
      reporterName: user.name || '',
      reporterAccount: user.id || '',
      orgId: this.data.orgId,
      orgName: this.data.orgName,
      reportTime: joinDateTime(this.data.reportDate, this.data.reportTimePart),
      reportMethod: this.data.reportMethod,
      faultDesc: String(this.data.faultDesc || '').trim(),
      faultLevel: this.data.faultLevel,
      faultImages: this.data.faultImages.map(function (img) {
        return { path: img.path, name: img.name };
      }),
      videoAttachment: this.data.videoAttachment
        ? { name: this.data.videoAttachment.name, path: this.data.videoAttachment.path }
        : ''
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '报修已提交',
        content: '单号 ' + res.repair.code + '，可在「我的报修」查看审批进度。',
        confirmText: '查看记录',
        cancelText: '返回',
        success: function (modalRes) {
          if (modalRes.confirm) {
            wx.redirectTo({ url: '/packages/device/repair-list/index' });
            return;
          }
          wx.navigateBack({
            fail: function () {
              wx.switchTab({ url: '/pages/workbench/index' });
            }
          });
        }
      });
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败', icon: 'none' });
    }.bind(this));
  }
});
