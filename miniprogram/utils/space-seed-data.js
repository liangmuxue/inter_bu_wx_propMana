/**
 * 会议室演示种子（结构对齐 PC / 员工端 space-domain + shared/space-booking-seed）
 */
const bookingSeed = require('./space-booking-seed');
const legacyBookings = require('./space-legacy-bookings');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function addDays(dateStr, delta) {
  const d = new Date(String(dateStr) + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

function parseTime(text) {
  const parts = String(text || '08:00').split(':');
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

const categories = [
  {
    id: 'cat1', name: '普通会议室',
    advanceDays: 7, timeStart: '08:00', timeEnd: '23:00', slotMinutes: 60,
    intro: '日常会议使用，可提前 7 天预定；2026-08-30 起 1 小时间隔至 23:00，此前 15 分钟间隔至 17:00',
    ruleVersions: [
      { effectiveFrom: '2020-01-01', slotMinutes: 15, timeStart: '08:00', timeEnd: '17:00', advanceDays: 7 },
      { effectiveFrom: '2026-08-30', slotMinutes: 60, timeStart: '08:00', timeEnd: '23:00', advanceDays: 7 }
    ]
  },
  {
    id: 'cat2', name: '洽谈室',
    advanceDays: 3, timeStart: '09:00', timeEnd: '17:30', slotMinutes: 30,
    intro: '小型洽谈使用，可提前 3 天预定'
  },
  {
    id: 'cat3', name: '培训室',
    advanceDays: 14, timeStart: '08:30', timeEnd: '20:00', slotMinutes: 60,
    intro: '培训及大型活动，可提前 14 天预定，按小时预定'
  }
];

const rooms = [
  {
    id: 'r1', name: '会议室1', categoryId: 'cat1', categoryName: '普通会议室',
    orgIds: ['ORG-001'], orgNames: ['物业管理部'],
    regionId: 'AR-15F-A', regionName: '15层会议室A', location: '15F-A 区东侧',
    capacity: 20, status: '启用',
    facilities: ['电视', '电话', '投影仪'],
    intro: '适用于部门例会、项目汇报，采光良好，临近茶水间',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=960&h=640&q=80',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=960&h=640&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=960&h=640&q=80',
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=960&h=640&q=80'
    ]
  },
  {
    id: 'r2', name: '会议室2', categoryId: 'cat2', categoryName: '洽谈室',
    orgIds: ['ORG-003', 'ORG-001'], orgNames: ['工程部', '物业管理部'],
    regionId: 'AR-15F', regionName: '15层', location: '15F 西侧洽谈区',
    capacity: 10, status: '启用',
    facilities: ['白板', '投影仪'],
    intro: '适合小型洽谈、供应商对接，安静私密',
    imageUrl: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=960&h=640&q=80',
    images: [
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=960&h=640&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=960&h=640&q=80'
    ]
  },
  {
    id: 'r3', name: '会议室3', categoryId: 'cat3', categoryName: '培训室',
    orgIds: ['ORG-003'], orgNames: ['工程部'],
    regionId: 'AR-B1', regionName: '地下一层', location: 'B1 物业办公区旁',
    capacity: 8, status: '启用',
    facilities: ['电话', '视频会议设备'],
    intro: '适合培训宣讲与远程会议，配备视频会议设备',
    imageUrl: 'https://images.unsplash.com/photo-1517504734587-2890819debab?auto=format&fit=crop&w=960&h=640&q=80',
    images: [
      'https://images.unsplash.com/photo-1517504734587-2890819debab?auto=format&fit=crop&w=960&h=640&q=80',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=960&h=640&q=80'
    ]
  }
];

function buildCancelledDemoBookings(today) {
  // 今日及后续日期的已取消样例（不受 historical 过滤影响，保证「已取消」页签有数据）
  return [
    {
      id: 'bc-today-r2', code: 'MR' + today.replace(/-/g, '') + '901',
      roomId: 'r2', date: today, startMin: 9 * 60, endMin: 10 * 60,
      userName: '杨帆', userAccount: 'yangfan', userOrg: '客服部',
      subject: '访客接待临时协调', submitAt: addDays(today, -1) + ' 16:20:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 08:15:00', cancelBy: '杨帆', cancelReason: '访客改期，自行取消'
    },
    {
      id: 'bc-today-r3', code: 'MR' + today.replace(/-/g, '') + '902',
      roomId: 'r3', date: today, startMin: 14 * 60, endMin: 15 * 60 + 30,
      userName: '沈丽', userAccount: 'shenli', userOrg: '物业管理部',
      subject: '品质专项沟通', submitAt: addDays(today, -2) + ' 11:00:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 09:05:00', cancelBy: '系统管理员', cancelReason: '会议室设备故障，物业取消'
    },
    {
      id: 'bc-next-r1', code: 'MR' + addDays(today, 1).replace(/-/g, '') + '901',
      roomId: 'r1', date: addDays(today, 1), startMin: 10 * 60, endMin: 11 * 60 + 30,
      userName: '张三', userAccount: 'zhangsan', userOrg: '工程部',
      subject: '施工进度会', submitAt: addDays(today, -1) + ' 14:30:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 10:40:00', cancelBy: '张三', cancelReason: '现场碰头即可，无需会议室'
    },
    {
      id: 'bc-next-r2', code: 'MR' + addDays(today, 1).replace(/-/g, '') + '902',
      roomId: 'r2', date: addDays(today, 1), startMin: 14 * 60, endMin: 15 * 60,
      userName: '赵六', userAccount: 'zhaoliu', userOrg: '安保部',
      subject: '夜间值班交接', submitAt: today + ' 09:20:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 11:25:00', cancelBy: '赵六', cancelReason: '值班表已调整'
    },
    {
      id: 'bc-next-r3', code: 'MR' + addDays(today, 1).replace(/-/g, '') + '903',
      roomId: 'r3', date: addDays(today, 1), startMin: 15 * 60 + 30, endMin: 16 * 60 + 30,
      userName: '何琳', userAccount: 'helin', userOrg: '物业管理部',
      subject: '消防培训预备会', submitAt: today + ' 08:50:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 13:10:00', cancelBy: '系统管理员', cancelReason: '培训改到大堂集中宣讲'
    },
    {
      id: 'bc-next2-r2', code: 'MR' + addDays(today, 2).replace(/-/g, '') + '901',
      roomId: 'r2', date: addDays(today, 2), startMin: 15 * 60, endMin: 16 * 60,
      userName: '冯刚', userAccount: 'fenggang', userOrg: '安保部',
      subject: '门岗复盘会', submitAt: today + ' 15:00:00',
      status: '已取消', cancelled: true,
      cancelAt: today + ' 16:10:00', cancelBy: '冯刚', cancelReason: '改用线上沟通'
    }
  ];
}

function createBookings() {
  const today = formatDate(new Date());
  const historical = bookingSeed.filterHistoricalBookings(legacyBookings, today, formatDate);
  const advance = bookingSeed.buildAdvanceWindowBookings({
    rooms: rooms,
    categories: categories,
    formatDate: formatDate,
    addDays: addDays,
    parseTimeToMin: parseTime,
    pad: pad,
    currentUser: { name: '系统管理员', account: 'admin', org: '物业管理部' }
  });
  return historical.concat(advance).concat(buildCancelledDemoBookings(today));
}

module.exports = {
  pad: pad,
  formatDate: formatDate,
  addDays: addDays,
  parseTime: parseTime,
  categories: categories,
  rooms: rooms,
  createBookings: createBookings
};
