// Tile set definition and procedural face artwork drawn on a canvas.

export const FACE_W = 256;
export const FACE_H = 332;

const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const FONT = '"Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif';

// Every distinct tile kind. `match` decides which kinds pair with each other:
// the four flowers match any flower, the four seasons match any season.
export const KINDS = [];
for (let n = 1; n <= 9; n++) KINDS.push({ id: `m${n}`, suit: 'man', n, match: `m${n}` });
for (let n = 1; n <= 9; n++) KINDS.push({ id: `p${n}`, suit: 'pin', n, match: `p${n}` });
for (let n = 1; n <= 9; n++) KINDS.push({ id: `s${n}`, suit: 'sou', n, match: `s${n}` });
['東', '南', '西', '北'].forEach((c, i) => KINDS.push({ id: `w${i}`, suit: 'wind', ch: c, match: `w${i}` }));
[['中', '#c8201e'], ['發', '#18794e'], ['白', '#2356a8']].forEach(([c, col], i) =>
  KINDS.push({ id: `d${i}`, suit: 'dragon', ch: c, color: col, match: `d${i}` }));
['梅', '蘭', '菊', '竹'].forEach((c, i) => KINDS.push({ id: `f${i}`, suit: 'flower', ch: c, n: i + 1, match: 'flower' }));
['春', '夏', '秋', '冬'].forEach((c, i) => KINDS.push({ id: `x${i}`, suit: 'season', ch: c, n: i + 1, match: 'season' }));

// A full 144-tile set expressed as 72 matching pairs.
export function allPairs() {
  const pairs = [];
  for (const k of KINDS) {
    if (k.suit === 'flower' || k.suit === 'season') continue;
    pairs.push([k, k], [k, k]);
  }
  const fl = KINDS.filter(k => k.suit === 'flower');
  const se = KINDS.filter(k => k.suit === 'season');
  pairs.push([fl[0], fl[1]], [fl[2], fl[3]], [se[0], se[1]], [se[2], se[3]]);
  return pairs;
}

export const FONT_PROBE = `900 80px ${FONT}`;
export const FONT_TEXT = '一二三四五六七八九萬東南西北中發白梅蘭菊竹春夏秋冬';

// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function base(ctx) {
  const g = ctx.createLinearGradient(0, 0, FACE_W, FACE_H);
  g.addColorStop(0, '#fffdf5');
  g.addColorStop(0.55, '#f6eedb');
  g.addColorStop(1, '#e9dcbc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FACE_W, FACE_H);
  // faint ivory grain
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(150,120,70,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * FACE_W, Math.random() * FACE_H, 1 + Math.random() * 2, 1);
  }
  ctx.strokeStyle = 'rgba(160,130,80,0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 10, 10, FACE_W - 20, FACE_H - 20, 18);
  ctx.stroke();
}

function text(ctx, s, x, y, size, color, weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 2;
  ctx.fillText(s, x, y);
  ctx.shadowColor = 'transparent';
}

// ---- dots (筒) -------------------------------------------------------------
function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill();
  // petal ticks on the outer ring
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
    ctx.lineTo(x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.98);
    ctx.stroke();
  }
}

const B = '#1f5fa8', G = '#11653f', R = '#c8201e';
const DOTS = {
  2: [[.5, .27, G], [.5, .73, B]],
  3: [[.24, .2, B], [.5, .5, R], [.76, .8, G]],
  4: [[.3, .28, B], [.7, .28, G], [.3, .72, G], [.7, .72, B]],
  5: [[.28, .24, B], [.72, .24, G], [.5, .5, R], [.28, .76, G], [.72, .76, B]],
  6: [[.3, .2, G], [.7, .2, G], [.3, .52, R], [.7, .52, R], [.3, .82, R], [.7, .82, R]],
  7: [[.22, .15, G], [.5, .26, G], [.78, .37, G], [.3, .62, R], [.7, .62, R], [.3, .85, R], [.7, .85, R]],
  8: [[.3, .15, B], [.7, .15, B], [.3, .38, B], [.7, .38, B], [.3, .62, B], [.7, .62, B], [.3, .85, B], [.7, .85, B]],
  9: [[.22, .2, B], [.5, .2, B], [.78, .2, B], [.22, .5, R], [.5, .5, R], [.78, .5, R], [.22, .8, G], [.5, .8, G], [.78, .8, G]],
};
const DOT_R = { 2: 42, 3: 34, 4: 38, 5: 32, 6: 30, 7: 26, 8: 24, 9: 27 };

function drawPin(ctx, n) {
  const px = 28, py = 30, w = FACE_W - 56, h = FACE_H - 60;
  if (n === 1) {
    const cx = FACE_W / 2, cy = FACE_H / 2;
    ctx.fillStyle = G;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 88, cy + Math.sin(a) * 88, 12, 7, a, 0, Math.PI * 2);
      ctx.fill();
    }
    dot(ctx, cx, cy, 78, B);
    dot(ctx, cx, cy, 40, R);
    return;
  }
  for (const [u, v, c] of DOTS[n]) dot(ctx, px + u * w, py + v * h, DOT_R[n], c);
}

// ---- bamboo (條) -----------------------------------------------------------
function stick(ctx, x, y, h, color) {
  const w = 20;
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, color); g.addColorStop(0.45, color === R ? '#f07a6a' : '#3fae74'); g.addColorStop(1, color);
  ctx.fillStyle = g;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  for (const ny of [y - h / 2 + 4, y, y + h / 2 - 4]) {
    roundRect(ctx, x - w / 2 - 3, ny - 3, w + 6, 6, 3);
    ctx.fill();
  }
}

