/**
 * Hero laptop scene.
 *
 * A closed laptop on arrival; as the hero track scrolls the lid swings open,
 * the screen lights up and the hero copy is handed out of it, then the lid
 * closes again and the page continues into the story section.
 *
 * Everything is vector art drawn to a 2D canvas. The lid is a quad projected
 * from a simple 3D model: the free edge of the lid sits at
 *
 *   y = hingeY + depth · cos θ − lidHeight · sin θ
 *
 * which reproduces the real clamshell motion (flat on the deck at θ = 0,
 * standing at θ = 90°) without a 3D engine.
 */

const ACCENT = '#6cdee8';

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** Lid aspect (width ÷ height) — a 16:10 laptop. */
const LID_RATIO = 1.62;
/** Deck depth as a fraction of the lid height, once projected. */
const DECK_DEPTH = 0.42;
/** How far the lid opens: a hair past vertical, like a real hinge stop. */
const MAX_ANGLE = (100 * Math.PI) / 180;

export type HeroLayoutMode = 'overlay' | 'stacked';

export interface LaptopMetrics {
  mode: HeroLayoutMode;
  /** Lid width and height in CSS pixels. */
  lidW: number;
  lidH: number;
  /** Projected depth of the keyboard deck. */
  deckDepth: number;
  /** Top edge of the screen when fully open. */
  screenTop: number;
  /** Where the lid meets the deck (the hinge), when fully open. */
  hingeY: number;
}

/**
 * Geometry for one stage size. Both the canvas and the CSS that places the
 * hero copy over the screen read from this, so they cannot drift apart.
 *
 * `overlay` is used when the screen is large enough to hold the copy; on
 * narrow stages the laptop sits underneath the copy instead.
 */
export function laptopMetrics(width: number, height: number): LaptopMetrics {
  const overlayLidW = Math.min(width * 0.64, height * 0.52 * LID_RATIO);
  const overlay = overlayLidW >= 520 && height >= 620;

  if (!overlay) {
    // Leave the top of the stage free for the copy: the laptop is sized from
    // whatever height is left after that reserve, never just from the width.
    const reserve = Math.max(148, height * 0.34);
    const fromHeight = ((height - reserve) * 0.6) * LID_RATIO;
    const lidW = Math.max(180, Math.min(width * 0.86, 560, fromHeight));
    const lidH = lidW / LID_RATIO;
    const deckDepth = lidH * DECK_DEPTH;
    const hingeY = height - deckDepth - Math.max(16, height * 0.055);
    return { mode: 'stacked', lidW, lidH, deckDepth, screenTop: hingeY - lidH, hingeY };
  }

  const lidW = overlayLidW;
  const lidH = lidW / LID_RATIO;
  const deckDepth = lidH * DECK_DEPTH;
  const screenTop = Math.max(height * 0.2, (height - lidH - deckDepth) / 2 - height * 0.02);
  return { mode: 'overlay', lidW, lidH, deckDepth, screenTop, hingeY: screenTop + lidH };
}

export interface HeroTimeline {
  /** 0 = lid shut, 1 = fully open. */
  open: number;
  /** Emergence of each hero line, in reading order. */
  lines: [number, number, number, number];
  /** Extra bloom while the copy is being handed out. */
  glow: number;
}

const OPEN_START = 0.06;
const OPEN_END = 0.3;
const CLOSE_START = 0.76;
const CLOSE_END = 0.96;

/**
 * When each hero line arrives and where the whole block leaves. Exported so the
 * component revealing the copy and the canvas lighting the screen share one
 * timeline instead of keeping two copies of it.
 */
export const HERO_COPY = {
  brand: { start: 0.255, end: 0.335 },
  headline: { start: 0.29, end: 0.375 },
  description: { start: 0.325, end: 0.41 },
  actions: { start: 0.36, end: 0.445 },
  exitStart: 0.63,
  exitEnd: 0.72,
} as const;

