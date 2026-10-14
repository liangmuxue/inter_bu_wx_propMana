const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    id: '',
    loading: true,
    visit: null,
    remark: '',
    submitting: false,
    showDecideSheet: false,
    showPermPicker: false,
    decidePass: true,
    permGroups: [],
    permGroupId: 'AG-002',
    permGroupName: '标准访客',
    permDeviceText: '1F东闸机、1F西闸机',
    canAdjustPermission: true
  },

  onLoad(options) {
    this.setData({ id: String((options && options.id) || '').trim() });
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadDetail();
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  preventClose() {},

  loadDetail() {
    const id = this.data.id;
    if (!id) {
      this.setData({ loading: false, visit: null });
      return;
    }
    this.setData({ loading: true });
    visitorService.getVisit(id, { flow: true }).then(function (visit) {
      this.setData({ visit: visit || null, loading: false });
      if (visit) {
        wx.setNavigationBarTitle({
          title: visit.biz === '访客预约' ? '审批详情' : '邀约详情'
        });
      } else {
        wx.showToast({ title: '单据不存在或无权限', icon: 'none' });
      }
    }.bind(this)).catch(function () {
      this.setData({ visit: null, loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }.bind(this));
  },

  onApprove() {
    this.openDecideSheet(true);
  },

  onReject() {
    this.openDecideSheet(false);
  },

  openDecideSheet(pass) {
    if (this.data.submitting) return;
    const visit = this.data.visit;
    if (!visit || !visit.canApprove) return;
    const page = this;
    const applyOpen = function (groups) {
      const list = groups || [];
      const locked = visit.canAdjustPermission === false;
      let preferred = null;
      if (locked && (visit.permissionGroupId || visit.permissionGroupName)) {
        preferred = list.find(function (g) {
          return g.permissionGroupId === visit.permissionGroupId ||
            g.permissionGroupName === visit.permissionGroupName;
        }) || {
          permissionGroupId: visit.permissionGroupId || 'AG-002',
          permissionGroupName: visit.permissionGroupName || '标准访客',
          deviceText: visit.permissionGroupDisplay && visit.permissionGroupDisplay.indexOf('（') > 0
            ? visit.permissionGroupDisplay.replace(/^.*（/, '').replace(/）$/, '')
            : '1F东闸机、1F西闸机'
        };
      } else {
        preferred = list.find(function (g) {
          return g.permissionGroupId === 'AG-002' || g.permissionGroupName === '标准访客';
        }) || list[0];
      }
      page.setData({
        showDecideSheet: true,
        showPermPicker: false,
        decidePass: !!pass,
        remark: '',
        canAdjustPermission: !locked,
        permGroups: list,
        permGroupId: preferred ? preferred.permissionGroupId : '',
        permGroupName: preferred ? preferred.permissionGroupName : '',
        permDeviceText: preferred ? preferred.deviceText : ''
      });
    };
    if (!pass) {
      applyOpen(this.data.permGroups);
      return;
    }
    visitorService.listPermissionGroups({ orgId: visit.orgId }).then(function (groups) {
      applyOpen(groups);
    }).catch(function () {
      applyOpen([{
        permissionGroupId: 'AG-002',
        permissionGroupName: '标准访客',
        deviceText: '1F东闸机、1F西闸机'
      }]);
    });
  },

  closeDecideSheet() {
    if (this.data.submitting) return;
    this.setData({ showDecideSheet: false, showPermPicker: false });
  },

  openPermPicker() {
    if (!this.data.decidePass || this.data.submitting || !this.data.canAdjustPermission) return;
    this.setData({ showPermPicker: true });
  },

  closePermPicker() {
    this.setData({ showPermPicker: false });
  },

  onPickPerm(e) {
    const ds = e.currentTarget.dataset || {};
    this.setData({
      permGroupId: ds.id || '',
      permGroupName: ds.name || '',
      permDeviceText: ds.devices || '',
      showPermPicker: false
    });
  },

  confirmDecide() {
    if (this.data.submitting) return;
    const visit = this.data.visit;
    if (!visit || !visit.canApprove) return;
    const pass = this.data.decidePass;
    if (pass && !this.data.permGroupId) {
      wx.showToast({ title: '请选择通行权限组', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    visitorService.decideAppointment({
      visitId: visit.id,
      decision: pass ? 'pass' : 'reject',
      remark: this.data.remark,
      opinion: this.data.remark,
      permissionGroupId: pass ? this.data.permGroupId : '',
      permissionGroupName: pass ? this.data.permGroupName : ''
    }).then(function (result) {
      this.setData({ submitting: false });
      if (!result || !result.ok) {
        wx.showToast({ title: (result && result.message) || '操作失败', icon: 'none' });
        return;
      }
      this.setData({
        showDecideSheet: false,
        showPermPicker: false,
        visit: result.visit || null,
        remark: ''
      });
      wx.showToast({ title: result.message || '已处理', icon: 'success' });
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }.bind(this));
  }
});
