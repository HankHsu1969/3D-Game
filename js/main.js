import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { KINDS, allPairs, drawFace, FONT_PROBE, FONT_TEXT } from './faces.js';
import { buildLayout } from './layouts.js';
import { Sound } from './audio.js';

// Tile-back art generated on Higgsfield (H站). Tried in order; if none can be
// loaded as a WebGL texture we fall back to a procedural jade pattern.
const TILE_BACK_SOURCES = [
  'assets/tile_back.png',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3BVzWwzFpQMnczqiEQPK9nELTJU/hf_20260923_083104_300ac4b5-82a9-4958-944e-bc1e67dd67fb.png',
];

// Tile dimensions in world units.
const TW = 1.0, TD = 1.32, BODY_H = 0.5, BASE_H = 0.22, GAP = 1.03;
const LAYER_H = BODY_H + BASE_H + 0.015;

const $ = id => document.getElementById(id);
const sound = new Sound();

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = 1.15;
controls.minDistance = 6;
controls.maxDistance = 40;

scene.add(new THREE.HemisphereLight(0xfff4dc, 0x173d32, 0.9));
const sun = new THREE.DirectionalLight(0xffe7b8, 2.2);
sun.position.set(-6, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
sun.shadow.radius = 4;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9fe0c8, 0.6);
rim.position.set(8, 6, -10);
scene.add(rim);

// A soft felt "table" plus an invisible plane that only catches shadows.
function tableTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, 'rgba(10,40,32,0.72)');
  grad.addColorStop(0.7, 'rgba(8,30,24,0.45)');
  grad.addColorStop(1, 'rgba(8,30,24,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(34, 26),
  new THREE.MeshBasicMaterial({ map: tableTexture(), transparent: true, depthWrite: false }),
);
table.rotation.x = -Math.PI / 2;
table.position.y = -0.01;
scene.add(table);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.38 }));
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

const board = new THREE.Group();
scene.add(board);

// ---------------------------------------------------------------------------
// Materials & textures
// ---------------------------------------------------------------------------
const bodyGeo = new RoundedBoxGeometry(TW, BODY_H, TD, 4, 0.1);
const baseGeo = new RoundedBoxGeometry(TW, BASE_H + 0.06, TD, 4, 0.1);
const faceGeo = new THREE.PlaneGeometry(TW * 0.86, TD * 0.88);
faceGeo.rotateX(-Math.PI / 2);

const baseMat = new THREE.MeshPhysicalMaterial({
  color: 0x1c7a5c, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2,
});

function proceduralBack() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0f6a4d';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(232,195,106,0.55)';
  g.lineWidth = 3;
  for (let y = -16; y < 280; y += 32)
    for (let x = -16; x < 280; x += 32) {
      g.beginPath();
      g.arc(x + ((y / 32) % 2 ? 16 : 0), y, 14, Math.PI, 0);
      g.stroke();
    }
  return c;
}

function applyBack(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  baseMat.map = tex;
  baseMat.color.set(0xffffff);
  baseMat.needsUpdate = true;
}

function loadTileBack(i = 0) {
  if (i >= TILE_BACK_SOURCES.length) return applyBack(new THREE.CanvasTexture(proceduralBack()));
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  loader.load(TILE_BACK_SOURCES[i], applyBack, undefined, () => loadTileBack(i + 1));
}
loadTileBack();

const faceTex = new Map();
function faceTexture(kind) {
  if (!faceTex.has(kind.id)) {
    const t = new THREE.CanvasTexture(drawFace(kind));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    faceTex.set(kind.id, t);
  }
  return faceTex.get(kind.id);
}

const COLOR_FREE = new THREE.Color(0xffffff);
const COLOR_BLOCKED = new THREE.Color(0xcfc6b2);
const EMIT_SELECT = new THREE.Color(0xffb627);
const EMIT_HINT = new THREE.Color(0x2fd4ff);
const EMIT_NONE = new THREE.Color(0x000000);

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const state = {
  layout: 'turtle',
  tiles: [],
  selected: null,
  history: [],
  score: 0,
  combo: 0,
  lastMatch: 0,
  startTime: 0,
  elapsed: 0,
  running: false,
  hint: null,
  hover: null,
};

const anims = [];
function animate(dur, update, done) {
  anims.push({ t0: performance.now(), dur, update, done });
}

