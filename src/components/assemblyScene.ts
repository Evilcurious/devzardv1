/**
 * Hero assembly scene.
 *
 * The laptop from the hero, drawn so it can come apart. At `explode = 0` the
 * machine is the product shot it always was: silver lid, lit display, deck with
 * keys. As `explode` rises the camera pulls back, the display panel lifts off
 * the lid, and the base separates into its engineering layers — keyboard deck,
 * mainboard, battery, bottom cover — hanging in perfect vertical alignment.
 *
 * Everything is vector art in one small design space (`UNITS`); the frame is
 * fitted and centred by the computed bounds, so the same drawing works from a
 * phone to a wide monitor. Rendering is a pure function of size + explode.
 */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const TAU = Math.PI * 2;

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function hash(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const SILVER = {
  highlight: '#f4f8fa',
  light: '#e2e9ee',
  base: '#c8d1d8',
  mid: '#a9b4bd',
  low: '#848f99',
  edge: '#5a656e',
  seam: '#38424a',
} as const;

/* ── design space ───────────────────────────────────────────────────────── */

const UNITS = {
  /** Lid width, design units. */
  lidW: 760,
  ratio: 1.62,
  deckRatio: 0.36,
  angle: 100,
  angleExploded: 126,
  /** Gap between separated plates. */
  gap: 24,
  /** Side thickness of every plate. */
  thickness: 12,
} as const;

const BOARD_DEPTH = 120;
const BATTERY_DEPTH = 110;

interface Layout {
  halfW: number;
  lidHeight: number;
  lidTop: number;
  deckDepth: number;
  deckY: number;
  boardY: number;
  batteryY: number;
  bottomY: number;
  bounds: { top: number; bottom: number; left: number; right: number };
}

/** Layer positions for one explode value. The hinge sits at y = 0. */
function layout(explode: number): Layout {
  const halfW = UNITS.lidW / 2;
  const lidHeightFull = UNITS.lidW / UNITS.ratio;
  const angle = ((UNITS.angle + (UNITS.angleExploded - UNITS.angle) * explode) * Math.PI) / 180;
  const lidHeight = lidHeightFull * Math.sin(angle);
  const deckDepth = lidHeightFull * UNITS.deckRatio;
  // The deck drops away from the hinge first, then the internal plates below it.
  const lidGap = UNITS.gap * 1.5;
  const deckY = deckDepth / 2 + lidGap * explode;

  const boardY = deckY + (deckDepth / 2 + BOARD_DEPTH / 2 + UNITS.gap) * explode;
  const batteryY = boardY + (BOARD_DEPTH / 2 + BATTERY_DEPTH / 2 + UNITS.gap) * explode;
  const bottomY = batteryY + (BATTERY_DEPTH / 2 + deckDepth / 2 + UNITS.gap) * explode;

  const lidTop = -lidHeight;

  const left = -halfW - 20;
  const right = halfW + 20;
  const top = lidTop - 10;
  const bottom = bottomY + deckDepth / 2 + UNITS.thickness + 16;

  return {
    halfW,
    lidHeight,
    lidTop,
    deckDepth,
    deckY,
    boardY,
    batteryY,
    bottomY,
    bounds: { top, bottom, left, right },
  };
}

interface Frame {
  width: number;
  height: number;
  /** Design → stage scale for this layout. */
  fit: number;
  offsetY: number;
  offsetX: number;
}

function frameFor(width: number, height: number, l: Layout, explode: number): Frame {
  const artW = l.bounds.right - l.bounds.left;
  const artH = l.bounds.bottom - l.bounds.top;
  // Assembled fills the stage; by the time the machine is apart the camera has
  // pulled back far enough to keep every layer in frame.
  const heightFactor = 0.94 - 0.07 * clamp01(explode);
  const fit = Math.min((width * 0.94) / artW, (height * heightFactor) / artH);
  const centreX = (l.bounds.left + l.bounds.right) / 2;
  const centreY = (l.bounds.top + l.bounds.bottom) / 2;
  // Sit a little above centre so the chapter copy has room along the bottom.
  return { width, height, fit, offsetX: width / 2 - centreX * fit, offsetY: height * 0.47 - centreY * fit };
}

/** Stage-space geometry of the assembled machine, for positioning the copy. */
export interface AssemblyMetrics {
  lidW: number;
  lidH: number;
  deckDepth: number;
  screenTop: number;
  hingeY: number;
  /** Half the width of the whole drawing, at the same explode value. */
  halfWidth: number;
}

export function assemblyMetrics(width: number, height: number, explode = 0): AssemblyMetrics {
  const l = layout(clamp01(explode));
  const f = frameFor(width, height, l, explode);
  return {
    lidW: UNITS.lidW * f.fit,
    lidH: l.lidHeight * f.fit,
    deckDepth: l.deckDepth * f.fit,
    screenTop: f.offsetY + l.lidTop * f.fit,
    hingeY: f.offsetY,
    halfWidth: ((l.bounds.right - l.bounds.left) / 2) * f.fit,
  };
}

/* ── scroll mapping ─────────────────────────────────────────────────────── */

/**
 * Scroll progress → explode. The machine holds together while the first line is
 * read, opens through the middle of the section, hangs open for the second
 * beat, then closes again before the closing call to action.
 */
export function explodeAt(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.08) return 0;
  if (p < 0.46) return smoothstep((p - 0.08) / 0.38);
  if (p < 0.62) return 1;
  if (p < 0.94) return 1 - smoothstep((p - 0.62) / 0.32);
  return 0;
}

