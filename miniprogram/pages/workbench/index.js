const modules = require('../../config/modules');
const env = require('../../config/env');
const session = require('../../store/session');
const userDisplay = require('../../utils/user-display');
const pageAccess = require('../../utils/page-access');

Page({
  data: {
    userName: '',
    userPosition: '',
    // 首屏直接带入口，避免 AppService timeout 时 onShow 未执行导致整页空白
    modules: modules
  },

  onLoad() {
    this.refreshWorkbench();
  },

  onShow() {
    this.refreshWorkbench();
  },

  refreshWorkbench() {
    try {
      let user = userDisplay.normalizeUser(session.getUser());
      if (!user && env.useMock) {
        const profile = userDisplay.getMockUser(env.mockUserId) || userDisplay.getMockUser('lisi');
        session.setSession('mock-token', profile);
        user = profile;
      }
      if (!user && !env.useMock && !session.getToken()) {
        wx.reLaunch({ url: '/pages/login/index' });
        return;
      }
      if (!user && session.getToken() && !env.useMock) {
        const auth = require('../../services/auth');
        auth.fetchMe().then(function () {
          const next = userDisplay.normalizeUser(session.getUser());
          this.setData({
            modules: modules,
            userName: next ? next.name : '',
            userPosition: next ? next.position : ''
          });
        }.bind(this)).catch(function () {});
      }
      this.setData({
        modules: modules,
        userName: user ? user.name : '',
        userPosition: user ? user.position : ''
      });
    } catch (e) {
      this.setData({ modules: modules });
    }
  },

  onModuleEntry(e) {
    const ds = e.currentTarget.dataset;
    const gate = pageAccess.checkEntryAccess(ds.id);
    if (!gate.ok) {
      pageAccess.denyNavigate(gate.message);
      return;
    }
    if (ds.type === 'action' && ds.action) {
      this.runAction(ds.action);
      return;
    }
    if (!ds.path) {
      wx.showToast({ title: '入口未配置', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: ds.path,
      fail: function (err) {
        var msg = (err && (err.errMsg || err.message)) || '';
        // 开发者工具 WXML/渲染层异常时：界面像卡住，实际 navigate 已失败
        wx.showToast({
          title: /timeout|__route__|getRootFactory|webviewScriptError|navigateTo:fail/i.test(String(msg))
            ? '编译异常，请清缓存重编'
            : '页面打开失败',
          icon: 'none',
          duration: 2500
        });
      }
    });
  },

  runAction(action) {
    if (action === 'scanGuard') {
      wx.scanCode({
        onlyFromCamera: true,
        success: function (res) {
          wx.showToast({ title: '巡更点：' + res.result, icon: 'none' });
        }
      });
      return;
    }
    if (action === 'scanVisitor') {
      const visitorScan = require('../../utils/visitor-scan');
      const visitorService = require('../../services/visitor');
      visitorScan.scanVisitorCode({
        title: '模拟扫码核验'
      }).then(function (code) {
        return visitorService.resolveScan({ code: code });
      }).then(function (res) {
        const result = res || {};
        if (!result.ok || !result.visit || !result.visit.id) {
          wx.showToast({ title: result.message || '未识别到有效凭证', icon: 'none' });
          return;
        }
        wx.navigateTo({
          url: '/packages/visitor/visitor-detail/index?id=' +
            encodeURIComponent(result.visit.id) + '&from=scan'
        });
      }).catch(function (err) {
        if (err && err.message === 'cancelled') return;
        wx.showToast({ title: '扫码失败', icon: 'none' });
      });
      return;
    }
    if (action === 'scanAsset') {
      const page = this;
      wx.showActionSheet({
        itemList: ['二维码扫码', 'NFC 感应'],
        success: function (res) {
          if (res.tapIndex === 0) page.lookupAssetByQr();
          else if (res.tapIndex === 1) page.lookupAssetByNfc();
        }
      });
    }
  },

  lookupAssetByQr() {
    const assetScan = require('../../utils/asset-scan');
    assetScan.scanQrCode({
      expectHint: 'ZC-20260530-001',
      simulateCode: 'ZC-20260530-001'
    }).then(function (code) {
      this.openAssetByScanCode(code, '扫码失败');
    }.bind(this)).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      wx.showToast({ title: '扫码失败', icon: 'none' });
    });
  },

  lookupAssetByNfc() {
    const assetScan = require('../../utils/asset-scan');
    assetScan.scanNfcTag({
      expectHint: 'ZC-20260618-007',
      simulateCode: 'ZC-20260618-007'
    }).then(function (code) {
      this.openAssetByScanCode(code, 'NFC 读取失败');
    }.bind(this)).catch(function (err) {
      if (err && err.message === 'cancelled') return;
      const msg = err && err.message === 'nfc_unsupported'
        ? '当前设备不支持 NFC'
        : (err && err.message === 'nfc_timeout' ? 'NFC 读取超时，请重试' : 'NFC 读取失败，请重试');
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  openAssetByScanCode(code, failTitle) {
    const assetService = require('../../services/asset');
    assetService.resolveScanCode(code, 'view').then(function (res) {
      if (!res || !res.ok) {
        wx.showToast({
          title: (res && res.message) || '未识别到资产',
          icon: 'none',
          duration: 2500
        });
        return;
      }
      wx.navigateTo({
        url: '/packages/device/asset-detail/index?code=' + encodeURIComponent(res.asset.code)
      });
    }).catch(function () {
      wx.showToast({ title: failTitle || '识别失败', icon: 'none' });
    });
  }
});
