// Battle effects engine: one full-screen canvas (pointer-events: none) above the page that draws bullet tracers, arrows,
// rockets, bombs and their explosions. Used by the scope cursor (every click) and by the shooting-range game (hits).
// Browser only. Draws nothing and stops its loop when no effects are alive.

export type Weapon = 'bullet' | 'arrow' | 'rocket' | 'bomb';
type Entity = { update(dt: number): boolean; draw(ctx: CanvasRenderingContext2D): void; layer?: number };

const FIRE = ['#fff4c2', '#ffd36b', '#ff9a3c', '#f2552c', '#d3312e'];
const BRASS = '#c2a46e';
const MAX_ENTITIES = 700;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let entities: Entity[] = [];
let frame = 0;
let last = 0;
let dpr = 1;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'battle-fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}
function resize() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function add(entity: Entity) {
  if (entities.length >= MAX_ENTITIES) return;
  entities.push(entity);
  if (!frame) { last = performance.now(); frame = requestAnimationFrame(loop); }
}
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!ctx || !canvas) { frame = 0; return; }
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  // effects spawned during this update (e.g. a projectile's impact) are pushed onto `entities` by add(), so keep them
  const current = entities; entities = [];
  const alive = current.filter(e => e.update(dt));
  entities = alive.concat(entities);
  for (const layer of [0, 1, 2]) for (const e of entities) if ((e.layer ?? 1) === layer) e.draw(ctx);
  frame = entities.length ? requestAnimationFrame(loop) : 0;
  if (!frame) ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
}