export interface AssemblyFrame {
  width: number;
  height: number;
  dpr: number;
  /** 0 assembled → 1 fully separated. */
  explode: number;
  /** Hero copy strength, used to light the display. */
  copy: number;
  /** Seconds, for ambient drift. */
  time: number;
  /** Pointer parallax, −1…1. */
  px: number;
  py: number;
  /** Skip the ambient layers (reduced motion). */
  still?: boolean;
}

export function drawAssemblyScene(ctx: CanvasRenderingContext2D, frame: AssemblyFrame): void {
  const { width, height, dpr, time, px, py } = frame;
  const explode = clamp01(frame.explode);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  const l = layout(explode);
  const f = frameFor(width, height, l, explode);

  ctx.save();
  ctx.translate(f.offsetX + px * 8, f.offsetY + py * 5);
  ctx.scale(f.fit, f.fit);

  drawHalo(ctx, l, explode);
  drawFloorShadow(ctx, l, explode);

  // Base layers, bottom-up: the deck is drawn last so it covers the plates
  // while the machine is still assembled.
  drawBottomCover(ctx, l, explode);
  drawCastShadow(ctx, { y: l.batteryY, depth: BATTERY_DEPTH, halfW: l.halfW * 0.96 }, explode);
  drawBattery(ctx, l);
  drawCastShadow(ctx, { y: l.boardY, depth: BOARD_DEPTH, halfW: l.halfW * 0.94 }, explode);
  drawBoard(ctx, l);
  drawCastShadow(ctx, { y: l.deckY, depth: l.deckDepth, halfW: l.halfW }, explode);
  if (explode > 0.02) drawCables(ctx, l, explode);
  drawDeck(ctx, l);
  drawLid(ctx, l);
  drawGlass(ctx, l, frame, explode);
  if (!frame.still) drawDust(ctx, width / f.fit, height / f.fit, time, explode);

  ctx.restore();
}

/* ── scene chrome ───────────────────────────────────────────────────────── */

type Point = [number, number];