function makeTileMesh(tile) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xfaf3e2, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25,
    emissive: 0x000000, transparent: true,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = BASE_H + BODY_H / 2;
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = (BASE_H + 0.06) / 2;
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTexture(tile.kind), roughness: 0.4, metalness: 0, transparent: true,
    emissive: 0x000000, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.y = BASE_H + BODY_H + 0.002;
  for (const m of [body, base, face]) {
    m.castShadow = m !== face;
    m.receiveShadow = true;
    m.userData.tile = tile;
  }
  g.add(base, body, face);
  tile.faceMat = faceMat;
  tile.bodyMat = bodyMat;
  tile.mesh = g;
  return g;
}

function setKind(tile, kind) {
  tile.kind = kind;
  tile.faceMat.map = faceTexture(kind);
  tile.faceMat.needsUpdate = true;
}

function homePosition(tile, center) {
  return new THREE.Vector3(
    (tile.x + 1 - center.x) * 0.5 * TW * GAP,
    tile.z * LAYER_H,
    (tile.y + 1 - center.y) * 0.5 * TD * GAP,
  );
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
const active = () => state.tiles.filter(t => !t.removed);

function isFreeIn(t, set) {
  let left = false, right = false;
  for (const u of set) {
    if (u === t) continue;
    const dx = u.x - t.x, dy = Math.abs(u.y - t.y);
    if (dy >= 2) continue;
    if (u.z > t.z && Math.abs(dx) < 2) return false;
    if (u.z === t.z) {
      if (dx < 0 && dx >= -2) left = true;
      else if (dx > 0 && dx <= 2) right = true;
      if (left && right) return false;
    }
  }
  return true;
}
const isFree = t => !t.removed && isFreeIn(t, active());
const matches = (a, b) => a !== b && a.kind.match === b.kind.match;

function freePairs() {
  const free = active().filter(isFree);
  const pairs = [];
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++)
      if (matches(free[i], free[j])) pairs.push([free[i], free[j]]);
  return pairs;
}

