/**
 * Hero laptop scene.
 *
 * A silver clamshell that opens on its own when the page loads: closed on
 * arrival, the lid lifts, the display lights up and the hero copy is thrown
 * out of it. The animation is time-based (see `HERO_ANIMATION`), runs once, and
 * leaves the laptop standing open — nothing here depends on scrolling.
 *
 * Everything is vector art drawn to a 2D canvas. Open, the lid is a quad
 * projected from a simple 3D model, so the hinge motion is real:
 *
 *   free edge y = hingeY + depth·cos θ − lidHeight·sin θ
 *
 * Closed, it is drawn as a shallow trapezoid on the desk — narrower at the
 * back, with a front lip, hinge barrel and an engraved wordmark — which is
 * what separates "laptop lid" from "appliance panel".
 */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** Aluminium palette, shared by the lid, the deck and the lip. */
const SILVER = {
  highlight: '#f2f6f8',
  light: '#dee5ea',
  base: '#c6cfd6',
  mid: '#aab5bd',
  low: '#87929c',
  edge: '#5d6871',
  seam: '#3d474f',
} as const;

/** Lid aspect (width ÷ height) — a 16:10 laptop. */
export const LID_RATIO = 1.62;
/** Deck depth as a fraction of the lid height, once open. */
const DECK_DEPTH = 0.42;
/** Depth of the lid lying on the deck, as a fraction of the lid height. */
const CLOSED_DEPTH = 0.4;
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
 * hero copy read from this, so they cannot drift apart.
 */
export function laptopMetrics(width: number, height: number): LaptopMetrics {
  const overlayLidW = Math.min(width * 0.64, height * 0.5 * LID_RATIO);
  const overlay = overlayLidW >= 520 && height >= 620;

  if (!overlay) {
    // Leave the top of the stage free for the copy: the laptop is sized from
    // whatever height is left after that reserve, never just from the width.
    const reserve = Math.max(150, height * 0.3);
    const fromHeight = (height - reserve) * 0.78 * LID_RATIO;
    const lidW = Math.max(180, Math.min(width * 0.86, 560, fromHeight));
    const lidH = lidW / LID_RATIO;
    const deckDepth = lidH * DECK_DEPTH;
    const hingeY = height - deckDepth - Math.max(16, height * 0.055);
    return { mode: 'stacked', lidW, lidH, deckDepth, screenTop: hingeY - lidH, hingeY };
  }

  const lidW = overlayLidW;
  const lidH = lidW / LID_RATIO;
  const deckDepth = lidH * DECK_DEPTH;
  const screenTop = Math.max(height * 0.16, (height - lidH - deckDepth) / 2 - height * 0.03);
  return { mode: 'overlay', lidW, lidH, deckDepth, screenTop, hingeY: screenTop + lidH };
}

/* ── timeline ───────────────────────────────────────────────────────────── */

/**
 * The whole intro, in one place: how long it runs and when each beat lands on
 * that clock. The component plays it once; the canvas and the copy read the
 * same numbers through `heroTimeline` / `copyStrength`.
 */
export const HERO_ANIMATION = {
  /** Total run time, milliseconds. */
  durationMs: 4600,
  /** Lid travel. */
  openStart: 0.06,
  openEnd: 0.54,
  /** Copy lines, in reading order, thrown out of the screen. */
  copy: {
    brand: { start: 0.42, end: 0.6 },
    headline: { start: 0.47, end: 0.66 },
    description: { start: 0.53, end: 0.72 },
    actions: { start: 0.59, end: 0.8 },
  },
} as const;

export type HeroLine = keyof typeof HERO_ANIMATION.copy;

export interface HeroTimeline {
  /** 0 = lid shut, 1 = fully open. */
  open: number;
  /** Emergence of each hero line, in reading order. */
  lines: [number, number, number, number];
  /** Extra bloom while the copy is being handed out. */
  glow: number;
}

const LINE_ORDER: HeroLine[] = ['brand', 'headline', 'description', 'actions'];

