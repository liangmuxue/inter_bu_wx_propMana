/**
 * 访客通行码扫码（开发者工具可模拟）
 */
const assetScan = require('./asset-scan');
const visitorService = require('../services/visitor');

function normalizePassCode(raw) {
  return visitorService.normalizePassCode(raw);
}

/**
 * @param {{
 *   title?: string,
 *   expectHint?: string,
 *   simulateCode?: string,
 *   simulateChoices?: Array<{ label: string, code: string }>
 * }} options
 * @returns {Promise<string>}
 */
function scanVisitorCode(options) {
  options = options || {};
  const choices = options.simulateChoices && options.simulateChoices.length
    ? options.simulateChoices
    : visitorService.getDemoScanChoices();

  // 默认模拟未签到凭证（QC001 钱程），便于扫码后直接签到
  const defaultCode = (choices[0] && choices[0].code) || 'QC001';
  return assetScan.scanQrCode({
    title: options.title || '模拟扫码核验',
    expectHint: options.expectHint || ('未签到 · ' + defaultCode),
    simulateCode: options.simulateCode || defaultCode,
    simulateChoices: choices
  }).then(function (code) {
    const normalized = normalizePassCode(code);
    if (!normalized) {
      return Promise.reject(new Error('scan_empty'));
    }
    return normalized;
  });
}

module.exports = {
  normalizePassCode: normalizePassCode,
  scanVisitorCode: scanVisitorCode
};