const SOU = {
  2: [[.5, .27], [.5, .73]],
  3: [[.5, .27], [.3, .73], [.7, .73]],
  4: [[.3, .27], [.7, .27], [.3, .73], [.7, .73]],
  5: [[.25, .27], [.75, .27], [.5, .5], [.25, .73], [.75, .73]],
  6: [[.22, .27], [.5, .27], [.78, .27], [.22, .73], [.5, .73], [.78, .73]],
  7: [[.5, .16], [.22, .5], [.5, .5], [.78, .5], [.22, .84], [.5, .84], [.78, .84]],
  8: [[.2, .27], [.4, .27], [.6, .27], [.8, .27], [.2, .73], [.4, .73], [.6, .73], [.8, .73]],
  9: [[.22, .16], [.5, .16], [.78, .16], [.22, .5], [.5, .5], [.78, .5], [.22, .84], [.5, .84], [.78, .84]],
};

function bird(ctx) {
  const cx = FACE_W / 2, cy = FACE_H / 2 + 6;
  // tail feathers
  const tails = [[-0.9, G], [-0.45, B], [0, R], [0.45, B], [0.9, G]];
  for (const [a, c] of tails) {
    ctx.save();
    ctx.translate(cx, cy + 30);
    ctx.rotate(a * 0.55);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 70, 16, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(0, 108, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // body
  ctx.fillStyle = G;
  ctx.beginPath(); ctx.ellipse(cx, cy, 46, 56, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7fd3a2';
  ctx.beginPath(); ctx.ellipse(cx + 8, cy + 6, 26, 36, 0.3, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = R;
  ctx.beginPath(); ctx.arc(cx - 6, cy - 70, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy - 72); ctx.lineTo(cx - 58, cy - 62); ctx.lineTo(cx - 30, cy - 58);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - 14, cy - 76, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(cx - 15, cy - 76, 3.5, 0, Math.PI * 2); ctx.fill();
  // crest
  ctx.strokeStyle = B; ctx.lineWidth = 4;
  for (const d of [-10, 0, 10]) {
    ctx.beginPath(); ctx.moveTo(cx - 4 + d * 0.4, cy - 96); ctx.lineTo(cx + d, cy - 120); ctx.stroke();
  }
}

function drawSou(ctx, n) {
  if (n === 1) return bird(ctx);
  const px = 28, py = 30, w = FACE_W - 56, h = FACE_H - 60;
  const sh = n >= 7 ? 72 : 108;
  SOU[n].forEach(([u, v], i) => {
    const red = (n === 5 && i === 2) || (n === 7 && i === 0) || (n === 9 && (i % 3 === 1));
    stick(ctx, px + u * w, py + v * h, sh, red ? R : G);
  });
}

// ---- characters (萬) -------------------------------------------------------
function drawMan(ctx, n) {
  text(ctx, NUM[n - 1], FACE_W / 2, 104, 118, '#1b2a4a');
  text(ctx, '萬', FACE_W / 2, 238, 128, R);
}

function flourish(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (const [x, y, s] of [[40, 44, 1], [FACE_W - 40, FACE_H - 44, -1]]) {
    ctx.beginPath();
    ctx.arc(x + 10 * s, y + 10 * s, 18, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function blossom(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill();
}

// ---- honours & bonus -------------------------------------------------------
function drawHonor(ctx, k) {
  if (k.suit === 'wind') {
    flourish(ctx, '#1b2a4a');
    text(ctx, k.ch, FACE_W / 2, FACE_H / 2 + 6, 190, '#1b2a4a');
    return;
  }
  if (k.suit === 'dragon') {
    if (k.ch === '白') {
      ctx.strokeStyle = k.color;
      ctx.lineWidth = 12;
      roundRect(ctx, 44, 52, FACE_W - 88, FACE_H - 104, 10);
      ctx.stroke();
      ctx.lineWidth = 4;
      roundRect(ctx, 64, 72, FACE_W - 128, FACE_H - 144, 6);
      ctx.stroke();
      return;
    }
    text(ctx, k.ch, FACE_W / 2, FACE_H / 2 + 6, 200, k.color);
    return;
  }
  const flower = k.suit === 'flower';
  const col = flower ? '#b3265e' : '#1f5fa8';
  const petals = flower ? ['#f28bb0', '#c9a0f0', '#f6b93b', '#6fcf97'][k.n - 1]
                        : ['#7fd3a2', '#f2994a', '#e2703a', '#8ab6f0'][k.n - 1];
  blossom(ctx, 62, 70, 30, petals);
  blossom(ctx, FACE_W - 58, FACE_H - 62, 22, petals);
  text(ctx, k.ch, FACE_W / 2, FACE_H / 2 + 12, 150, col);
  text(ctx, String(k.n), FACE_W - 44, 50, 40, col, 700);
}

export function drawFace(kind) {
  const c = document.createElement('canvas');
  c.width = FACE_W;
  c.height = FACE_H;
  const ctx = c.getContext('2d');
  base(ctx);
  if (kind.suit === 'man') drawMan(ctx, kind.n);
  else if (kind.suit === 'pin') drawPin(ctx, kind.n);
  else if (kind.suit === 'sou') drawSou(ctx, kind.n);
  else drawHonor(ctx, kind);
  return c;
}