export function copyStrength(line: keyof Omit<typeof HERO_COPY, 'exitStart' | 'exitEnd'>, progress: number) {
  const { start, end } = HERO_COPY[line];
  const exit = 1 - smoothstep((progress - HERO_COPY.exitStart) / (HERO_COPY.exitEnd - HERO_COPY.exitStart));
  return clamp01((progress - start) / (end - start)) * exit;
}

export function heroTimeline(progress: number): HeroTimeline {
  const p = clamp01(progress);
  const opening = smoothstep((p - OPEN_START) / (OPEN_END - OPEN_START));
  const closing = 1 - smoothstep((p - CLOSE_START) / (CLOSE_END - CLOSE_START));
  const open = Math.min(opening, closing);

  const lines: HeroTimeline['lines'] = [
    copyStrength('brand', p),
    copyStrength('headline', p),
    copyStrength('description', p),
    copyStrength('actions', p),
  ];

  return { open, lines, glow: Math.max(...lines) };
}

export interface LaptopFrame {
  width: number;
  height: number;
  dpr: number;
  progress: number;
}

export function drawLaptopScene(ctx: CanvasRenderingContext2D, frame: LaptopFrame): void {
  const { width, height, dpr, progress } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  const m = laptopMetrics(width, height);
  const { open, glow } = heroTimeline(progress);

  // At rest the closed laptop sits a little higher and larger — it is the whole
  // composition — then settles into place as the lid comes up.
  const scale = 1 + 0.05 * (1 - open);
  const restHinge = (m.mode === 'overlay' ? height * 0.62 : m.hingeY) - m.deckDepth * 0.3;
  const hingeY = lerp(restHinge, m.hingeY, open);
  const lidW = m.lidW * scale;
  const lidH = m.lidH * scale;
  const deckDepth = m.deckDepth * scale;

  const sin = Math.sin(MAX_ANGLE * open);
  const cos = Math.cos(MAX_ANGLE * open);

  // A lid only a few degrees up is seen almost edge-on and still covers its
  // keyboard. Rather than fake that with a collapsing quad, blend between two
  // honest pictures: the closed slab, and the lid standing above the deck.
  const openMix = smoothstep((sin - 0.36) / 0.24);

  const halfW = lidW / 2;
  const narrow = 1 - 0.075 * sin;
  const lidHeight = Math.max(0, lidH * sin);
  const hingeLeft: Point = [-halfW, hingeY];
  const hingeRight: Point = [halfW, hingeY];
  const freeLeft: Point = [-halfW * narrow, hingeY - lidHeight];
  const freeRight: Point = [halfW * narrow, hingeY - lidHeight];

  // Everything below is drawn around x = 0; one translate centres the device.
  ctx.save();
  ctx.translate(width / 2, 0);

  drawFloorShadow(ctx, hingeY, deckDepth, lidW, open);
  drawScreenSpill(ctx, hingeY, lidW, deckDepth, sin, glow);

  if (openMix > 0.01) drawDeck(ctx, hingeY, lidW, deckDepth, sin, glow, openMix);

  if (openMix < 0.99) drawClosedLid(ctx, hingeY, lidW, deckDepth, cos, 1 - openMix);

  if (openMix > 0.01) {
    const lidQuad = [hingeLeft, hingeRight, freeRight, freeLeft];
    drawLidBody(ctx, lidQuad, sin, open, openMix);
    if (sin > 0.2) {
      drawScreen(ctx, lidQuad, lidW, lidH, sin, open, progress, glow, m.mode !== 'overlay', openMix);
    }
    if (glow > 0.02 && m.mode === 'overlay') drawBeam(ctx, lidW, hingeY - lidHeight, lidH, glow);
  }

  drawHinge(ctx, hingeLeft, hingeRight);
  ctx.restore();
}

type Point = [number, number];

/* ── surfaces ───────────────────────────────────────────────────────────── */

