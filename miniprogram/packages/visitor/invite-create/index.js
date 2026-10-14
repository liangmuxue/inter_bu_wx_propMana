const visitorService = require('../../../services/visitor');
const pageAccess = require('../../../utils/page-access');
const pagePerm = require('../../../config/page-permissions');
const session = require('../../../store/session');
const userDisplay = require('../../../utils/user-display');

const STEP_META = {
  1: { no: '01', title: '选择到访安排' },
  2: { no: '02', title: '完善访客资料' },
  3: { no: '03', title: '确认访问详情' }
};

function emptyForm(user) {
  return {
    name: '',
    phone: '',
    idCard: '',
    visitDate: '2026-08-12',
    endDate: '2026-08-12',
    startTime: '09:00',
    endTime: '11:00',
    host: (user && user.name) || '',
    reason: ''
  };
}

function emptyCompanion() {
  return { name: '', phone: '', idCard: '' };
}

function text(v) {
  return String(v == null ? '' : v).trim();
}

function isPhone(v) {
  return /^1\d{10}$/.test(text(v));
}

function toast(title) {
  wx.showToast({ title: title, icon: 'none' });
}

function stepLabels(step) {
  const isLast = step >= 3;
  return {
    secondaryLabel: step > 1 ? '上一步' : '取消',
    primaryLabel: isLast ? '提交邀约' : '下一步'
  };
}

function buildPreview(userName, orgName) {
  const name = userName || '物业人员';
  const org = orgName || '被访组织';
  return name + '邀请你访问' + org + '，请点击完善到访信息。';
}

