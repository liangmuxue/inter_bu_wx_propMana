const assetService = require('../../../services/asset');
const pageAccess = require('../../../utils/page-access');

const MAX_IMAGES = 4;

Page({
  data: {
    name: '',
    brand: '',
    model: '',
    serialNo: '',
    location: '',
    purchaseAmount: '',
    purchaseDate: '',
    warrantyDate: '',
    remark: '',
    images: [],
    maxImages: MAX_IMAGES,

    categoryOptions: [],
    categoryIndex: 0,
    categoryName: '',
    orgOptions: [],
    orgIndex: 0,
    orgId: '',
    orgName: '',
    regionOptions: [],
    regionIndex: 0,
    regionName: '',
    tagTypeOptions: ['二维码', 'NFC标签'],
    tagTypeIndex: 0,
    tagType: '二维码',
    purchaseMethodOptions: ['采购', '租赁'],
    purchaseMethodLabels: ['请选择', '采购', '租赁'],
    purchaseMethodIndex: 0,
    purchaseMethod: '',

    submitting: false
  },

  onLoad(options) {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.taskId = options.taskId || options.id || '';
    if (!this.taskId) {
      wx.showToast({ title: '缺少盘点任务', icon: 'none' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 800);
      return;
    }
    this.loadOptions();
  },

  loadOptions() {
    wx.showLoading({ title: '加载中' });
    assetService.getInventorySurplusOptions().then(function (opts) {
      wx.hideLoading();
      opts = opts || {};
      const categoryOptions = opts.categoryOptions || [];
      const orgOptions = opts.orgOptions || [];
      const regionOptions = opts.regionOptions || [];
      const tagTypeOptions = opts.tagTypeOptions || ['二维码', 'NFC标签'];
      const purchaseMethodOptions = opts.purchaseMethodOptions || ['采购', '租赁'];
      this.setData({
        categoryOptions: categoryOptions,
        categoryName: '',
        orgOptions: orgOptions,
        orgId: '',
        orgName: '',
        regionOptions: regionOptions,
        regionName: '',
        tagTypeOptions: tagTypeOptions,
        tagTypeIndex: 0,
        tagType: tagTypeOptions[0] || '二维码',
        purchaseMethodOptions: purchaseMethodOptions,
        purchaseMethodLabels: ['请选择'].concat(purchaseMethodOptions),
        purchaseMethodIndex: 0,
        purchaseMethod: ''
      });
    }.bind(this)).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  onNameInput(e) { this.setData({ name: e.detail.value || '' }); },
  onBrandInput(e) { this.setData({ brand: e.detail.value || '' }); },
  onModelInput(e) { this.setData({ model: e.detail.value || '' }); },
  onSerialInput(e) { this.setData({ serialNo: e.detail.value || '' }); },
  onLocationInput(e) { this.setData({ location: e.detail.value || '' }); },
  onAmountInput(e) { this.setData({ purchaseAmount: e.detail.value || '' }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value || '' }); },

  onCategoryPick(e) {
    const idx = Number(e.detail.value) || 0;
    const opt = this.data.categoryOptions[idx];
    this.setData({
      categoryIndex: idx,
      categoryName: opt ? opt.name : ''
    });
  },

  onOrgPick(e) {
    const idx = Number(e.detail.value) || 0;
    const opt = this.data.orgOptions[idx];
    this.setData({
      orgIndex: idx,
      orgId: opt ? opt.id : '',
      orgName: opt ? opt.name : ''
    });
  },

  onRegionPick(e) {
    const idx = Number(e.detail.value) || 0;
    const opt = this.data.regionOptions[idx];
    this.setData({
      regionIndex: idx,
      regionName: opt ? opt.name : ''
    });
  },

  onTagTypePick(e) {
    const idx = Number(e.detail.value) || 0;
    this.setData({
      tagTypeIndex: idx,
      tagType: this.data.tagTypeOptions[idx] || ''
    });
  },

  onPurchaseMethodPick(e) {
    const idx = Number(e.detail.value) || 0;
    const labels = this.data.purchaseMethodLabels || [];
    this.setData({
      purchaseMethodIndex: idx,
      purchaseMethod: idx === 0 ? '' : (labels[idx] || '')
    });
  },

  onPurchaseDateChange(e) {
    this.setData({ purchaseDate: e.detail.value || '' });
  },

  onWarrantyDateChange(e) {
    this.setData({ warrantyDate: e.detail.value || '' });
  },

  chooseImages() {
    const remain = this.data.maxImages - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 ' + this.data.maxImages + ' 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const images = this.data.images.slice();
        (res.tempFiles || []).forEach(function (file) {
          images.push({
            path: file.tempFilePath,
            name: '资产图' + (images.length + 1)
          });
        });
        this.setData({ images: images });
      }.bind(this)
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images: images });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.images.map(function (img) { return img.path; });
    wx.previewImage({ current: urls[index], urls: urls });
  },

  validate() {
    if (!String(this.data.name || '').trim()) {
      wx.showToast({ title: '请填写资产名称', icon: 'none' });
      return false;
    }
    if (!this.data.categoryName) {
      wx.showToast({ title: '请选择资产分类', icon: 'none' });
      return false;
    }
    if (!this.data.orgId) {
      wx.showToast({ title: '请选择所属组织', icon: 'none' });
      return false;
    }
    if (!this.data.regionName) {
      wx.showToast({ title: '请选择所属区域', icon: 'none' });
      return false;
    }
    if (!this.data.tagType) {
      wx.showToast({ title: '请选择标签类型', icon: 'none' });
      return false;
    }
    return true;
  },

  onSubmit() {
    if (this.data.submitting) return;
    if (!this.validate()) return;
    this.setData({ submitting: true });
    assetService.addInventorySurplus({
      taskId: this.taskId,
      name: this.data.name,
      categoryName: this.data.categoryName,
      brand: this.data.brand,
      model: this.data.model,
      serialNo: this.data.serialNo,
      orgId: this.data.orgId,
      regionName: this.data.regionName,
      location: this.data.location,
      tagType: this.data.tagType,
      purchaseMethod: this.data.purchaseMethod,
      purchaseAmount: this.data.purchaseAmount,
      purchaseDate: this.data.purchaseDate,
      warrantyDate: this.data.warrantyDate,
      remark: this.data.remark,
      images: this.data.images
    }).then(function (res) {
      this.setData({ submitting: false });
      if (!res || !res.ok) {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: res.message || '盘盈已加入清单', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () {} });
      }, 600);
    }.bind(this)).catch(function () {
      this.setData({ submitting: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    }.bind(this));
  }
});
