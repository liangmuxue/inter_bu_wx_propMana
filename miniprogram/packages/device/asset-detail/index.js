const assetService = require('../../../services/asset');
const patrolIssueMedia = require('../../../utils/patrol-issue-media');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

function statusClass(status) {
  const s = String(status || '');
  if (s === '使用中') return 'tag-success';
  if (s === '维修中') return 'tag-warning';
  if (s === '已报废' || s === '已丢失') return 'tag-danger';
  return 'tag-info';
}

function tagTypeClass(tagType) {
  return tagType === 'NFC标签' ? 'tag-warning' : 'tag-info';
}

function currentRole() {
  const user = userDisplay.normalizeUser(session.getUser());
  return (user && user.role) || '';
}

function enrichAsset(asset) {
  if (!asset) return null;
  const images = (asset.images || []).map(function (img, idx) {
    const url = img.path || img.url || '';
    return {
      name: img.name || ('图片' + (idx + 1)),
      path: url,
      url: url
    };
  }).filter(function (img) { return !!img.path; });
  const canAddRepair = pagePerm.canPageAction(currentRole(), 'repair-request', 'add');
  return Object.assign({}, asset, {
    statusClass: statusClass(asset.status),
    tagTypeClass: tagTypeClass(asset.tagType),
    purchaseAmountText: asset.purchaseAmount
      ? String(asset.purchaseAmount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : '—',
    images: images,
    hasImages: images.length > 0,
    inputBy: asset.inputBy || '—',
    inputAt: asset.inputAt || '—',
    changeAt: asset.changeAt || asset.inputAt || '—',
    // 同 PC：发起报修 = add；仅使用中可报修
    canRepair: canAddRepair && asset.status === '使用中',
    canRepairByStatus: asset.status === '使用中',
    canRepairByPerm: canAddRepair
  });
}

Page({
  data: {
    asset: null,
    notFound: false,
    loading: true,
    showRepair: true
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const code = options.code || options.assetCode || options.id || '';
    const from = String(options.from || '');
    // 从盘点明细进入仅查看台账，不展示报修入口
    const showRepair = from !== 'inventory';
    this.setData({ showRepair: showRepair });
    if (!code) {
      this.setData({ notFound: true, loading: false });
      return;
    }
    this.setData({ loading: true });
    assetService.getAsset(code, 'view').then(function (res) {
      if (!res || !res.ok) {
        this.setData({ notFound: true, loading: false, asset: null });
        wx.showToast({
          title: (res && res.message) || '未找到对应资产',
          icon: 'none',
          duration: 2500
        });
        return;
      }
      const view = enrichAsset(res.asset);
      this.setData({ asset: view, loading: false, notFound: false });
      wx.setNavigationBarTitle({ title: '资产详情' });
    }.bind(this)).catch(function () {
      this.setData({ notFound: true, loading: false });
    }.bind(this));
  },

  previewImage(e) {
    const asset = this.data.asset;
    if (!asset || !asset.hasImages) return;
    const index = Number(e.currentTarget.dataset.index) || 0;
    patrolIssueMedia.previewIssueImages(asset.images, index);
  },

  goRepair() {
    const asset = this.data.asset;
    if (!asset) return;
    if (!asset.canRepairByPerm) {
      pageAccess.denyNavigate('当前账号无「发起报修」权限');
      return;
    }
    if (!asset.canRepairByStatus) {
      wx.showToast({ title: '仅「使用中」资产可报修', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/packages/device/repair-create/index?assetCode=' + encodeURIComponent(asset.code)
    });
  }
});
