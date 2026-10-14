/**
 * 资产扫码 / NFC 共用能力（盘点、报修、查资产、巡更点）
 */

function isDevToolsEnv() {
  try {
    return wx.getSystemInfoSync().platform === 'devtools';
  } catch (e) {
    return false;
  }
}

/**
 * 统一解析扫码/NFC 载荷，抽出资产编号
 * 支持：纯编号、ASSET|编号|名称
 */
function normalizeScanCode(raw) {
  const code = String(raw || '').trim();
  if (!code) return '';
  if (code.indexOf('ASSET|') === 0) {
    const parts = code.split('|');
    return (parts[1] || '').trim() || code;
  }
  return code;
}

/**
 * 开发者工具模拟：支持单码确认，或多项选择（如「本任务内 / 不在本任务内」）
 * @param {{
 *   title?: string,
 *   expectHint?: string,
 *   simulateCode?: string,
 *   simulateChoices?: Array<{ label: string, code: string }>
 * }} options
 * @returns {Promise<string>}
 */
function simulatePickCode(options) {
  options = options || {};
  const choices = (options.simulateChoices || []).filter(function (c) {
    return c && c.code;
  });

  return new Promise(function (resolve, reject) {
    if (choices.length >= 2) {
      const itemList = choices.map(function (c) {
        // ActionSheet 单项过长会被截断，编号放后面便于辨认
        const label = c.label || '模拟资产';
        return label.length > 18 ? (label.slice(0, 17) + '…') : label;
      });
      wx.showActionSheet({
        itemList: itemList,
        success: function (res) {
          const picked = choices[res.tapIndex];
          if (!picked) {
            reject(new Error('cancelled'));
            return;
          }
          resolve(normalizeScanCode(picked.code));
        },
        fail: function () {
          reject(new Error('cancelled'));
        }
      });
      return;
    }

    const code = normalizeScanCode(
      (choices[0] && choices[0].code) ||
      options.simulateCode ||
      options.expectHint ||
      ''
    );
    const tip = options.expectHint
      ? '开发者工具无法调用真机。是否模拟「' + options.expectHint + '」？'
      : (code
        ? '开发者工具无法调用真机。是否模拟「' + code + '」？'
        : '开发者工具无法调用真机。是否使用演示资产编号？');
    wx.showModal({
      title: options.title || '模拟识别',
      content: tip,
      confirmText: '模拟通过',
      success: function (res) {
        if (!res.confirm) {
          reject(new Error('cancelled'));
          return;
        }
        resolve(code || 'ZC-20260530-001');
      }
    });
  });
}

/**
 * 扫描二维码，返回 Promise<string>（已归一化为资产编号）
 * @param {{ expectHint?: string, simulateCode?: string, simulateChoices?: Array<{label:string,code:string}> }} options
 */
function scanQrCode(options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    if (isDevToolsEnv()) {
      simulatePickCode(Object.assign({ title: '模拟扫码' }, options))
        .then(resolve)
        .catch(reject);
      return;
    }
    wx.scanCode({
      onlyFromCamera: true,
      success: function (res) {
        const code = normalizeScanCode(res.result || '');
        if (!code) {
          reject(new Error('scan_empty'));
          return;
        }
        resolve(code);
      },
      fail: function () {
        reject(new Error('scan_failed'));
      }
    });
  });
}

/**
 * 读取 NFC。仅开发者工具可走模拟；真机失败只报错，禁止静默改用演示码。
 * @param {{ expectHint?: string, simulateCode?: string, simulateChoices?: Array<{label:string,code:string}> }} options
 */
function scanNfcTag(options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    if (isDevToolsEnv()) {
      simulatePickCode(Object.assign({ title: '模拟 NFC' }, options))
        .then(resolve)
        .catch(reject);
      return;
    }

    if (typeof wx.getNFCAdapter !== 'function') {
      reject(new Error('nfc_unsupported'));
      return;
    }

    let adapter;
    try {
      adapter = wx.getNFCAdapter();
    } catch (e) {
      reject(new Error('nfc_unavailable'));
      return;
    }

    wx.showLoading({ title: '请靠近 NFC 标签', mask: true });
    let settled = false;
    const finish = function (err, code) {
      if (settled) return;
      settled = true;
      wx.hideLoading();
      try {
        if (adapter && adapter.stopDiscovery) adapter.stopDiscovery();
      } catch (e2) { /* ignore */ }
      if (err) {
        reject(err);
        return;
      }
      const normalized = normalizeScanCode(code);
      if (!normalized) {
        reject(new Error('nfc_empty'));
        return;
      }
      resolve(normalized);
    };

    try {
      adapter.startDiscovery({
        success: function () {
          adapter.onDiscovered(function (res) {
            let code = '';
            if (res && res.messages && res.messages.length) {
              try {
                const records = res.messages[0].records || [];
                if (records[0] && records[0].payload) {
                  const payload = records[0].payload;
                  if (typeof payload === 'string') code = payload;
                  else if (payload instanceof ArrayBuffer) {
                    code = String.fromCharCode.apply(null, new Uint8Array(payload)).replace(/[^\x20-\x7E\u4e00-\u9fa5\-_|]/g, '');
                  }
                }
              } catch (e3) { /* ignore */ }
            }
            finish(null, code);
          });
        },
        fail: function () {
          finish(new Error('nfc_unavailable'));
        }
      });
    } catch (e4) {
      finish(new Error('nfc_unavailable'));
    }

    setTimeout(function () {
      if (!settled) finish(new Error('nfc_timeout'));
    }, 12000);
  });
}

module.exports = {
  isDevToolsEnv: isDevToolsEnv,
  normalizeScanCode: normalizeScanCode,
  scanQrCode: scanQrCode,
  scanNfcTag: scanNfcTag
};