function drawHalo(ctx: CanvasRenderingContext2D, l: Layout, explode: number) {
  const centreY = l.deckY - l.lidHeight * 0.22;
  const radius = l.halfW * 1.35;
  const halo = ctx.createRadialGradient(0, centreY, 0, 0, centreY, radius);
  halo.addColorStop(0, `rgba(84, 208, 228, ${0.09 + explode * 0.05})`);
  halo.addColorStop(0.55, 'rgba(44, 124, 156, 0.045)');
  halo.addColorStop(1, 'rgba(20, 44, 62, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, centreY, radius, radius * 0.94, 0, 0, TAU);
  ctx.fill();
}

function drawFloorShadow(ctx: CanvasRenderingContext2D, l: Layout, explode: number) {
  const y = l.bottomY + l.deckDepth * 0.5 + UNITS.thickness;
  const rx = l.halfW * (0.62 + explode * 0.06);
  const ry = l.deckDepth * (0.17 + explode * 0.05);
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, ry / rx);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${0.44 - explode * 0.18})`);
  shadow.addColorStop(0.5, 'rgba(0, 0, 0, 0.18)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ── plate primitives ───────────────────────────────────────────────────── */

interface Plate {
  y: number;
  depth: number;
  halfW: number;
  /** How much narrower the back edge is, as a fraction. */
  taper?: number;
}

const back = (p: Plate) => p.halfW * (1 - (p.taper ?? 0.06));

function platePath(ctx: CanvasRenderingContext2D, p: Plate, radius?: number) {
  const top = p.y - p.depth / 2;
  const bottom = p.y + p.depth / 2;
  roundedPolygon(
    ctx,
    [
      [-back(p), top],
      [back(p), top],
      [p.halfW, bottom],
      [-p.halfW, bottom],
    ],
    radius ?? p.depth * 0.12,
  );
}

/** Drawing coordinates for a point on a plate: u −1…1 across, v 0…1 front. */
function onPlate(p: Plate, u: number, v: number): Point {
  const half = lerp(back(p), p.halfW, v);
  return [u * half, p.y - p.depth / 2 + v * p.depth];
}

/** A rounded rectangle lying on the plate, in perspective. */
function plateRect(
  ctx: CanvasRenderingContext2D,
  p: Plate,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  radius: number,
) {
  const a = onPlate(p, u0, v0);
  const b = onPlate(p, u1, v0);
  const c = onPlate(p, u1, v1);
  const d = onPlate(p, u0, v1);
  roundedPolygon(ctx, [a, b, c, d], radius);
}

/** Top face plus the thickness below the front edge. */
function drawPlateBase(
  ctx: CanvasRenderingContext2D,
  p: Plate,
  top: CanvasGradient | string,
  side: CanvasGradient | string,
  edge = 'rgba(74, 85, 94, 0.4)',
) {
  const bottom = p.y + p.depth / 2;
  const thickness = UNITS.thickness;
  ctx.fillStyle = side;
  roundedPolygon(
    ctx,
    [
      [-p.halfW, bottom],
      [p.halfW, bottom],
      [p.halfW * 0.985, bottom + thickness],
      [-p.halfW * 0.985, bottom + thickness],
    ],
    thickness * 0.5,
  );
  ctx.fill();

  platePath(ctx, p);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function silverGradient(ctx: CanvasRenderingContext2D, p: Plate) {
  const gradient = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  gradient.addColorStop(0, SILVER.base);
  gradient.addColorStop(0.16, SILVER.light);
  gradient.addColorStop(0.5, SILVER.highlight);
  gradient.addColorStop(0.82, SILVER.light);
  gradient.addColorStop(1, SILVER.base);
  return gradient;
}

function silverSide(ctx: CanvasRenderingContext2D, p: Plate) {
  const bottom = p.y + p.depth / 2;
  const gradient = ctx.createLinearGradient(0, bottom, 0, bottom + UNITS.thickness);
  gradient.addColorStop(0, SILVER.light);
  gradient.addColorStop(0.4, SILVER.mid);
  gradient.addColorStop(1, SILVER.edge);
  return gradient;
}

function darkGradient(ctx: CanvasRenderingContext2D, p: Plate, topColor: string, lowColor: string) {
  const gradient = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  gradient.addColorStop(0, lowColor);
  gradient.addColorStop(0.45, topColor);
  gradient.addColorStop(1, lowColor);
  return gradient;
}

/** Soft shadow one plate drops on the plate beneath it, once they separate. */
function drawCastShadow(ctx: CanvasRenderingContext2D, p: Plate, explode: number) {
  if (explode < 0.03) return;
  const rx = p.halfW * 1.03;
  ctx.save();
  ctx.translate(0, p.y + p.depth / 2);
  ctx.scale(1, 0.26);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${(0.4 * explode).toFixed(3)})`);
  shadow.addColorStop(0.55, `rgba(0, 0, 0, ${(0.16 * explode).toFixed(3)})`);
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ── base layers ────────────────────────────────────────────────────────── */

