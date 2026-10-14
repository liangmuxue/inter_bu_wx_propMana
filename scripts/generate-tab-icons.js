/**
 * 生成 81×81 TabBar 图标（灰色默认 / 蓝色选中）
 * 运行：node scripts/generate-tab-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '../miniprogram/assets/icons');
const W = 81;
const H = 81;

const GRAY = [113, 128, 150];
const BLUE = [26, 95, 219];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(rgba, filePath) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    rgba.slice(y * W * 4, (y + 1) * W * 4).copy(raw, y * (W * 4 + 1) + 1);
  }
  const compressed = zlib.deflateSync(raw);

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(filePath, png);
}

function fill(r, g, b) {
  const buf = Buffer.alloc(W * H * 4, 0);
  for (let i = 0; i < W * H; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

function setPixel(buf, x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = color[0];
  buf[i + 1] = color[1];
  buf[i + 2] = color[2];
  buf[i + 3] = 255;
}

function rect(buf, x0, y0, x1, y1, color, fillAlpha) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      setPixel(buf, x, y, color);
      if (fillAlpha !== undefined) {
        const i = (y * W + x) * 4 + 3;
        buf[i] = fillAlpha;
      }
    }
  }
}

function circle(buf, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) {
        setPixel(buf, x, y, color);
      }
    }
  }
}

function drawIcon(type, color) {
  const buf = fill(255, 255, 255);
  const c = color;
  const pad = 14;
  if (type === 'workbench') {
    rect(buf, pad + 8, pad + 18, W - pad - 8, H - pad - 10, c);
    rect(buf, pad + 18, pad + 8, pad + 28, pad + 22, c);
  } else if (type === 'message') {
    rect(buf, pad, pad + 10, W - pad, H - pad - 8, c);
    circle(buf, W - pad - 14, pad + 16, 6, [255, 255, 255]);
    setPixel(buf, W - pad - 14, pad + 16, c);
  } else if (type === 'schedule') {
    rect(buf, pad, pad + 6, W - pad, H - pad, c);
    rect(buf, pad, pad + 6, W - pad, pad + 18, c);
    rect(buf, pad + 12, pad + 28, pad + 16, pad + 34, [255, 255, 255]);
    rect(buf, pad + 28, pad + 28, pad + 32, pad + 34, [255, 255, 255]);
    rect(buf, pad + 44, pad + 28, pad + 48, pad + 34, [255, 255, 255]);
  } else if (type === 'mine') {
    circle(buf, 40, 28, 12, c);
    rect(buf, 24, 44, 56, 66, c);
  } else if (type === 'todo') {
    rect(buf, pad + 6, pad + 10, W - pad - 6, pad + 18, c);
    rect(buf, pad + 10, pad + 24, W - pad - 10, pad + 30, c);
    rect(buf, pad + 10, pad + 36, pad + 34, pad + 42, c);
    rect(buf, pad + 10, pad + 48, W - pad - 22, pad + 54, c);
    rect(buf, pad + 10, pad + 60, pad + 40, pad + 66, c);
  }
  return buf;
}

fs.mkdirSync(OUT, { recursive: true });

[
  ['workbench', 'workbench.png', 'workbench-active.png'],
  ['todo', 'todo.png', 'todo-active.png'],
  ['message', 'message.png', 'message-active.png'],
  ['schedule', 'schedule.png', 'schedule-active.png'],
  ['mine', 'mine.png', 'mine-active.png']
].forEach(function (item) {
  writePng(drawIcon(item[0], GRAY), path.join(OUT, item[1]));
  writePng(drawIcon(item[0], BLUE), path.join(OUT, item[2]));
});

console.log('Tab icons written to', OUT);
