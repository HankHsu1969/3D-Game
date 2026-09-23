// Board layouts. Coordinates are in half-tile units: a tile at (x, y) covers
// x..x+2 horizontally and y..y+2 vertically, so half-offsets (odd values)
// let tiles straddle two rows/columns. z is the layer (0 = table).

function rect(z, x0, y0, cols, rows, out) {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push({ x: (x0 + c) * 2, y: (y0 + r) * 2, z });
}

function row(z, y, x0, count, out) {
  for (let c = 0; c < count; c++) out.push({ x: (x0 + c) * 2, y: y * 2, z });
}

function turtle() {
  const t = [];
  // Layer 0: 84 tiles in 8 rows + 3 "ears".
  const widths = [12, 8, 10, 12, 12, 10, 8, 12];
  widths.forEach((w, r) => row(0, r, (12 - w) / 2, w, t));
  t.push({ x: -2, y: 7, z: 0 });   // left ear
  t.push({ x: 24, y: 7, z: 0 });   // right ears
  t.push({ x: 26, y: 7, z: 0 });
  rect(1, 3, 1, 6, 6, t);          // 36
  rect(2, 4, 2, 4, 4, t);          // 16
  rect(3, 5, 3, 2, 2, t);          // 4
  t.push({ x: 11, y: 7, z: 4 });   // crown
  return t;                        // 144
}

function pyramid() {
  const t = [];
  rect(0, 0, 0, 10, 8, t);         // 80
  rect(1, 2, 1, 6, 5, t);          // 30
  rect(2, 3, 2, 4, 2, t);          // 8
  t.push({ x: 8, y: 5, z: 3 });    // 1
  t.push({ x: 10, y: 5, z: 3 });   // 1
  return t;                        // 120
}

function fortress() {
  const t = [];
  rect(0, 0, 0, 12, 6, t);         // 72
  // four towers in the corners
  rect(1, 0, 0, 2, 2, t);
  rect(1, 10, 0, 2, 2, t);
  rect(1, 0, 4, 2, 2, t);
  rect(1, 10, 4, 2, 2, t);         // 16
  rect(1, 4, 2, 4, 2, t);          // 8  keep
  rect(2, 4.5, 2.5, 3, 1, t);      // 3
  t.push({ x: 1, y: 1, z: 2 }, { x: 21, y: 1, z: 2 }, { x: 1, y: 9, z: 2 }, { x: 21, y: 9, z: 2 }); // 4
  t.push({ x: 8, y: 5, z: 3 }, { x: 10, y: 5, z: 3 }, { x: 12, y: 5, z: 3 }); // 3
  return t;                        // 106
}

function easy() {
  const t = [];
  rect(0, 0, 0, 6, 4, t);          // 24
  rect(1, 1, 1, 4, 2, t);          // 8
  rect(2, 2, 1.5, 2, 1, t);        // 2
  t.push({ x: 4, y: 3, z: 3 }, { x: 6, y: 3, z: 3 }); // 2
  return t;                        // 36
}

export const LAYOUTS = {
  turtle: { name: '經典烏龜', build: turtle },
  pyramid: { name: '金字塔', build: pyramid },
  fortress: { name: '城堡', build: fortress },
  easy: { name: '入門', build: easy },
};

export function buildLayout(key) {
  const tiles = LAYOUTS[key].build();
  if (tiles.length % 2) tiles.pop();
  return tiles;
}
