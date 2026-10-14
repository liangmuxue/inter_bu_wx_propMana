/**
 * 会议室预约费用计算（PC / 员工端 / 物业端共用）
 *
 * 场地费 = (endMin - startMin) / 30 × feePer30Min
 * 会务费 = Σ (price × qty)
 * 合计 = 场地费 + 会务费
 *
 * booking.feeSnapshot 优先；无快照时按当前费率回算。
 */
(function (root) {
  'use strict';

  function round2(n) {
    var x = Number(n);
    if (isNaN(x) || !isFinite(x)) return 0;
    return Math.round(x * 100) / 100;
  }

  function normalizeFeeRate(value) {
    var n = Number(value);
    if (isNaN(n) || n < 0) return 0;
    return round2(n);
  }

  function computeServiceFee(selectedServices) {
    var sum = 0;
    (selectedServices || []).forEach(function (s) {
      if (!s) return;
      var price = Number(s.price);
      var qty = Number(s.qty);
      if (isNaN(price) || price < 0) price = 0;
      if (isNaN(qty) || qty < 1) qty = 0;
      sum += price * qty;
    });
    return round2(sum);
  }

  function computeRoomFee(startMin, endMin, feePer30Min) {
    var start = Number(startMin);
    var end = Number(endMin);
    var rate = normalizeFeeRate(feePer30Min);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return round2(((end - start) / 30) * rate);
  }

  /**
   * @param {object} input
   * @param {number} input.startMin
   * @param {number} input.endMin
   * @param {number} input.feePer30Min
   * @param {Array} [input.selectedServices]
   */
  function buildFeeSnapshot(input) {
    input = input || {};
    var startMin = Number(input.startMin);
    var endMin = Number(input.endMin);
    var feePer30Min = normalizeFeeRate(input.feePer30Min);
    var durationMin = (!isNaN(startMin) && !isNaN(endMin) && endMin > startMin)
      ? (endMin - startMin)
      : 0;
    var roomFee = computeRoomFee(startMin, endMin, feePer30Min);
    var serviceFee = computeServiceFee(input.selectedServices);
    return {
      feePer30Min: feePer30Min,
      durationMin: durationMin,
      roomFee: roomFee,
      serviceFee: serviceFee,
      totalFee: round2(roomFee + serviceFee)
    };
  }

  /**
   * 解析预约费用：优先 feeSnapshot，否则用 roomCfg + selectedServices 回算
   * @param {object} booking
   * @param {object} [opts] { feePer30Min, startMin, endMin, selectedServices }
   */
  function resolveBookingFees(booking, opts) {
    opts = opts || {};
    var snap = booking && booking.feeSnapshot;
    if (snap && typeof snap === 'object' &&
        snap.roomFee != null && snap.serviceFee != null && snap.totalFee != null) {
      return {
        feePer30Min: normalizeFeeRate(snap.feePer30Min),
        durationMin: Number(snap.durationMin) || 0,
        roomFee: round2(snap.roomFee),
        serviceFee: round2(snap.serviceFee),
        totalFee: round2(snap.totalFee),
        fromSnapshot: true
      };
    }
    var startMin = opts.startMin != null
      ? opts.startMin
      : (booking && (booking.startMin != null ? booking.startMin : booking.start));
    var endMin = opts.endMin != null
      ? opts.endMin
      : (booking && (booking.endMin != null ? booking.endMin : booking.end));
    var feePer30Min = opts.feePer30Min != null
      ? opts.feePer30Min
      : (snap && snap.feePer30Min);
    var services = opts.selectedServices != null
      ? opts.selectedServices
      : (booking && booking.selectedServices);
    var built = buildFeeSnapshot({
      startMin: startMin,
      endMin: endMin,
      feePer30Min: feePer30Min,
      selectedServices: services
    });
    built.fromSnapshot = false;
    return built;
  }

  function formatFeeAmount(n) {
    return round2(n).toFixed(2);
  }

  function formatFeeYuan(n) {
    return formatFeeAmount(n) + ' 元';
  }

  /**
   * 汇总列表费用
   * @param {Array} bookings 已装饰或原始预约
   * @param {function} resolveFeesFn (booking) => fee object
   * @param {object} [opts] { includeCancelled, isCancelledFn }
   */
  function aggregateFees(bookings, resolveFeesFn, opts) {
    opts = opts || {};
    var includeCancelled = !!opts.includeCancelled;
    var isCancelledFn = opts.isCancelledFn || function (b) {
      return !!(b && (b.cancelled || b.status === '已取消'));
    };
    var list = [];
    var roomFee = 0;
    var serviceFee = 0;
    var totalFee = 0;
    (bookings || []).forEach(function (b) {
      if (!includeCancelled && isCancelledFn(b)) return;
      var fees = resolveFeesFn ? resolveFeesFn(b) : resolveBookingFees(b);
      list.push(b);
      roomFee += fees.roomFee;
      serviceFee += fees.serviceFee;
      totalFee += fees.totalFee;
    });
    return {
      count: list.length,
      roomFee: round2(roomFee),
      serviceFee: round2(serviceFee),
      totalFee: round2(totalFee),
      list: list
    };
  }

  var api = {
    round2: round2,
    normalizeFeeRate: normalizeFeeRate,
    computeServiceFee: computeServiceFee,
    computeRoomFee: computeRoomFee,
    buildFeeSnapshot: buildFeeSnapshot,
    resolveBookingFees: resolveBookingFees,
    formatFeeAmount: formatFeeAmount,
    formatFeeYuan: formatFeeYuan,
    aggregateFees: aggregateFees
  };

  root.SpaceBookingFee = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