function drawFloorShadow(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  deckDepth: number,
  lidW: number,
  open: number,
) {
  const y = hingeY + deckDepth + deckDepth * 0.55;
  const rx = lidW * (0.56 + open * 0.05);
  const ry = deckDepth * (0.9 + open * 0.3);

  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, ry / rx);
  const shadow = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${0.5 - open * 0.12})`);
  shadow.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Light thrown forward from the display onto the deck and the floor. */
function drawScreenSpill(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  deckDepth: number,
  sin: number,
  glow: number,
) {
  const strength = sin * 0.5 + glow * 0.5;
  if (strength <= 0.02) return;
  const radius = lidW * 0.62;
  const spill = ctx.createRadialGradient(0, hingeY + deckDepth * 0.2, 8, 0, hingeY + deckDepth * 0.2, radius);
  spill.addColorStop(0, `rgba(86, 214, 232, ${0.16 * strength})`);
  spill.addColorStop(0.45, `rgba(64, 170, 196, ${0.07 * strength})`);
  spill.addColorStop(1, 'rgba(40, 120, 150, 0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.ellipse(0, hingeY + deckDepth * 0.35, radius, deckDepth * 1.5 + 40, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeck(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  deckDepth: number,
  sin: number,
  glow: number,
  alpha: number,
) {
  const top = hingeY;
  const bottom = hingeY + deckDepth;
  const backHalf = lidW / 2;
  const frontHalf = backHalf * 1.012;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Top face.
  roundedPolygon(ctx, [
    [-backHalf, top],
    [backHalf, top],
    [frontHalf, bottom],
    [-frontHalf, bottom],
  ], deckDepth * 0.28);

  const deck = ctx.createLinearGradient(0, top, 0, bottom);
  deck.addColorStop(0, '#2b333a');
  deck.addColorStop(0.35, '#3c464e');
  deck.addColorStop(0.86, '#4a555e');
  deck.addColorStop(1, '#5b6771');
  ctx.fillStyle = deck;
  ctx.fill();

  // Keyboard well.
  ctx.save();
  ctx.clip();
  const wellTop = top + deckDepth * 0.16;
  const wellBottom = bottom - deckDepth * 0.4;
  const well = ctx.createLinearGradient(0, wellTop, 0, wellBottom);
  well.addColorStop(0, 'rgba(9, 13, 16, 0.85)');
  well.addColorStop(1, 'rgba(16, 22, 27, 0.7)');
  ctx.fillStyle = well;
  roundRectPath(ctx, -backHalf * 0.9, wellTop, backHalf * 1.8, wellBottom - wellTop, deckDepth * 0.12);
  ctx.fill();

  // Keys, drawn in deck space so they splay with the perspective.
  const rows = 5;
  const columns = 14;
  const keyTop = wellTop + deckDepth * 0.06;
  const keyArea = wellBottom - keyTop - deckDepth * 0.03;
  const rowH = keyArea / rows;
  for (let row = 0; row < rows; row += 1) {
    const v = (keyTop - top) / deckDepth + ((row + 0.5) * rowH) / deckDepth;
    const spread = backHalf * (1 + v * 0.06);
    const width = spread * 1.78;
    const left = -width / 2;
    const y = top + v * deckDepth;
    const cellW = width / columns;
    const inset = cellW * 0.1;
    // The bottom row leaves the middle free for the space bar.
    const isSpaceRow = row === rows - 1;
    for (let column = 0; column < columns; column += 1) {
      if (isSpaceRow && column > 3 && column < 10) continue;
      const x = left + column * cellW;
      const keyWidth = isSpaceRow && (column === 3 || column === 10) ? cellW * 2.1 : cellW;
      const keyX = isSpaceRow && column === 10 ? x - cellW * 0.1 : x;
      const key = ctx.createLinearGradient(0, y, 0, y + rowH);
      key.addColorStop(0, `rgba(${40 + row * 2}, ${48 + row * 2}, ${56 + row * 2}, 0.97)`);
      key.addColorStop(1, `rgba(${22 + row}, ${28 + row}, ${34 + row}, 0.97)`);
      ctx.fillStyle = key;
      roundRectPath(ctx, keyX + inset, y + rowH * 0.22, keyWidth - inset * 2, rowH * 0.54, Math.min(3.5, rowH * 0.18));
      ctx.fill();
    }
    if (isSpaceRow) {
      const spaceLeft = left + cellW * 4;
      const spaceWidth = cellW * 6;
      const key = ctx.createLinearGradient(0, y, 0, y + rowH);
      key.addColorStop(0, 'rgba(52, 61, 70, 0.97)');
      key.addColorStop(1, 'rgba(28, 35, 41, 0.97)');
      ctx.fillStyle = key;
      roundRectPath(ctx, spaceLeft + inset, y + rowH * 0.22, spaceWidth - inset * 2, rowH * 0.54, Math.min(3.5, rowH * 0.18));
      ctx.fill();
    }
  }

  // Trackpad: recessed, with a hairline outline rather than a bright plate.
  const padW = backHalf * 0.42;
  const padTop = wellBottom + deckDepth * 0.03;
  const padH = bottom - padTop - deckDepth * 0.07;
  if (padH > 4) {
    ctx.fillStyle = 'rgba(34, 42, 49, 0.4)';
    roundRectPath(ctx, -padW / 2, padTop, padW, padH, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(156, 172, 184, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Display light falling across the deck.
  if (sin > 0.05 || glow > 0.02) {
    const light = ctx.createLinearGradient(0, top, 0, bottom);
    light.addColorStop(0, `rgba(120, 226, 240, ${(sin * 0.2 + glow * 0.1)})`);
    light.addColorStop(0.5, 'rgba(120, 226, 240, 0)');
    ctx.fillStyle = light;
    roundRectPath(ctx, -backHalf, top, lidW, deckDepth, deckDepth * 0.28);
    ctx.fill();
  }

  // Front edge: the deck's thickness.
  const edge = ctx.createLinearGradient(0, bottom, 0, bottom + deckDepth * 0.22);
  edge.addColorStop(0, '#5a656e');
  edge.addColorStop(1, '#20272d');
  ctx.fillStyle = edge;
  roundRectPath(ctx, -frontHalf, bottom, frontHalf * 2, deckDepth * 0.22, deckDepth * 0.1, false);
  ctx.fill();
  ctx.restore();
}

function drawLidBody(
  ctx: CanvasRenderingContext2D,
  quad: Point[],
  sin: number,
  open: number,
  mix: number,
) {
  const glass = smoothstep((sin - 0.55) / 0.25);

  ctx.save();
  ctx.globalAlpha = mix;
  roundedPolygon(ctx, quad, 10);

  if (glass < 1) {
    // Aluminium back of the lid, visible while it is still lying flat.
    const back = ctx.createLinearGradient(quad[0][0], quad[0][1], quad[2][0], quad[2][1]);
    back.addColorStop(0, `rgba(214, 224, 231, ${1 - glass})`);
    back.addColorStop(0.45, `rgba(178, 192, 203, ${1 - glass})`);
    back.addColorStop(1, `rgba(132, 148, 161, ${1 - glass})`);
    ctx.fillStyle = back;
    ctx.fill();
  }

  if (glass > 0) {
    const glassFill = ctx.createLinearGradient(quad[0][0], quad[0][1], quad[2][0], quad[2][1]);
    glassFill.addColorStop(0, `rgba(14, 20, 25, ${glass})`);
    glassFill.addColorStop(0.6, `rgba(10, 15, 19, ${glass})`);
    glassFill.addColorStop(1, `rgba(18, 27, 33, ${glass})`);
    ctx.fillStyle = glassFill;
    ctx.fill();
  }

  // Rim, brighter while the display is lit.
  ctx.strokeStyle = `rgba(198, 214, 224, ${0.2 + open * 0.14})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/**
 * The lid in its closed pose: a shallow slab lying over the deck, wordmark
 * etched on top and its outer shell showing as a lip along the front edge.
 */
