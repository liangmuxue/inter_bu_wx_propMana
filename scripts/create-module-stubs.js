const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../miniprogram/packages');
const pages = [
  ['fire', 'alarm-list', '报警推送', '火警/故障推送列表，对齐消防管理 · 报警推送'],
  ['fire', 'device-list', '消防设备', '移动端查看消防设备状态与点位'],
  ['fire', 'stats', '监测统计', '设施状态与报警统计概览'],
  ['visitor', 'today-list', '今日待访', '保安待访列表（全部/今日）'],
  ['visitor', 'record-list', '来访记录', '扫码登记与通行记录查询'],
  ['visitor', 'verify-result', '核验结果', '访客通行码核验结果'],
  ['workorder', 'create', '我要报修', '现场拍照报修，对齐工单服务'],
  ['workorder', 'list', '我的工单', '待处理/处理中/已完成工单'],
  ['device', 'inventory-list', '移动盘点', '盘点任务列表，QR/NFC 扫码核对'],
  ['device', 'repair-create', '维修发起', '设备故障维修发起']
];

pages.forEach(function (p) {
  const dir = path.join(root, p[0], p[1]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ navigationBarTitleText: p[2] }, null, 2));
  fs.writeFileSync(path.join(dir, 'index.js'), 'Page({});\n');
  fs.writeFileSync(
    path.join(dir, 'index.wxml'),
    '<view class="container"><view class="card"><view class="card-title">' + p[2] +
    '</view><text class="meta">' + p[3] + '</text><text class="meta">功能开发中，入口已预留</text></view></view>\n'
  );
  fs.writeFileSync(path.join(dir, 'index.wxss'), '.meta{display:block;margin-top:12rpx;font-size:26rpx;color:#718096;}\n');
});

console.log('Stub pages created:', pages.length);