function drawBottomCover(ctx: CanvasRenderingContext2D, l: Layout, explode: number) {
  const p: Plate = { y: l.bottomY, depth: l.deckDepth, halfW: l.halfW };
  drawPlateBase(ctx, p, silverGradient(ctx, p), silverSide(ctx, p));

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Vent fields either side of the middle.
  ctx.fillStyle = 'rgba(96, 108, 118, 0.42)';
  for (const side of [-1, 1]) {
    for (let row = 0; row < 7; row += 1) {
      const v = 0.2 + row * 0.075;
      plateRect(ctx, p, side * 0.62 - 0.16, v, side * 0.62 + 0.16, v + 0.028, 2);
      ctx.fill();
    }
  }

  // Rubber feet.
  ctx.fillStyle = 'rgba(28, 33, 38, 0.55)';
  for (const [u, v] of [[-0.86, 0.14], [0.86, 0.14], [-0.9, 0.86], [0.9, 0.86]] as const) {
    const [x, y] = onPlate(p, u, v);
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 5, 0, 0, TAU);
    ctx.fill();
  }

  // Screws, four corners.
  for (const [u, v] of [[-0.9, 0.06], [0.9, 0.06], [-0.92, 0.94], [0.92, 0.94]] as const) {
    drawScrew(ctx, ...onPlate(p, u, v), 5.5);
  }

  // A hair of light across the metal.
  const sheen = ctx.createLinearGradient(-p.halfW, p.y, p.halfW * 0.4, p.y + p.depth);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-p.halfW, p.y - p.depth, p.halfW * 2, p.depth * 2);
  ctx.restore();

  if (explode > 0.02) {
    ctx.strokeStyle = `rgba(108, 222, 232, ${0.1 * explode})`;
    ctx.lineWidth = 1;
    platePath(ctx, p);
    ctx.stroke();
  }
}

function drawBattery(ctx: CanvasRenderingContext2D, l: Layout) {
  const p: Plate = { y: l.batteryY, depth: BATTERY_DEPTH, halfW: l.halfW * 0.96 };
  drawPlateBase(
    ctx,
    p,
    darkGradient(ctx, p, '#1b2228', '#10161a'),
    darkGradient(ctx, p, '#2a343c', '#151c21'),
    'rgba(108, 222, 232, 0.18)',
  );

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Three cells in a wrap.
  for (let index = 0; index < 3; index += 1) {
    const u0 = -0.88 + index * 0.6;
    plateRect(ctx, p, u0, 0.14, u0 + 0.54, 0.86, 10);
    const cell = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
    cell.addColorStop(0, '#2c363e');
    cell.addColorStop(0.5, '#202830');
    cell.addColorStop(1, '#161d22');
    ctx.fillStyle = cell;
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 160, 172, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cell tab.
    ctx.fillStyle = 'rgba(150, 168, 178, 0.3)';
    plateRect(ctx, p, u0 + 0.18, 0.2, u0 + 0.36, 0.24, 2);
    ctx.fill();
  }

  // Flex cable leaving the pack.
  ctx.strokeStyle = 'rgba(150, 168, 178, 0.35)';
  ctx.lineWidth = 4;
  const [cx, cy] = onPlate(p, 0.5, 0.12);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx + 30, cy - 14, cx + 70, cy - 26);
  ctx.stroke();
  ctx.restore();
}