const shuffleArr = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Solvable deal: repeatedly take two tiles that are free *at the same time*
// out of the remaining set and give them a matching pair. Playing those
// removals in reverse order is a guaranteed solution.
function solvableAssign(positions, pairs) {
  for (let attempt = 0; attempt < 300; attempt++) {
    let rest = positions.slice();
    const out = new Map();
    const ps = shuffleArr(pairs.slice());
    let ok = true;
    for (const pair of ps) {
      const free = rest.filter(t => isFreeIn(t, rest));
      if (free.length < 2) { ok = false; break; }
      // prefer taking high tiles first so stacks do not strand a lone tile
      free.sort((a, b) => b.z - a.z + (Math.random() - 0.5) * 1.5);
      const a = free[0];
      const b = free[1 + ((Math.random() * (free.length - 1)) | 0)];
      out.set(a, pair[0]);
      out.set(b, pair[1]);
      rest = rest.filter(t => t !== a && t !== b);
    }
    if (ok) return out;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
let center = new THREE.Vector2();

function newGame(layout = state.layout) {
  state.layout = layout;
  board.clear();
  anims.length = 0;
  const cells = buildLayout(layout);
  const tiles = cells.map((c, i) => ({ ...c, id: i, removed: false }));
  const pairs = shuffleArr(allPairs()).slice(0, tiles.length / 2);
  const assign = solvableAssign(tiles, pairs);
  const flat = pairs.flat();
  tiles.forEach((t, i) => { t.kind = assign ? assign.get(t) : flat[i]; });

  const xs = tiles.map(t => t.x), ys = tiles.map(t => t.y);
  center = new THREE.Vector2((Math.min(...xs) + Math.max(...xs) + 2) / 2, (Math.min(...ys) + Math.max(...ys) + 2) / 2);

  // draw lower layers first so transparent faces sort nicely
  tiles.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  for (const t of tiles) {
    const m = makeTileMesh(t);
    t.home = homePosition(t, center);
    board.add(m);
  }
  state.tiles = tiles;
  Object.assign(state, {
    selected: null, history: [], score: 0, combo: 0, lastMatch: 0,
    startTime: performance.now(), elapsed: 0, running: true, hint: null, hover: null,
  });

  // drop-in intro animation
  tiles.forEach((t, i) => {
    const from = t.home.clone().add(new THREE.Vector3(0, 8 + t.z * 2, 0));
    t.mesh.position.copy(from);
    const delay = t.z * 160 + Math.random() * 380;
    animate(700 + delay, k => {
      const p = Math.max(0, (k * (700 + delay) - delay) / 700);
      const q = Math.min(1, p) - 1;
      const e = 1 + 2.2 * q * q * q + 1.2 * q * q; // ease-out with a small bounce
      t.mesh.position.lerpVectors(from, t.home, e);
    }, () => t.mesh.position.copy(t.home));
    // only once audio is unlocked by a user gesture (browsers block autoplay)
    if (i % 12 === 0) setTimeout(() => sound.ctx && sound.click(0.8 + Math.random() * 0.5), delay + 600);
  });

  fitCamera();
  refresh();
  $('overlay').classList.remove('show');
}

function fitCamera() {
  const xs = state.tiles.map(t => t.home.x), zs = state.tiles.map(t => t.home.z);
  const w = Math.max(...xs) - Math.min(...xs) + 2;
  const d = Math.max(...zs) - Math.min(...zs) + 2;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = Math.max(w / 2 / Math.tan(hfov / 2), (d * 1.25) / 2 / Math.tan(vfov / 2)) * 1.02 + 1;
  const dir = new THREE.Vector3(0, 0.86, 0.52).normalize();
  controls.target.set(0, 0.4, 0.3);
  camera.position.copy(dir.multiplyScalar(dist)).add(controls.target);
  controls.update();
}

function refresh() {
  const act = active();
  for (const t of act) {
    const free = isFreeIn(t, act);
    t.free = free;
    t.faceMat.color.copy(free ? COLOR_FREE : COLOR_BLOCKED);
    t.bodyMat.color.set(free ? 0xfaf3e2 : 0xe2d9c4);
    let emit = EMIT_NONE;
    if (state.hint && state.hint.includes(t)) emit = EMIT_HINT;
    if (state.selected === t) emit = EMIT_SELECT;
    t.faceMat.emissive.copy(emit);
    t.bodyMat.emissive.copy(emit);
    t.faceMat.emissiveIntensity = t.bodyMat.emissiveIntensity = emit === EMIT_NONE ? 0 : 0.45;
  }
  const moves = freePairs().length;
  $('remain').textContent = act.length;
  $('moves').textContent = moves;
  $('score').textContent = state.score;

  if (state.running && act.length === 0) return win();
  if (state.running && moves === 0) stuck();
}

function select(tile) {
  const prev = state.selected;
  state.selected = tile;
  if (prev) lift(prev, 0);
  if (tile) lift(tile, 0.18);
  refresh();
}

function lift(tile, h) {
  const start = tile.mesh.position.y;
  const target = tile.home.y + h;
  animate(140, k => { tile.mesh.position.y = start + (target - start) * k; });
}

function shake(tile) {
  const x0 = tile.home.x;
  animate(320, k => { tile.mesh.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.08 * (1 - k); },
    () => { tile.mesh.position.x = x0; });
}

function removePair(a, b) {
  const now = performance.now();
  state.combo = now - state.lastMatch < 4000 ? state.combo + 1 : 0;
  state.lastMatch = now;
  const gain = 10 + state.combo * 5;
  state.score += gain;
  state.history.push({ a, b, gain });
  a.removed = b.removed = true;
  state.selected = null;
  state.hint = null;
  sound.match(state.combo);
  if (state.combo > 0) toast(`連擊 ×${state.combo + 1}！ +${gain}`);

  const mid = a.mesh.position.clone().add(b.mesh.position).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.6, 0));
  for (const t of [a, b]) {
    const from = t.mesh.position.clone();
    const spin = (Math.random() - 0.5) * 2;
    animate(520, k => {
      const e = k * k;
      t.mesh.position.lerpVectors(from, mid, 1 - Math.pow(1 - k, 2));
      t.mesh.rotation.y = spin * e;
      t.mesh.scale.setScalar(1 - e * 0.6);
      t.faceMat.opacity = t.bodyMat.opacity = 1 - e;
    }, () => {
      t.mesh.visible = false;
    });
  }
  setTimeout(() => sparkle(mid), 380);
  refresh();
}

function restore(t) {
  t.removed = false;
  t.mesh.visible = true;
  t.mesh.position.copy(t.home);
  t.mesh.rotation.set(0, 0, 0);
  t.mesh.scale.setScalar(1);
  t.faceMat.opacity = t.bodyMat.opacity = 1;
}