export function heroTimeline(progress: number): HeroTimeline {
  const p = clamp01(progress);
  const { openStart, openEnd } = HERO_ANIMATION;
  const open = smoothstep((p - openStart) / (openEnd - openStart));
  const lines = LINE_ORDER.map(line => clamp01(copyStrength(line, p))) as HeroTimeline['lines'];
  return { open, lines, glow: Math.max(...lines) };
}

/** Reveal weight for one copy line at a given progress, 0–1. */
export function copyStrength(line: HeroLine, progress: number) {
  const { start, end } = HERO_ANIMATION.copy[line];
  return clamp01((progress - start) / (end - start));
}

export interface LaptopFrame {
  width: number;
  height: number;
  dpr: number;
  /** 0–1 through `HERO_ANIMATION.durationMs`. */
  progress: number;
}

export function drawLaptopScene(ctx: CanvasRenderingContext2D, frame: LaptopFrame): void {
  const { width, height, dpr, progress } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  const m = laptopMetrics(width, height);
  const { open, glow } = heroTimeline(progress);

  // At rest the closed laptop sits a touch higher and larger — it is the whole
  // composition — then settles as the lid comes up.
  const scale = 1 + 0.035 * (1 - open);
  const closedHinge = Math.min(m.hingeY, height * 0.56 - (m.lidH * CLOSED_DEPTH) / 2);
  const hingeY = lerp(closedHinge, m.hingeY, open);
  const lidW = m.lidW * scale;
  const lidH = m.lidH * scale;
  const deckDepth = m.deckDepth * scale;

  const sin = Math.sin(MAX_ANGLE * open);

  // A lid only a few degrees up is seen almost edge-on and still covers its
  // keyboard, so blend between two honest pictures: the closed slab lying on
  // the desk, and the lid standing above the open deck.
  const openMix = smoothstep((sin - 0.34) / 0.26);
  const closedMix = 1 - openMix;

  const narrow = 1 - 0.075 * sin;
  const lidHeight = Math.max(0, lidH * sin);

  // Everything below is drawn around x = 0; one translate centres the device.
  ctx.save();
  ctx.translate(width / 2, 0);

  drawShadow(ctx, hingeY, lidW, lidH, deckDepth, openMix);
  drawScreenSpill(ctx, hingeY, lidW, deckDepth, sin, glow);

  if (openMix > 0.01) drawDeck(ctx, hingeY, lidW, deckDepth, openMix, glow);
  if (closedMix > 0.01) drawClosedLid(ctx, hingeY, lidW, lidH, open, closedMix);
  if (openMix > 0.01) {
    drawStandingLid(ctx, hingeY, lidW, lidHeight, narrow, open, openMix);
    if (sin > 0.25) {
      drawScreen(ctx, hingeY, lidW, lidHeight, narrow, sin, progress, glow, openMix, m.mode !== 'overlay');
    }
    if (glow > 0.02 && m.mode === 'overlay') drawLift(ctx, lidW, hingeY - lidHeight, lidH, glow);
  }

  drawHingeBar(ctx, hingeY, lidW, openMix);
  ctx.restore();
}

type Point = [number, number];

/* ── desk, light, shadow ────────────────────────────────────────────────── */