/* ---------- particles ---------- */
function spark(x: number, y: number, speed: number, color = pick(FIRE), life = rand(0.25, 0.6)) {
  const a = rand(0, Math.PI * 2), v = rand(speed * 0.4, speed);
  let vx = Math.cos(a) * v, vy = Math.sin(a) * v, t = 0;
  add({
    layer: 2,
    update(dt) { t += dt; vy += 900 * dt; vx *= 0.98; x += vx * dt; y += vy * dt; return t < life; },
    draw(c) { const k = 1 - t / life; c.strokeStyle = color; c.globalAlpha = k; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - vx * 0.03, y - vy * 0.03); c.stroke(); c.globalAlpha = 1; },
  });
}
function smoke(x: number, y: number, size: number, life = rand(0.8, 1.6), drift = 30) {
  let t = 0; const vx = rand(-drift, drift), vy = rand(-60, -20), shade = Math.round(rand(70, 120));
  add({
    layer: 0,
    update(dt) { t += dt; x += vx * dt; y += vy * dt; return t < life; },
    draw(c) { const k = t / life; c.globalAlpha = 0.45 * (1 - k); c.fillStyle = `rgb(${shade},${shade},${shade - 6})`; c.beginPath(); c.arc(x, y, size * (0.6 + k * 1.6), 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; },
  });
}
function fireball(x: number, y: number, size: number) {
  let t = 0; const life = rand(0.35, 0.7), vx = rand(-140, 140) * size / 30, vy = rand(-170, 60) * size / 30, color = pick(FIRE.slice(1));
  add({
    layer: 1,
    update(dt) { t += dt; x += vx * dt; y += vy * dt; return t < life; },
    draw(c) { const k = t / life; c.globalAlpha = 1 - k; c.fillStyle = color; c.beginPath(); c.arc(x, y, size * (1 - k * 0.7), 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; },
  });
}
function flash(x: number, y: number, radius: number, life = 0.14) {
  let t = 0;
  add({
    layer: 2,
    update(dt) { t += dt; return t < life; },
    draw(c) { const k = 1 - t / life; const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, `rgba(255,248,214,${k})`); g.addColorStop(0.4, `rgba(255,170,60,${0.7 * k})`); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill(); },
  });
}
function ring(x: number, y: number, radius: number, life = 0.45, color = '255,236,200') {
  let t = 0;
  add({
    layer: 2,
    update(dt) { t += dt; return t < life; },
    draw(c) { const k = t / life; c.strokeStyle = `rgba(${color},${1 - k})`; c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.arc(x, y, radius * (0.2 + k), 0, Math.PI * 2); c.stroke(); },
  });
}
function debris(x: number, y: number, speed: number) {
  const a = rand(-Math.PI, 0), v = rand(speed * 0.4, speed); let vx = Math.cos(a) * v, vy = Math.sin(a) * v, t = 0, r = rand(0, 6); const spin = rand(-12, 12), life = rand(0.6, 1.2), w = rand(3, 7);
  add({
    layer: 1,
    update(dt) { t += dt; vy += 1200 * dt; x += vx * dt; y += vy * dt; r += spin * dt; return t < life; },
    draw(c) { c.save(); c.globalAlpha = 1 - t / life; c.translate(x, y); c.rotate(r); c.fillStyle = '#2b2a24'; c.fillRect(-w / 2, -w / 3, w, w / 1.5); c.restore(); },
  });
}
function hole(x: number, y: number) {
  let t = 0; const life = 1.4;
  add({
    layer: 0,
    update(dt) { t += dt; return t < life; },
    draw(c) { const k = 1 - t / life; c.globalAlpha = k; c.fillStyle = '#111'; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = i * 1.26; c.beginPath(); c.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.stroke(); } c.globalAlpha = 1; },
  });
}
export function popupText(x: number, y: number, text: string, color = '#ffd36b') {
  let t = 0; const life = 0.9;
  add({
    layer: 2,
    update(dt) { t += dt; y -= 50 * dt; return t < life; },
    draw(c) { c.globalAlpha = 1 - t / life; c.font = '700 20px "Bebas Neue", Impact, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y); c.globalAlpha = 1; },
  });
}

/* ---------- impacts ---------- */
export function impact(x: number, y: number) {
  ensureCanvas();
  flash(x, y, 26, 0.1); hole(x, y);
  for (let i = 0; i < 12; i++) spark(x, y, 420, pick([...FIRE.slice(0, 3), BRASS]), rand(0.15, 0.4));
  smoke(x, y, 6, 0.6, 15);
}
export function explosion(x: number, y: number, scale = 1) {
  ensureCanvas();
  flash(x, y, 120 * scale, 0.2); ring(x, y, 150 * scale, 0.5); ring(x, y, 90 * scale, 0.35, '255,170,80');
  for (let i = 0; i < 22 * scale; i++) fireball(x + rand(-10, 10), y + rand(-10, 10), rand(10, 22) * scale);
  for (let i = 0; i < 26 * scale; i++) spark(x, y, 700 * scale);
  for (let i = 0; i < 12 * scale; i++) debris(x, y, 650 * scale);
  for (let i = 0; i < 10 * scale; i++) smoke(x + rand(-25, 25) * scale, y + rand(-20, 10) * scale, rand(12, 24) * scale);
}

/* ---------- projectiles ---------- */
type Path = { sx: number; sy: number; tx: number; ty: number; duration: number; arc: number };
function along(p: Path, k: number) {
  const x = p.sx + (p.tx - p.sx) * k, y = p.sy + (p.ty - p.sy) * k - Math.sin(Math.PI * k) * p.arc;
  return { x, y };
}
function projectile(p: Path, draw: (c: CanvasRenderingContext2D, x: number, y: number, angle: number, k: number) => void, trail: ((x: number, y: number) => void) | null, onHit: () => void) {
  let t = 0, px = p.sx, py = p.sy, angle = Math.atan2(p.ty - p.sy, p.tx - p.sx);
  add({
    layer: 1,
    update(dt) {
      t += dt; const k = Math.min(1, t / p.duration); const { x, y } = along(p, k);
      if (x !== px || y !== py) angle = Math.atan2(y - py, x - px);
      px = x; py = y; trail?.(x, y);
      if (k >= 1) { onHit(); return false; }
      return true;
    },
    draw(c) { draw(c, px, py, angle, Math.min(1, t / p.duration)); },
  });
}
function edgeStart(tx: number, ty: number, from: 'side' | 'bottom' | 'top') {
  const w = window.innerWidth, h = window.innerHeight;
  if (from === 'top') return { sx: tx + rand(-180, 180), sy: -40 };
  if (from === 'bottom') return { sx: tx < w / 2 ? w + 40 : -40, sy: h + rand(0, 60) };
  return { sx: tx < w / 2 ? w + 30 : -30, sy: ty + rand(-120, 60) };
}

function fireBullet(tx: number, ty: number) {
  const { sx, sy } = edgeStart(tx, ty, 'bottom');
  // three-round burst of tracers
  for (let i = 0; i < 3; i++) {
    const ox = rand(-10, 10), oy = rand(-10, 10);
    setTimeout(() => projectile({ sx, sy, tx: tx + ox, ty: ty + oy, duration: 0.09, arc: 0 },
      (c, x, y, a) => { c.strokeStyle = '#fff1b8'; c.lineWidth = 2.5; c.shadowColor = '#ffb347'; c.shadowBlur = 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a) * 70, y - Math.sin(a) * 70); c.stroke(); c.shadowBlur = 0; },
      null, () => impact(tx + ox, ty + oy)), i * 70);
  }
}
function fireArrow(tx: number, ty: number) {
  const { sx, sy } = edgeStart(tx, ty, 'side');
  const drawArrow = (c: CanvasRenderingContext2D, x: number, y: number, a: number) => {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-46, 0); c.lineTo(0, 0); c.stroke();
    c.fillStyle = '#cfd3d6'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-6, -5); c.lineTo(-6, 5); c.closePath(); c.fill();
    c.fillStyle = '#d3312e'; c.beginPath(); c.moveTo(-40, 0); c.lineTo(-50, -7); c.lineTo(-46, 0); c.lineTo(-50, 7); c.closePath(); c.fill();
    c.restore();
  };
  projectile({ sx, sy, tx, ty, duration: 0.32, arc: 70 }, drawArrow, null, () => {
    // the arrow sticks and quivers, then fades
    let t = 0; const life = 1.1, a = Math.atan2(ty - sy, tx - sx) + 0.25 * Math.sign(tx - sx);
    for (let i = 0; i < 8; i++) spark(tx, ty, 220, '#d9c9a3', rand(0.15, 0.35));
    ring(tx, ty, 36, 0.3);
    add({ layer: 1, update(dt) { t += dt; return t < life; }, draw(c) { c.globalAlpha = Math.min(1, (life - t) * 3); drawArrow(c, tx, ty, a + Math.sin(t * 40) * 0.08 * Math.max(0, 1 - t * 2)); c.globalAlpha = 1; } });
  });
}
function fireRocket(tx: number, ty: number) {
  const { sx, sy } = edgeStart(tx, ty, 'bottom');
  projectile({ sx, sy, tx, ty, duration: 0.5, arc: 90 },
    (c, x, y, a) => {
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(-60, 0, -18, 0); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, '#ffd36b');
      c.fillStyle = g; c.beginPath(); c.moveTo(-18, -5); c.lineTo(-58 - rand(0, 12), 0); c.lineTo(-18, 5); c.fill();
      c.fillStyle = '#4c5a46'; c.fillRect(-20, -6, 26, 12);
      c.fillStyle = '#d3312e'; c.beginPath(); c.moveTo(6, -6); c.lineTo(16, 0); c.lineTo(6, 6); c.closePath(); c.fill();
      c.fillStyle = '#2f3a2c'; c.beginPath(); c.moveTo(-20, -6); c.lineTo(-27, -12); c.lineTo(-14, -6); c.moveTo(-20, 6); c.lineTo(-27, 12); c.lineTo(-14, 6); c.fill();
      c.restore();
    },
    (x, y) => { smoke(x, y, rand(5, 9), rand(0.5, 1), 10); if (Math.random() < 0.6) spark(x, y, 120, pick(FIRE), 0.2); },
    () => explosion(tx, ty, 1));
}
function fireBomb(tx: number, ty: number) {
  const { sx, sy } = edgeStart(tx, ty, 'top');
  let spin = 0;
  projectile({ sx, sy, tx, ty, duration: 0.62, arc: -40 },
    (c, x, y, a) => {
      spin += 0.02;
      c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2 + Math.sin(spin * 6) * 0.05);
      c.fillStyle = '#26302a'; c.beginPath(); c.ellipse(0, 0, 10, 17, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3d4a3f'; c.fillRect(-9, -26, 18, 7); c.fillRect(-2, -26, 4, 10);
      c.fillStyle = '#c2a46e'; c.fillRect(-10, -3, 20, 3);
      c.restore();
    },
    (x, y) => { if (Math.random() < 0.3) smoke(x, y, 3, 0.4, 5); },
    () => { explosion(tx, ty, 1.35); setTimeout(() => explosion(tx + rand(-40, 40), ty + rand(-20, 20), 0.55), 120); });
}

const weapons: Record<Weapon, (x: number, y: number) => void> = { bullet: fireBullet, arrow: fireArrow, rocket: fireRocket, bomb: fireBomb };
let lastWeapon: Weapon | null = null;

/** Fires a weapon at a screen point (viewport coordinates). With no weapon given, picks a different one each time. */
export function fireAt(x: number, y: number, weapon?: Weapon) {
  ensureCanvas();
  const choice = weapon ?? pick((Object.keys(weapons) as Weapon[]).filter(w => w !== lastWeapon));
  lastWeapon = choice;
  weapons[choice](x, y);
  return choice;
}

/** Removes the overlay and stops all effects (used when motion is paused). */
export function stopAll() {
  entities = [];
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