function drawBoard(ctx: CanvasRenderingContext2D, l: Layout) {
  const p: Plate = { y: l.boardY, depth: BOARD_DEPTH, halfW: l.halfW * 0.94 };
  drawPlateBase(
    ctx,
    p,
    darkGradient(ctx, p, '#13211f', '#0b1413'),
    darkGradient(ctx, p, '#21322f', '#101b19'),
    'rgba(108, 222, 232, 0.22)',
  );

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Copper traces fanning out of the processor.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.16)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 16; index += 1) {
    const v = 0.12 + (index / 15) * 0.76;
    const [x1, y1] = onPlate(p, -0.18, v);
    const [x2, y2] = onPlate(p, index % 2 === 0 ? -0.92 : 0.92, v);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Processor package.
  const [socX, socY] = onPlate(p, -0.28, 0.42);
  const socW = 104;
  const socH = 54;
  ctx.fillStyle = '#0a1012';
  roundRectPath(ctx, socX - socW / 2, socY - socH / 2, socW, socH, 6);
  ctx.fill();
  const die = ctx.createLinearGradient(socX, socY - socH / 2, socX, socY + socH / 2);
  die.addColorStop(0, '#3a4750');
  die.addColorStop(1, '#1c262c');
  ctx.fillStyle = die;
  roundRectPath(ctx, socX - socW * 0.34, socY - socH * 0.32, socW * 0.68, socH * 0.64, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Memory packages.
  for (const u of [0.12, 0.42]) {
    const [x, y] = onPlate(p, u, 0.3);
    ctx.fillStyle = '#121b1e';
    roundRectPath(ctx, x - 26, y - 15, 52, 30, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 160, 172, 0.2)';
    ctx.stroke();
  }

  // Small parts scattered like a real board.
  for (let index = 0; index < 12; index += 1) {
    const u = -0.8 + hash(index * 3.7) * 1.6;
    const v = 0.1 + hash(index * 7.1) * 0.8;
    const [x, y] = onPlate(p, u, v);
    ctx.fillStyle = 'rgba(160, 176, 186, 0.22)';
    roundRectPath(ctx, x - 5, y - 2.4, 10, 4.8, 1);
    ctx.fill();
  }

  // Fan, with a cool rim.
  const [fanX, fanY] = onPlate(p, 0.62, 0.62);
  const fanR = 46;
  ctx.fillStyle = '#0c1417';
  ctx.beginPath();
  ctx.arc(fanX, fanY, fanR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let blade = 0; blade < 9; blade += 1) {
    const angle = (blade / 9) * TAU;
    ctx.strokeStyle = 'rgba(150, 172, 182, 0.28)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(fanX + Math.cos(angle) * 9, fanY + Math.sin(angle) * 9);
    ctx.lineTo(fanX + Math.cos(angle + 0.5) * (fanR - 6), fanY + Math.sin(angle + 0.5) * (fanR - 6));
    ctx.stroke();
  }
  ctx.fillStyle = '#1a242a';
  ctx.beginPath();
  ctx.arc(fanX, fanY, 9, 0, TAU);
  ctx.fill();

  // Mounting holes.
  for (const [u, v] of [[-0.9, 0.08], [0.92, 0.08], [-0.92, 0.92], [0.92, 0.92]] as const) {
    const [x, y] = onPlate(p, u, v);
    ctx.strokeStyle = 'rgba(150, 168, 178, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ribbon cables bridging the separated layers. */
function drawCables(ctx: CanvasRenderingContext2D, l: Layout, explode: number) {
  ctx.save();
  ctx.globalAlpha = smoothstep(explode * 1.2);
  ctx.strokeStyle = 'rgba(24, 31, 36, 0.85)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';

  const deckBottom = l.deckY + l.deckDepth / 2;
  const boardTop = l.boardY - BOARD_DEPTH / 2;
  const boardBottom = l.boardY + BOARD_DEPTH / 2;
  const batteryTop = l.batteryY - BATTERY_DEPTH / 2;

  ctx.beginPath();
  ctx.moveTo(-l.halfW * 0.34, deckBottom);
  ctx.bezierCurveTo(-l.halfW * 0.3, deckBottom + 26, -l.halfW * 0.2, boardTop - 26, -l.halfW * 0.16, boardTop);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(l.halfW * 0.42, boardBottom);
  ctx.bezierCurveTo(l.halfW * 0.4, boardBottom + 22, l.halfW * 0.3, batteryTop - 22, l.halfW * 0.26, batteryTop);
  ctx.stroke();
  ctx.restore();
}

/* ── deck ───────────────────────────────────────────────────────────────── */

const LEGEND_ROWS: string[][] = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ''],
  ['', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '', ''],
  ['', '', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '', ''],
];

const BOTTOM_ROW: Array<{ label?: string; share: number; space?: boolean }> = [
  { label: 'fn', share: 0.07 },
  { label: 'ctrl', share: 0.09 },
  { label: 'alt', share: 0.075 },
  { label: 'cmd', share: 0.115 },
  { share: 0.32, space: true },
  { label: 'cmd', share: 0.115 },
  { label: 'alt', share: 0.075 },
  { label: '←', share: 0.07 },
  { label: '→', share: 0.07 },
];

function drawDeck(ctx: CanvasRenderingContext2D, l: Layout) {
  const p: Plate = { y: l.deckY, depth: l.deckDepth, halfW: l.halfW };
  drawPlateBase(ctx, p, silverGradient(ctx, p), silverSide(ctx, p));

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Recessed keyboard well.
  plateRect(ctx, p, -0.9, 0.06, 0.9, 0.66, 10);
  const well = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth * 0.2);
  well.addColorStop(0, '#727d87');
  well.addColorStop(0.25, '#8894a0');
  well.addColorStop(1, '#9aa5ae');
  ctx.fillStyle = well;
  ctx.fill();

  // Keycaps.
  const rows = 5;
  const rowFrom = 0.11;
  const rowTo = 0.6;
  const rowH = (rowTo - rowFrom) / rows;
  for (let row = 0; row < rows; row += 1) {
    const v0 = rowFrom + row * rowH;
    const v1 = v0 + rowH * 0.66;
    const keyGradient = ctx.createLinearGradient(0, p.y, 0, p.y + p.depth);
    keyGradient.addColorStop(0, '#d3dbe1');
    keyGradient.addColorStop(1, '#adb9c2');

    if (row < 4) {
      const columns = 14;
      const cell = 1.72 / columns;
      for (let column = 0; column < columns; column += 1) {
        const u0 = -0.86 + column * cell;
        plateRect(ctx, p, u0, v0, u0 + cell * 0.9, v1, 1.6);
        ctx.fillStyle = keyGradient;
        ctx.fill();

        const legend = LEGEND_ROWS[row]?.[column];
        if (legend) {
          const [x, y] = onPlate(p, u0 + cell * 0.45, (v0 + v1) / 2);
          const size = rowH * p.depth * 0.5;
          if (size > 6) {
            ctx.fillStyle = 'rgba(44, 54, 62, 0.8)';
            ctx.font = `600 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(legend, x, y);
          }
        }
      }
    } else {
      let cursor = -0.86;
      for (const key of BOTTOM_ROW) {
        const width = key.share * 1.72;
        const u0 = cursor;
        const u1 = cursor + width * 0.93;
        plateRect(ctx, p, u0, v0, u1, v1, 1.6);
        ctx.fillStyle = keyGradient;
        ctx.fill();

        const centreU = (u0 + u1) / 2;
        const [x, y] = onPlate(p, centreU, (v0 + v1) / 2);
        const size = rowH * p.depth * 0.46;
        if (key.space) {
          if (size > 5) {
            ctx.fillStyle = 'rgba(44, 54, 62, 0.55)';
            ctx.font = `650 ${(size * 0.82).toFixed(1)}px Manrope, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('DEVZARD', x, y);
          }
        } else if (key.label && size > 6) {
          ctx.fillStyle = 'rgba(44, 54, 62, 0.8)';
          ctx.font = `600 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(key.label, x, y);
        }
        cursor += width;
      }
    }
  }

  // Trackpad.
  plateRect(ctx, p, -0.34, 0.72, 0.34, 0.92, 6);
  const pad = ctx.createLinearGradient(0, p.y + p.depth * 0.1, 0, p.y + p.depth * 0.5);
  pad.addColorStop(0, 'rgba(214, 222, 228, 0.92)');
  pad.addColorStop(1, 'rgba(186, 196, 204, 0.9)');
  ctx.fillStyle = pad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(92, 104, 114, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/* ── lid + display ──────────────────────────────────────────────────────── */

function lidQuad(l: Layout, inset = 0) {
  const half = l.halfW - inset;
  const topHalf = l.halfW * 0.985 - inset * 0.92;
  return {
    outer: [
      [-l.halfW, 0],
      [l.halfW, 0],
      [topHalf, l.lidTop],
      [-topHalf, l.lidTop],
    ] as Point[],
    screen: [
      [-half, -inset * 2.1],
      [half, -inset * 2.1],
      [topHalf, l.lidTop + inset * 1.5],
      [-topHalf, l.lidTop + inset * 1.5],
    ] as Point[],
  };
}

function drawLid(ctx: CanvasRenderingContext2D, l: Layout) {
  const bezel = l.halfW * 0.048;
  const { outer, screen } = lidQuad(l, bezel);

  roundedPolygon(ctx, outer, l.halfW * 0.055);
  const metal = ctx.createLinearGradient(-l.halfW, 0, l.halfW, l.lidTop);
  metal.addColorStop(0, SILVER.low);
  metal.addColorStop(0.22, SILVER.highlight);
  metal.addColorStop(0.55, SILVER.light);
  metal.addColorStop(0.82, SILVER.base);
  metal.addColorStop(1, SILVER.mid);
  ctx.fillStyle = metal;
  ctx.fill();

  // The glass sits in this opening; what shows around it is the bezel.
  roundedPolygon(ctx, screen, l.halfW * 0.03);
  const recess = ctx.createLinearGradient(0, l.lidTop, 0, 0);
  recess.addColorStop(0, '#0a1013');
  recess.addColorStop(1, '#05090c');
  ctx.fillStyle = recess;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  roundedPolygon(ctx, outer, l.halfW * 0.055);
  ctx.stroke();

  // Chin wordmark.
  const chinY = -bezel * 0.95;
  const size = Math.max(6, l.halfW * 0.028);
  ctx.fillStyle = 'rgba(198, 210, 220, 0.5)';
  ctx.font = `600 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D E V Z A R D', 0, chinY);
}

function drawGlass(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  frame: AssemblyFrame,
  explode: number,
) {
  const bezel = l.halfW * 0.048;
  const { screen } = lidQuad(l, bezel);

  ctx.save();

  // Soft glow so the panel reads as lit even against the dark stage.
  const glow = ctx.createRadialGradient(0, l.lidTop * 0.5, 0, 0, l.lidTop * 0.5, l.halfW * 0.9);
  glow.addColorStop(0, `rgba(64, 196, 220, ${0.13 + explode * 0.05})`);
  glow.addColorStop(1, 'rgba(20, 60, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, l.lidTop * 0.5, l.halfW * 0.92, l.lidHeight * 0.55, 0, 0, TAU);
  ctx.fill();

  // Panel body.
  roundedPolygon(ctx, screen, l.halfW * 0.03);
  const glass = ctx.createLinearGradient(0, l.lidTop, 0, 0);
  glass.addColorStop(0, '#0b1418');
  glass.addColorStop(0.5, '#081014');
  glass.addColorStop(1, '#0c1720');
  ctx.fillStyle = glass;
  ctx.fill();

  ctx.save();
  roundedPolygon(ctx, screen, l.halfW * 0.03);
  ctx.clip();

  const top = l.lidTop;
  const width = l.halfW * 2;
  const height = -l.lidTop;

  // Wallpaper blooms.
  const bloom = ctx.createRadialGradient(
    -width * 0.18,
    top + height * 0.32,
    0,
    -width * 0.18,
    top + height * 0.32,
    width * 0.6,
  );
  bloom.addColorStop(0, 'rgba(44, 190, 216, 0.2)');
  bloom.addColorStop(0.6, 'rgba(26, 104, 136, 0.07)');
  bloom.addColorStop(1, 'rgba(10, 36, 54, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(-l.halfW, top, width, height);

  const bloomB = ctx.createRadialGradient(
    width * 0.3,
    top + height * 0.78,
    0,
    width * 0.3,
    top + height * 0.78,
    width * 0.5,
  );
  bloomB.addColorStop(0, 'rgba(60, 96, 214, 0.18)');
  bloomB.addColorStop(1, 'rgba(10, 16, 40, 0)');
  ctx.fillStyle = bloomB;
  ctx.fillRect(-l.halfW, top, width, height);

  // Grid.
  ctx.strokeStyle = 'rgba(120, 226, 240, 0.055)';
  ctx.lineWidth = 1;
  const step = l.halfW / 8;
  for (let x = -l.halfW; x <= l.halfW; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  for (let y = top; y <= 0; y += step) {
    ctx.beginPath();
    ctx.moveTo(-l.halfW, y);
    ctx.lineTo(l.halfW, y);
    ctx.stroke();
  }

  // Reflection.
  const sheen = ctx.createLinearGradient(-l.halfW, top, l.halfW, 0);
  sheen.addColorStop(0, 'rgba(226, 245, 250, 0.07)');
  sheen.addColorStop(0.36, 'rgba(226, 245, 250, 0.02)');
  sheen.addColorStop(0.6, 'rgba(226, 245, 250, 0)');
  sheen.addColorStop(1, 'rgba(108, 222, 232, 0.04)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-l.halfW, top, width, height);

  const vignette = ctx.createRadialGradient(0, top * 0.5, height * 0.2, 0, top * 0.5, height * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 6, 9, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(-l.halfW, top, width, height);
  ctx.restore();

  // Bright frame of the panel, and its camera notch shadow.
  ctx.strokeStyle = `rgba(150, 236, 246, ${0.3 + frame.copy * 0.2})`;
  ctx.lineWidth = 1.4;
  roundedPolygon(ctx, screen, l.halfW * 0.03);
  ctx.stroke();

  ctx.restore();
}

function drawScrew(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(150, 162, 172, 0.55)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 48, 55, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y);
  ctx.lineTo(x + r * 0.6, y);
  ctx.stroke();
}

/* ── dust ───────────────────────────────────────────────────────────────── */

const DUST = Array.from({ length: 22 }, (_, index) => ({
  x: hash(index * 1.7) * 2 - 1,
  y: hash(index * 3.1 + 5),
  r: 1.4 + hash(index * 5.3) * 2.4,
  speed: 0.01 + hash(index * 7.7) * 0.016,
  phase: hash(index * 11.3) * TAU,
}));

function drawDust(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  explode: number,
) {
  ctx.save();
  for (const mote of DUST) {
    const x = mote.x * width * 0.46;
    const y = -height * 0.42 + (((mote.y + time * mote.speed) % 1) + 1) % 1 * height * 0.84;
    const twinkle = 0.5 + 0.5 * Math.sin(time * 1.3 + mote.phase);
    ctx.globalAlpha = (0.05 + twinkle * 0.12) * (0.5 + explode * 0.5);
    ctx.fillStyle = '#a8eef7';
    ctx.beginPath();
    ctx.arc(x, y, mote.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ── geometry helpers ───────────────────────────────────────────────────── */

function roundedPolygon(ctx: CanvasRenderingContext2D, points: Point[], radius: number) {
  const count = points.length;
  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const current = points[index];
    const previous = points[(index - 1 + count) % count];
    const next = points[(index + 1) % count];
    const toPrevious = normalize(previous[0] - current[0], previous[1] - current[1]);
    const toNext = normalize(next[0] - current[0], next[1] - current[1]);
    const r = Math.min(radius, distance(current, previous) / 2, distance(current, next) / 2);
    const start: Point = [current[0] + toPrevious[0] * r, current[1] + toPrevious[1] * r];
    const end: Point = [current[0] + toNext[0] * r, current[1] + toNext[1] * r];
    if (index === 0) ctx.moveTo(start[0], start[1]);
    else ctx.lineTo(start[0], start[1]);
    ctx.quadraticCurveTo(current[0], current[1], end[0], end[1]);
  }
  ctx.closePath();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