function drawClosedLid(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  deckDepth: number,
  cos: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  const half = lidW / 2;
  const depth = deckDepth * cos;
  const thickness = lidW * 0.03;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer shell below the front edge.
  const lip = ctx.createLinearGradient(0, hingeY + depth, 0, hingeY + depth + thickness);
  lip.addColorStop(0, 'rgba(150, 164, 175, 1)');
  lip.addColorStop(0.5, 'rgba(92, 105, 116, 1)');
  lip.addColorStop(1, 'rgba(26, 33, 39, 1)');
  ctx.fillStyle = lip;
  roundedPolygon(ctx, [
    [-half * 0.996, hingeY + depth],
    [half * 0.996, hingeY + depth],
    [half * 0.985, hingeY + depth + thickness],
    [-half * 0.985, hingeY + depth + thickness],
  ], 4);
  ctx.fill();

  // Lid top face.
  roundedPolygon(ctx, [
    [-half, hingeY],
    [half, hingeY],
    [half * 0.996, hingeY + depth],
    [-half * 0.996, hingeY + depth],
  ], 10);
  const face = ctx.createLinearGradient(-half, hingeY, half, hingeY + depth);
  face.addColorStop(0, 'rgba(226, 235, 241, 1)');
  face.addColorStop(0.34, 'rgba(199, 211, 220, 1)');
  face.addColorStop(0.66, 'rgba(170, 184, 195, 1)');
  face.addColorStop(1, 'rgba(134, 149, 161, 1)');
  ctx.fillStyle = face;
  ctx.fill();

  // A soft highlight sweeping the width of the lid.
  ctx.save();
  ctx.clip();
  const sheen = ctx.createLinearGradient(-half * 0.6, hingeY, half * 0.2, hingeY + depth);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-half, hingeY, lidW, depth);
  ctx.restore();

  ctx.strokeStyle = 'rgba(238, 246, 250, 0.5)';
  ctx.lineWidth = 1.2;
  roundedPolygon(ctx, [
    [-half, hingeY],
    [half, hingeY],
    [half * 0.996, hingeY + depth],
    [-half * 0.996, hingeY + depth],
  ], 10);
  ctx.stroke();

  // Etched wordmark.
  ctx.fillStyle = 'rgba(14, 21, 26, 0.42)';
  ctx.font = `600 ${Math.max(9, lidW * 0.03)}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D E V Z A R D', 0, hingeY + depth * 0.55);
  ctx.restore();
}
function drawScreen(
  ctx: CanvasRenderingContext2D,
  quad: Point[],
  lidW: number,
  lidH: number,
  sin: number,
  open: number,
  progress: number,
  glow: number,
  showMark: boolean,
  mix: number,
) {
  const alpha = smoothstep((sin - 0.5) / 0.25) * mix;
  if (alpha <= 0.01) return;

  const inset = lidW * 0.032;
  const screen: Point[] = insetQuad(quad, inset);

  ctx.save();
  ctx.globalAlpha = alpha;
  roundedPolygon(ctx, screen, 8);
  ctx.clip();

  const top = Math.min(screen[0][1], screen[2][1]);
  const bottom = Math.max(screen[0][1], screen[2][1]);
  const left = Math.min(screen[0][0], screen[1][0]);
  const right = Math.max(screen[0][0], screen[1][0]);

  const glass = ctx.createLinearGradient(0, top, 0, bottom);
  glass.addColorStop(0, '#0d1418');
  glass.addColorStop(0.55, '#0a1014');
  glass.addColorStop(1, '#101a20');
  ctx.fillStyle = glass;
  ctx.fillRect(left, top, right - left, bottom - top);

  // Grid, barely there.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.05)';
  ctx.lineWidth = 1;
  const step = Math.max(28, (right - left) / 14);
  for (let x = left; x < right; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  // A slow band of light travelling down the display.
  const sweep = ((progress * 2.4) % 1) * (bottom - top) * 1.4 + top - (bottom - top) * 0.2;
  const band = ctx.createLinearGradient(0, sweep - lidH * 0.16, 0, sweep + lidH * 0.16);
  band.addColorStop(0, 'rgba(108, 222, 232, 0)');
  band.addColorStop(0.5, `rgba(108, 222, 232, ${0.05 + glow * 0.05})`);
  band.addColorStop(1, 'rgba(108, 222, 232, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(left, top, right - left, bottom - top);

  // Wordmark resting at the bottom of the display. Left out when the hero copy
  // is drawn over the screen, where it would read as a second logo.
  if (showMark) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#e9f4f7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `650 ${Math.max(10, lidW * 0.032)}px Manrope, system-ui, sans-serif`;
    ctx.fillText('Devzard.', 0, bottom - lidH * 0.05);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(
      ctx.measureText('Devzard.').width / 2 + lidW * 0.004,
      bottom - lidH * 0.05 - lidW * 0.008,
      Math.max(1.5, lidW * 0.005),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Glass reflection.
  const sheen = ctx.createLinearGradient(left, top, right, bottom);
  sheen.addColorStop(0, `rgba(226, 245, 250, ${0.07 + glow * 0.05})`);
  sheen.addColorStop(0.35, 'rgba(226, 245, 250, 0.015)');
  sheen.addColorStop(0.62, 'rgba(226, 245, 250, 0)');
  sheen.addColorStop(1, 'rgba(108, 222, 232, 0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.restore();

  // Emissive rim when the display is on.
  ctx.save();
  ctx.globalAlpha = alpha * (0.4 + glow * 0.35);
  ctx.strokeStyle = 'rgba(130, 232, 244, 0.55)';
  ctx.lineWidth = 1.1;
  roundedPolygon(ctx, screen, 8);
  ctx.stroke();
  ctx.restore();
  void open;
}

/**
 * Light lifting out of the display while the copy is handed over. A soft
 * radial bloom rather than a hard-edged cone, so it reads as glow on the page
 * instead of a translucent shape.
 */
function drawBeam(ctx: CanvasRenderingContext2D, lidW: number, topY: number, lidH: number, glow: number) {
  const height = Math.max(0, Math.min(lidH * 0.75, topY - 8));
  if (height <= 0) return;
  const radius = lidW * 0.62;

  ctx.save();
  ctx.translate(0, topY - height * 0.32);
  ctx.scale(1, height / radius);
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  bloom.addColorStop(0, `rgba(108, 222, 232, ${0.1 * glow})`);
  bloom.addColorStop(0.45, `rgba(108, 222, 232, ${0.045 * glow})`);
  bloom.addColorStop(1, 'rgba(108, 222, 232, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHinge(ctx: CanvasRenderingContext2D, left: Point, right: Point) {
  const length = right[0] - left[0];
  const bar = ctx.createLinearGradient(0, left[1] - 3, 0, left[1] + 4);
  bar.addColorStop(0, 'rgba(122, 136, 147, 0.9)');
  bar.addColorStop(1, 'rgba(30, 38, 44, 0.9)');
  ctx.fillStyle = bar;
  roundRectPath(ctx, -length * 0.4, left[1] - 2.5, length * 0.8, 5, 2.5);
  ctx.fill();
}

/** Rounded rectangle via arcTo, so it also runs where `roundRect` is missing. */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  roundTop = true,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  if (roundTop) ctx.arcTo(x + width, y, x + width, y + height, r);
  else ctx.lineTo(x + width, y);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, roundTop ? r : 0);
  ctx.lineTo(x, y);
  ctx.closePath();
}

/* ── geometry helpers ───────────────────────────────────────────────────── */

/** Pull every corner of a polygon toward the centroid. */
function insetQuad(quad: Point[], amount: number): Point[] {
  const cx = quad.reduce((sum, point) => sum + point[0], 0) / quad.length;
  const cy = quad.reduce((sum, point) => sum + point[1], 0) / quad.length;
  return quad.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const length = Math.hypot(dx, dy) || 1;
    const pull = Math.min(amount, length * 0.4);
    return [x - (dx / length) * pull, y - (dy / length) * pull] as Point;
  });
}

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

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