Page({
  data: {
    mode: '普通',
    orgs: [],
    orgNames: [],
    orgIndex: 0,
    form: emptyForm(),
    companions: [],
    formStep: 1,
    stepMeta: STEP_META[1],
    secondaryLabel: '取消',
    primaryLabel: '下一步',
    userName: '',
    previewText: '',
    submitting: false
  },

  onLoad(options) {
    const raw = decodeURIComponent(String((options && options.mode) || 'normal'));
    const isQuick = raw === '快速' || raw === 'quick';
    this.setData({ mode: isQuick ? '快速' : '普通' });
    wx.setNavigationBarTitle({
      title: isQuick ? '快速邀约' : '普通邀约'
    });
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    const user = userDisplay.normalizeUser(session.getUser());
    const role = (user && user.role) || '';
    if (!pagePerm.canPageAction(role, 'vis2-invite-staff', 'add')) {
      toast('无邀约权限');
      setTimeout(function () { wx.navigateBack({ fail: function () {} }); }, 400);
      return;
    }
    const userName = (user && user.name) || '';
    const form = Object.assign({}, this.data.form, {
      host: this.data.form.host || userName
    });
    this.setData({
      userName: userName,
      form: form
    });
    this.refreshPreview();
    this.loadOrgs();
  },

  loadOrgs() {
    visitorService.listAccessibleOrgs().then(function (orgs) {
      const list = orgs || [];
      this.setData({
        orgs: list,
        orgNames: list.map(function (o) { return o.name; }),
        orgIndex: list.length ? (this.data.orgIndex || 0) : 0
      });
      this.refreshPreview();
      if (!list.length) {
        toast('无可选被访组织');
      }
    }.bind(this)).catch(function () {
      this.setData({ orgs: [], orgNames: [] });
      this.refreshPreview();
    }.bind(this));
  },

  refreshPreview() {
    const org = (this.data.orgs || [])[this.data.orgIndex];
    this.setData({
      previewText: buildPreview(this.data.userName, org && org.name)
    });
  },

  syncStepChrome(step) {
    const labels = stepLabels(step);
    this.setData({
      formStep: step,
      stepMeta: STEP_META[step] || STEP_META[1],
      secondaryLabel: labels.secondaryLabel,
      primaryLabel: labels.primaryLabel
    });
  },

  onOrgChange(e) {
    this.setData({ orgIndex: Number(e.detail.value) || 0 });
    this.refreshPreview();
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onTimeChange(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onAddCompanion() {
    const list = (this.data.companions || []).slice();
    list.push(emptyCompanion());
    this.setData({ companions: list });
  },

  onRemoveCompanion(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const list = (this.data.companions || []).slice();
    list.splice(index, 1);
    this.setData({ companions: list });
  },

  onCompanionInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field;
    if (Number.isNaN(index) || !field) return;
    this.setData({ ['companions[' + index + '].' + field]: e.detail.value });
  },

  selectedOrg() {
    return (this.data.orgs || [])[this.data.orgIndex] || null;
  },

  validateOrg() {
    if (!this.selectedOrg()) {
      toast('请选择被访组织');
      return false;
    }
    return true;
  },

  validateStep1() {
    if (!this.validateOrg()) return false;
    const form = this.data.form || {};
    if (!text(form.visitDate) || !text(form.startTime)) {
      toast('请填写访问开始时间');
      return false;
    }
    if (!text(form.endDate) || !text(form.endTime)) {
      toast('请填写访问结束时间');
      return false;
    }
    const startStamp = text(form.visitDate) + 'T' + text(form.startTime);
    const endStamp = text(form.endDate) + 'T' + text(form.endTime);
    if (startStamp >= endStamp) {
      toast('访问结束时间不能早于开始时间');
      return false;
    }
    return true;
  },

  validateCompanions(visitor) {
    const companions = this.data.companions || [];
    if (!companions.length) return true;
    const seenPhone = {};
    const seenId = {};
    const visitorPhone = text(visitor && visitor.phone);
    const visitorId = text(visitor && visitor.idCard);
    if (visitorPhone) seenPhone[visitorPhone] = 1;
    if (visitorId) seenId[visitorId] = 1;
    for (let i = 0; i < companions.length; i++) {
      const c = companions[i] || {};
      if (!text(c.name)) {
        toast('同行人' + (i + 1) + '：请填写同行人姓名');
        return false;
      }
      if (!isPhone(c.phone)) {
        toast('同行人' + (i + 1) + '：请填写同行人的 11 位手机号');
        return false;
      }
      if (!text(c.idCard)) {
        toast('同行人' + (i + 1) + '：请填写同行人证件号');
        return false;
      }
      const phone = text(c.phone);
      const idCard = text(c.idCard);
      if (seenPhone[phone] || seenId[idCard]) {
        toast('访客与同行人不能重复');
        return false;
      }
      seenPhone[phone] = 1;
      seenId[idCard] = 1;
    }
    return true;
  },

  validateStep2() {
    const form = this.data.form || {};
    if (!text(form.name)) {
      toast('请填写访客姓名');
      return false;
    }
    if (!text(form.idCard)) {
      toast('请填写证件号');
      return false;
    }
    if (!isPhone(form.phone)) {
      toast('请填写11位手机号');
      return false;
    }
    return this.validateCompanions(form);
  },

  validateQuick() {
    if (!this.selectedOrg()) {
      toast('无可选被访组织');
      return false;
    }
    const form = this.data.form || {};
    if (!text(form.name)) {
      toast('请填写访客姓名');
      return false;
    }
    if (!isPhone(form.phone)) {
      toast('请填写11位手机号');
      return false;
    }
    return true;
  },

  onSecondaryAction() {
    if (this.data.formStep > 1) {
      this.onPrevStep();
      return;
    }
    this.onCancel();
  },

  onPrimaryAction() {
    if (this.data.formStep >= 3) {
      this.onSubmitNormal();
      return;
    }
    this.onNextStep();
  },

  onPrevStep() {
    const step = Math.max(1, (this.data.formStep || 1) - 1);
    this.syncStepChrome(step);
  },

  onNextStep() {
    const step = this.data.formStep || 1;
    if (step === 1 && !this.validateStep1()) return;
    if (step === 2 && !this.validateStep2()) return;
    this.syncStepChrome(Math.min(3, step + 1));
  },

  onCancel() {
    wx.navigateBack({ fail: function () {} });
  },

  buildPayload(mode) {
    const org = this.selectedOrg();
    const form = this.data.form || {};
    const companions = (this.data.companions || [])
      .map(function (c) {
        return {
          name: text(c && c.name),
          phone: text(c && c.phone),
          idCard: text(c && c.idCard)
        };
      })
      .filter(function (c) {
        return c.name || c.phone || c.idCard;
      });
    return Object.assign({}, form, {
      mode: mode,
      visitDepartmentId: org.id,
      visitDepartmentName: org.name,
      dept: org.name,
      hostOrgId: org.id,
      companions: mode === '普通' ? companions : []
    });
  },

  submitInvite(mode) {
    if (this.data.submitting) return;
    const payload = this.buildPayload(mode);
    this.setData({ submitting: true });
    visitorService.createInvite(payload).then(function (result) {
      this.setData({ submitting: false });
      if (!result || !result.ok) {
        toast((result && result.message) || '提交失败');
        return;
      }
      wx.showToast({ title: result.message || '提交成功', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 500);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      toast('提交失败');
    }.bind(this));
  },

  onSubmitQuick() {
    if (!this.validateQuick()) return;
    this.submitInvite('快速');
  },

  onSubmitNormal() {
    if (!this.validateStep1() || !this.validateStep2()) return;
    this.submitInvite('普通');
  }
});
