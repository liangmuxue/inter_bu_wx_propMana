const spareService = require('../../../services/spare');
const session = require('../../../store/session');
const env = require('../../../config/env');
const mockUsers = require('../../../config/mock-users');
const pageAccess = require('../../../utils/page-access');

function currentUser() {
  const u = session.getUser();
  if (u && u.id) return u;
  return mockUsers[env.mockUserId] || mockUsers.lisi;
}

Page({
  data: {
    codeHint: '保存后自动生成',
    applicantDisplay: '',
    spareOptions: [],
    spareIndex: -1,
    spare: null,
    orgOptions: [],
    orgIndex: 0,
    orgId: '',
    orgName: '',
    regionOptions: [],
    regionIndex: 0,
    regionId: '',
    regionName: '',
    qty: '',
    stockHint: '',
    remark: '',
    submitting: false
  },

  onLoad() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const user = currentUser();
    this.setData({
      applicantDisplay: (user.name || '—') + '（' + (user.id || '') + '）'
    });
    this.loadOptions();
  },

  loadOptions() {
    spareService.getApplyOptions().then(function (res) {
      const spares = (res && res.spares) || [];
      const orgs = (res && res.orgs) || [];
      const regions = (res && res.regions) || [];
      const user = currentUser();
      let orgIndex = orgs.findIndex(function (o) { return o.id === user.orgId; });
      if (orgIndex < 0) orgIndex = 0;
      const org = orgs[orgIndex] || { id: '', name: '' };
      let regionIndex = 0;
      const region = regions[regionIndex] || { id: '', name: '' };
      this.setData({
        spareOptions: spares,
        orgOptions: orgs,
        orgIndex: orgIndex,
        orgId: org.id || '',
        orgName: org.name || '',
        regionOptions: regions,
        regionIndex: regionIndex,
        regionId: region.id || '',
        regionName: region.name || ''
      });
    }.bind(this)).catch(function () {
      wx.showToast({ title: '加载物料失败', icon: 'none' });
    });
  },

  onSparePick(e) {
    const index = Number(e.detail.value);
    const spare = (this.data.spareOptions || [])[index];
    if (!spare) return;
    this.setData({
      spareIndex: index,
      spare: spare,
      stockHint: '当前可用库存 ' + spare.availableStock + ' ' + (spare.unit || ''),
      qty: ''
    });
  },

  onOrgPick(e) {
    const index = Number(e.detail.value) || 0;
    const org = (this.data.orgOptions || [])[index] || { id: '', name: '' };
    this.setData({
      orgIndex: index,
      orgId: org.id || '',
      orgName: org.name || ''
    });
  },

  onRegionPick(e) {
    const index = Number(e.detail.value) || 0;
    const region = (this.data.regionOptions || [])[index] || { id: '', name: '' };
    this.setData({
      regionIndex: index,
      regionId: region.id || '',
      regionName: region.name || ''
    });
  },

  onQtyInput(e) {
    this.setData({ qty: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onSubmit() {
    if (this.data.submitting) return;
    const spare = this.data.spare;
    if (!spare) {
      wx.showToast({ title: '请选择物料', icon: 'none' });
      return;
    }
    const qty = Math.floor(+this.data.qty || 0);
    if (!qty || qty < 1) {
      wx.showToast({ title: '请填写领用数量', icon: 'none' });
      return;
    }
    if (qty > spare.availableStock) {
      wx.showToast({
        title: '领用数量不可超过可用库存（' + spare.availableStock + '）',
        icon: 'none'
      });
      return;
    }
    this.setData({ submitting: true });
    spareService.submitUsage({
      spareId: spare.id,
      qty: qty,
      useOrgId: this.data.orgId,
      useRegionId: this.data.regionId,
      remark: this.data.remark
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '已提交', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败', icon: 'none' });
    }.bind(this));
  }
});