function undo() {
  const h = state.history.pop();
  if (!h) return toast('沒有可以悔的步驟');
  restore(h.a);
  restore(h.b);
  state.score = Math.max(0, state.score - h.gain);
  state.combo = 0;
  state.running = true;
  if (state.selected) select(null);
  sound.click(0.8);
  $('overlay').classList.remove('show');
  refresh();
}

function hint() {
  const pairs = freePairs();
  if (!pairs.length) return toast('沒有可配對的牌了，試試洗牌');
  state.hint = pairs[(Math.random() * pairs.length) | 0];
  state.score = Math.max(0, state.score - 5);
  sound.hint();
  refresh();
  const h = state.hint;
  setTimeout(() => { if (state.hint === h) { state.hint = null; refresh(); } }, 2500);
}

function reshuffle() {
  const act = active();
  if (act.length < 2) return;
  // regroup the remaining kinds into matching pairs, then re-deal them solvably
  const groups = new Map();
  for (const t of act) {
    if (!groups.has(t.kind.match)) groups.set(t.kind.match, []);
    groups.get(t.kind.match).push(t.kind);
  }
  const pairs = [];
  for (const ks of groups.values()) for (let i = 0; i + 1 < ks.length; i += 2) pairs.push([ks[i], ks[i + 1]]);
  const assign = solvableAssign(act, pairs);
  const flat = shuffleArr(pairs.flat());
  act.forEach((t, i) => setKind(t, assign ? assign.get(t) : flat[i]));
  if (state.selected) select(null);
  state.hint = null;
  state.score = Math.max(0, state.score - 20);
  state.running = true;
  $('overlay').classList.remove('show');
  sound.shuffle();
  for (const t of act) {
    const r0 = Math.random() * Math.PI;
    animate(500, k => {
      t.mesh.rotation.y = (1 - k) * r0 * 2;
      t.mesh.position.y = t.home.y + Math.sin(k * Math.PI) * 0.6;
    }, () => { t.mesh.rotation.y = 0; t.mesh.position.y = t.home.y; });
  }
  toast(assign ? '已洗牌（保證有解）' : '已洗牌');
  refresh();
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function win() {
  state.running = false;
  state.elapsed = performance.now() - state.startTime;
  sound.win();
  for (let i = 0; i < 6; i++) setTimeout(() => sparkle(new THREE.Vector3((Math.random() - 0.5) * 10, 2 + Math.random() * 3, (Math.random() - 0.5) * 6), 80), i * 220);
  const bonus = Math.max(0, 600 - Math.floor(state.elapsed / 1000)) * 2;
  state.score += bonus;
  $('score').textContent = state.score;
  setTimeout(() => showPanel(`
    <h1>勝利</h1>
    <p class="sub">全部清除！用時 <b>${fmtTime(state.elapsed)}</b><br/>時間獎勵 +${bonus}　總分 <b>${state.score}</b></p>
    ${layoutButtons()}`), 1200);
}

function stuck() {
  toast('沒有可配對的牌了');
  showPanel(`
    <h1>無路可走</h1>
    <p class="sub">目前沒有可以消除的配對。<br/>剩餘 ${active().length} 張牌。</p>
    <div class="layouts">
      <button class="primary" data-act="shuffle">🔀 洗牌繼續（-20 分）</button>
      <button data-act="undo">↶ 悔棋</button>
    </div>
    ${layoutButtons()}`);
}

function layoutButtons() {
  return `<div class="layouts">
      <button data-layout="turtle" class="primary">🐢 經典烏龜（144 張）</button>
      <button data-layout="pyramid">🔺 金字塔（120 張）</button>
      <button data-layout="fortress">🏯 城堡（106 張）</button>
      <button data-layout="easy">🌱 入門（36 張）</button>
    </div>`;
}

function showPanel(html) {
  const panel = document.querySelector('#overlay .panel');
  panel.innerHTML = html;
  $('overlay').classList.add('show');
}

$('overlay').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  sound.ensure();
  if (b.dataset.layout) newGame(b.dataset.layout);
  else if (b.dataset.act === 'shuffle') reshuffle();
  else if (b.dataset.act === 'undo') undo();
});

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
const sparkTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,220,130,0.9)');
  grad.addColorStop(1, 'rgba(255,180,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

function sparkle(pos, count = 46) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  const v = [];
  for (let i = 0; i < count; i++) {
    p.set([pos.x, pos.y, pos.z], i * 3);
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize();
    v.push(dir.multiplyScalar(2 + Math.random() * 3.5));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const mat = new THREE.PointsMaterial({
    map: sparkTex, size: 0.35, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xffd27a,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  let last = 0;
  animate(1100, k => {
    const dt = (k - last) * 1.1;
    last = k;
    for (let i = 0; i < count; i++) {
      v[i].y -= 6 * dt;
      p[i * 3] += v[i].x * dt;
      p[i * 3 + 1] += v[i].y * dt;
      p[i * 3 + 2] += v[i].z * dt;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 1 - k;
    mat.size = 0.35 * (1 - k * 0.5);
  }, () => { scene.remove(pts); geo.dispose(); mat.dispose(); });
}

let toastTimer;
function toast(text) {
  const el = $('msg');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function pick(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(board.children, true).find(h => h.object.userData.tile && !h.object.userData.tile.removed);
  return hit ? hit.object.userData.tile : null;
}

renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
  downAt = null;
  if (!state.running) return;
  const t = pick(e);
  if (!t) { if (state.selected) select(null); return; }
  onTile(t);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (e.buttons) return;
  const t = pick(e);
  renderer.domElement.style.cursor = t && isFree(t) ? 'pointer' : 'default';
  if (t !== state.hover) {
    const prev = state.hover;
    state.hover = t;
    if (prev && !prev.removed && prev !== state.selected) lift(prev, 0);
    if (t && isFree(t) && t !== state.selected) lift(t, 0.07);
  }
});

function onTile(t) {
  sound.ensure();
  if (!isFree(t)) {
    sound.error();
    shake(t);
    toast('這張牌被擋住了');
    return;
  }
  const s = state.selected;
  if (s === t) { sound.click(0.9); select(null); return; }
  if (s && matches(s, t)) { removePair(s, t); return; }
  sound.click();
  select(t);
}

$('btnHint').onclick = () => { sound.ensure(); hint(); };
$('btnUndo').onclick = () => { sound.ensure(); undo(); };
$('btnShuffle').onclick = () => { sound.ensure(); reshuffle(); };
$('btnNew').onclick = () => { sound.ensure(); state.running = false; showPanel(`<h1>新局</h1><p class="sub">選擇牌陣</p>${layoutButtons()}`); };
$('btnSound').onclick = e => {
  sound.sfxOn = !sound.sfxOn;
  e.currentTarget.textContent = sound.sfxOn ? '🔊' : '🔇';
  e.currentTarget.classList.toggle('off', !sound.sfxOn);
};
$('btnMusic').onclick = e => {
  const on = sound.toggleMusic();
  e.currentTarget.classList.toggle('off', !on);
  toast(on ? '背景音樂：開' : '背景音樂：關');
};
$('btnMusic').classList.add('off');

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'h') hint();
  else if (k === 'z') undo();
  else if (k === 's') reshuffle();
  else if (k === 'n') $('btnNew').click();
  else if (k === 'm') $('btnSound').click();
  else if (k === 'escape' && state.selected) select(null);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (state.tiles.length) fitCamera();
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
function loop(now) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    const k = Math.min(1, (now - a.t0) / a.dur);
    a.update(k);
    if (k >= 1) { anims.splice(i, 1); a.done && a.done(); }
  }
  if (state.running) $('time').textContent = fmtTime(now - state.startTime);
  // gentle pulse on the selected / hinted tiles
  const pulse = 0.35 + Math.sin(now / 160) * 0.15;
  if (state.selected) state.selected.faceMat.emissiveIntensity = pulse;
  if (state.hint) for (const t of state.hint) t.faceMat.emissiveIntensity = t.bodyMat.emissiveIntensity = pulse + 0.15;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// Wait for the calligraphy font before painting tile faces.
(async () => {
  try {
    await Promise.race([document.fonts.load(FONT_PROBE, FONT_TEXT), new Promise(r => setTimeout(r, 3000))]);
  } catch { /* fall back to system fonts */ }
  newGame('turtle');
  state.running = false;
  $('overlay').classList.add('show');
  requestAnimationFrame(loop);
})();

// exposed for debugging in the console
window.mahjong = { state, KINDS, newGame, freePairs, camera, THREE };