function drawShadow(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  lidH: number,
  deckDepth: number,
  openMix: number,
) {
  const closedDepth = lidH * CLOSED_DEPTH;
  const centreY = hingeY + lerp(closedDepth * 0.52, deckDepth * 0.62, openMix);
  const rx = lidW * lerp(0.52, 0.58, openMix);
  const ry = lidW * lerp(0.055, 0.1, openMix);

  ctx.save();
  ctx.translate(0, centreY);
  ctx.scale(1, ry / rx);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${lerp(0.58, 0.42, openMix)})`);
  shadow.addColorStop(0.45, 'rgba(0, 0, 0, 0.22)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Light thrown forward from the display onto the deck and the desk. */
function drawScreenSpill(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  deckDepth: number,
  sin: number,
  glow: number,
) {
  const strength = sin * 0.45 + glow * 0.55;
  if (strength <= 0.02) return;
  const radius = lidW * 0.6;
  const spill = ctx.createRadialGradient(0, hingeY + deckDepth * 0.3, 8, 0, hingeY + deckDepth * 0.3, radius);
  spill.addColorStop(0, `rgba(86, 214, 232, ${0.13 * strength})`);
  spill.addColorStop(0.45, `rgba(64, 170, 196, ${0.06 * strength})`);
  spill.addColorStop(1, 'rgba(40, 120, 150, 0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.ellipse(0, hingeY + deckDepth * 0.45, radius, deckDepth * 1.4 + 40, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Soft bloom lifting out of the display while the copy is thrown out. */
function drawLift(ctx: CanvasRenderingContext2D, lidW: number, topY: number, lidH: number, glow: number) {
  const height = Math.max(0, Math.min(lidH * 0.7, topY - 8));
  if (height <= 0) return;
  const radius = lidW * 0.6;
  ctx.save();
  ctx.translate(0, topY - height * 0.3);
  ctx.scale(1, height / radius);
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  bloom.addColorStop(0, `rgba(108, 222, 232, ${0.09 * glow})`);
  bloom.addColorStop(0.45, `rgba(108, 222, 232, ${0.04 * glow})`);
  bloom.addColorStop(1, 'rgba(108, 222, 232, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ── closed lid ─────────────────────────────────────────────────────────── */

/**
 * The laptop shut on the desk: a shallow trapezoid (wider at the front, so it
 * reads in perspective), a brushed aluminium face, a lip of visible thickness
 * at the front, a hinge barrel at the back and the wordmark etched on the lid.
 */
function drawClosedLid(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  lidH: number,
  open: number,
  alpha: number,
) {
  // The lid foreshortens towards the hinge as it lifts, so the closed pose
  // dissolves into the standing one instead of sliding away.
  const depth = lidH * CLOSED_DEPTH * (1 - 0.88 * smoothstep(open));
  const halfFront = lidW / 2;
  const halfBack = halfFront * 0.925;
  const backY = hingeY;
  const frontY = hingeY + depth;
  const thickness = lidW * 0.032;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Body thickness below the front edge.
  const lip = ctx.createLinearGradient(0, frontY, 0, frontY + thickness);
  lip.addColorStop(0, SILVER.mid);
  lip.addColorStop(0.35, SILVER.low);
  lip.addColorStop(1, SILVER.edge);
  ctx.fillStyle = lip;
  roundedPolygon(ctx, [
    [-halfFront, frontY],
    [halfFront, frontY],
    [halfFront * 0.986, frontY + thickness],
    [-halfFront * 0.986, frontY + thickness],
  ], 5);
  ctx.fill();

  // Lid face, in perspective.
  const face: Point[] = [
    [-halfBack, backY],
    [halfBack, backY],
    [halfFront, frontY],
    [-halfFront, frontY],
  ];
  roundedPolygon(ctx, face, 12);
  const metal = ctx.createLinearGradient(-halfFront, backY, halfFront, frontY);
  metal.addColorStop(0, SILVER.highlight);
  metal.addColorStop(0.28, SILVER.light);
  metal.addColorStop(0.62, SILVER.base);
  metal.addColorStop(0.86, SILVER.mid);
  metal.addColorStop(1, SILVER.low);
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Specular sweep along the lid, and a cool bounce along the back edge.
  const sheen = ctx.createLinearGradient(-halfFront * 0.5, backY, halfFront * 0.15, frontY);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  sheen.addColorStop(0.42, 'rgba(255, 255, 255, 0.08)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-halfFront, backY, lidW, depth);

  const bounce = ctx.createLinearGradient(0, backY, 0, backY + depth * 0.35);
  bounce.addColorStop(0, 'rgba(120, 150, 168, 0.35)');
  bounce.addColorStop(1, 'rgba(120, 150, 168, 0)');
  ctx.fillStyle = bounce;
  ctx.fillRect(-halfFront, backY, lidW, depth * 0.35);

  // Hairline seam where the lid meets the base.
  ctx.strokeStyle = 'rgba(58, 70, 79, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-halfFront * 0.98, frontY - 2);
  ctx.lineTo(halfFront * 0.98, frontY - 2);
  ctx.stroke();
  ctx.restore();

  // Rim light: one bright edge along the back, one soft edge at the front.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-halfBack, backY + 0.5);
  ctx.lineTo(halfBack, backY + 0.5);
  ctx.stroke();

  // Etched DEVZARD wordmark, kept in the upper half of the lid so it is never
  // crossed by the screen/copy boundary when the lid starts to lift.
  const textY = backY + depth * 0.4;
  const fontSize = Math.max(9, lidW * 0.042);
  ctx.font = `600 ${fontSize}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const word = 'DEVZARD';
  const tracking = fontSize * 0.28;
  const width = measureTracked(ctx, word, tracking);
  drawTracked(ctx, word, -width / 2, textY, tracking, 'rgba(64, 76, 85, 0.55)');
  drawTracked(ctx, word, -width / 2, textY + 1, tracking, 'rgba(255, 255, 255, 0.75)');

  // The mark's accent dot, so the lid matches the brand lockup.
  ctx.fillStyle = 'rgba(108, 222, 232, 0.9)';
  ctx.beginPath();
  ctx.arc(width / 2 + fontSize * 0.14, textY + fontSize * 0.32, fontSize * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── open laptop ────────────────────────────────────────────────────────── */

function drawDeck(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  deckDepth: number,
  alpha: number,
  glow: number,
) {
  const top = hingeY;
  const bottom = hingeY + deckDepth;
  const backHalf = lidW / 2;
  const frontHalf = backHalf * 1.02;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Top face, in perspective: the keyboard tray narrows towards the hinge.
  roundedPolygon(ctx, [
    [-backHalf, top],
    [backHalf, top],
    [frontHalf, bottom],
    [-frontHalf, bottom],
  ], deckDepth * 0.2);
  const deck = ctx.createLinearGradient(0, top, 0, bottom);
  deck.addColorStop(0, SILVER.base);
  deck.addColorStop(0.4, SILVER.light);
  deck.addColorStop(0.88, SILVER.base);
  deck.addColorStop(1, SILVER.mid);
  ctx.fillStyle = deck;
  ctx.fill();

  ctx.save();
  ctx.clip();

  // Keyboard well.
  const wellTop = top + deckDepth * 0.1;
  const wellBottom = bottom - deckDepth * 0.36;
  const wellHeight = Math.max(4, wellBottom - wellTop);
  const well = ctx.createLinearGradient(0, wellTop, 0, wellBottom);
  well.addColorStop(0, 'rgba(30, 37, 43, 0.92)');
  well.addColorStop(1, 'rgba(46, 54, 61, 0.88)');
  ctx.fillStyle = well;
  roundRectPath(ctx, -backHalf * 0.9, wellTop, backHalf * 1.8, wellHeight, deckDepth * 0.1);
  ctx.fill();

  // Keys, in deck space so they splay with the perspective.
  const rows = 5;
  const columns = 14;
  const keyTop = wellTop + wellHeight * 0.1;
  const keyArea = wellHeight * 0.8;
  const rowH = keyArea / rows;
  for (let row = 0; row < rows; row += 1) {
    const v = (keyTop - top) / deckDepth + ((row + 0.5) * rowH) / deckDepth;
    const spread = backHalf * (1 + v * 0.055);
    const rowWidth = spread * 1.76;
    const left = -rowWidth / 2;
    const cellW = rowWidth / columns;
    const y = top + v * deckDepth;
    const inset = cellW * 0.11;
    const isBottom = row === rows - 1;

    for (let column = 0; column < columns; column += 1) {
      if (isBottom && column > 3 && column < 10) continue;
      const keyWidth = isBottom && (column === 3 || column === 10) ? cellW * 2.05 : cellW;
      const keyX = isBottom && column === 10 ? left + column * cellW - cellW * 0.05 : left + column * cellW;
      const key = ctx.createLinearGradient(0, y, 0, y + rowH);
      key.addColorStop(0, `rgba(${52 + row * 2}, ${60 + row * 2}, ${68 + row * 2}, 0.95)`);
      key.addColorStop(1, `rgba(${30 + row}, ${36 + row}, ${42 + row}, 0.95)`);
      ctx.fillStyle = key;
      roundRectPath(ctx, keyX + inset, y + rowH * 0.24, keyWidth - inset * 2, rowH * 0.5, Math.min(3, rowH * 0.16));
      ctx.fill();
    }

    if (isBottom) {
      const spaceLeft = left + cellW * 4;
      const spaceWidth = cellW * 6;
      ctx.fillStyle = 'rgba(44, 51, 58, 0.95)';
      roundRectPath(ctx, spaceLeft + inset, y + rowH * 0.24, spaceWidth - inset * 2, rowH * 0.5, Math.min(3, rowH * 0.16));
      ctx.fill();
    }
  }

  // Trackpad: a slightly darker plate with a hairline outline.
  const padW = backHalf * 0.44;
  const padTop = wellBottom + deckDepth * 0.02;
  const padH = Math.max(0, bottom - padTop - deckDepth * 0.09);
  if (padH > 4) {
    ctx.fillStyle = 'rgba(150, 161, 171, 0.45)';
    roundRectPath(ctx, -padW / 2, padTop, padW, padH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Display light across the tray.
  if (glow > 0.02) {
    const light = ctx.createLinearGradient(0, top, 0, bottom);
    light.addColorStop(0, `rgba(120, 226, 240, ${0.12 * glow})`);
    light.addColorStop(0.55, 'rgba(120, 226, 240, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(-backHalf, top, lidW, deckDepth);
  }
  ctx.restore();

  // Front edge: the base's thickness, catching a bright highlight.
  const edge = ctx.createLinearGradient(0, bottom, 0, bottom + deckDepth * 0.2);
  edge.addColorStop(0, SILVER.light);
  edge.addColorStop(0.35, SILVER.mid);
  edge.addColorStop(1, SILVER.edge);
  ctx.fillStyle = edge;
  roundRectPath(ctx, -frontHalf, bottom, frontHalf * 2, deckDepth * 0.2, deckDepth * 0.08, false);
  ctx.fill();

  // Thumb scoop on the front edge.
  ctx.fillStyle = 'rgba(72, 82, 91, 0.35)';
  roundRectPath(ctx, -lidW * 0.09, bottom + deckDepth * 0.04, lidW * 0.18, deckDepth * 0.05, deckDepth * 0.02);
  ctx.fill();

  ctx.restore();
}

/** The lid standing up from the hinge: aluminium frame, then the screen. */
function drawStandingLid(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  lidHeight: number,
  narrow: number,
  open: number,
  alpha: number,
) {
  const half = lidW / 2;
  const quad: Point[] = [
    [-half, hingeY],
    [half, hingeY],
    [half * narrow, hingeY - lidHeight],
    [-half * narrow, hingeY - lidHeight],
  ];

  ctx.save();
  ctx.globalAlpha = alpha;
  roundedPolygon(ctx, quad, lidW * 0.03);

  const metal = ctx.createLinearGradient(-half, hingeY, half, hingeY - lidHeight);
  metal.addColorStop(0, SILVER.low);
  metal.addColorStop(0.3, SILVER.light);
  metal.addColorStop(0.62, SILVER.base);
  metal.addColorStop(1, SILVER.mid);
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.save();
  ctx.clip();
  const sheen = ctx.createLinearGradient(-half * 0.7, hingeY, half * 0.4, hingeY - lidHeight);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-half, hingeY - lidHeight, lidW, lidHeight);
  ctx.restore();

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + open * 0.15})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  hingeY: number,
  lidW: number,
  lidHeight: number,
  narrow: number,
  sin: number,
  progress: number,
  glow: number,
  alpha: number,
  showMark: boolean,
) {
  const half = lidW / 2;
  const inset = lidW * 0.022;
  const quad: Point[] = [
    [-half + inset, hingeY - inset * 0.4],
    [half - inset, hingeY - inset * 0.4],
    [half * narrow - inset * 0.9, hingeY - lidHeight + inset * 0.7],
    [-half * narrow + inset * 0.9, hingeY - lidHeight + inset * 0.7],
  ];

  const light = smoothstep((sin - 0.6) / 0.25);
  const screenAlpha = alpha * clamp01(light * 1.2);
  if (screenAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = screenAlpha;

  // Black bezel.
  roundedPolygon(ctx, quad, lidW * 0.022);
  ctx.fillStyle = '#12171c';
  ctx.fill();

  ctx.save();
  ctx.clip();
  const top = Math.min(quad[0][1], quad[2][1]);
  const bottom = Math.max(quad[0][1], quad[2][1]);
  const left = -half;
  const right = half;

  const glass = ctx.createLinearGradient(0, top, 0, bottom);
  glass.addColorStop(0, '#0d1519');
  glass.addColorStop(0.55, '#0a1116');
  glass.addColorStop(1, '#101b21');
  ctx.fillStyle = glass;
  ctx.fillRect(left, top, right - left, bottom - top);

  // Faint engineering grid.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.05)';
  ctx.lineWidth = 1;
  const step = Math.max(28, lidW / 14);
  for (let x = left; x < right; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = top; y < bottom; y += step) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  // A slow band of light travelling up the display as it powers on.
  const sweep = top + (bottom - top) * (0.25 + 0.5 * clamp01(progress));
  const band = ctx.createLinearGradient(0, sweep - lidHeight * 0.22, 0, sweep + lidHeight * 0.22);
  band.addColorStop(0, 'rgba(108, 222, 232, 0)');
  band.addColorStop(0.5, `rgba(108, 222, 232, ${0.05 + glow * 0.05})`);
  band.addColorStop(1, 'rgba(108, 222, 232, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(left, top, right - left, bottom - top);

  if (showMark) {
    ctx.globalAlpha = screenAlpha * 0.5;
    ctx.fillStyle = '#e9f4f7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `650 ${Math.max(10, lidW * 0.032)}px Manrope, system-ui, sans-serif`;
    ctx.fillText('Devzard.', 0, bottom - lidHeight * 0.06);
    ctx.globalAlpha = screenAlpha;
  }

  // Glass reflection.
  const sheen = ctx.createLinearGradient(left, top, right, bottom);
  sheen.addColorStop(0, `rgba(226, 245, 250, ${0.08 + glow * 0.05})`);
  sheen.addColorStop(0.35, 'rgba(226, 245, 250, 0.015)');
  sheen.addColorStop(0.62, 'rgba(226, 245, 250, 0)');
  sheen.addColorStop(1, 'rgba(108, 222, 232, 0.04)');
  ctx.fillStyle = sheen;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.restore();

  // Camera dot in the bezel.
  ctx.fillStyle = 'rgba(120, 140, 152, 0.55)';
  ctx.beginPath();
  ctx.arc(0, top + lidHeight * 0.014 + 1.5, Math.max(1.4, lidW * 0.004), 0, Math.PI * 2);
  ctx.fill();

  // Emissive rim while the display is on.
  ctx.strokeStyle = `rgba(130, 232, 244, ${0.28 + glow * 0.3})`;
  ctx.lineWidth = 1;
  roundedPolygon(ctx, quad, lidW * 0.022);
  ctx.stroke();
  ctx.restore();
}

function drawHingeBar(ctx: CanvasRenderingContext2D, hingeY: number, lidW: number, openMix: number) {
  const half = lidW / 2;
  const height = Math.max(2, lidW * 0.012);
  const bar = ctx.createLinearGradient(0, hingeY - height, 0, hingeY + height);
  bar.addColorStop(0, `rgba(${lerp(120, 88, openMix)}, ${lerp(131, 99, openMix)}, ${lerp(141, 109, openMix)}, 0.9)`);
  bar.addColorStop(0.5, 'rgba(58, 68, 77, 0.95)');
  bar.addColorStop(1, 'rgba(34, 41, 48, 0.9)');
  ctx.fillStyle = bar;
  roundRectPath(ctx, -half * 0.82, hingeY - height * 0.6, half * 1.64, height * 1.2, height * 0.6);
  ctx.fill();
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

function measureTracked(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  const base = ctx.measureText(text).width;
  return base + tracking * (text.length - 1);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  color: string,
) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
  ctx.restore();
}

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
