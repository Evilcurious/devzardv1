/**
 * Hero laptop scene.
 *
 * A silver clamshell, open from the first frame, facing the viewer. The hero
 * copy is not drawn here — it lives in the DOM over the display (the component
 * positions it from `laptopMetrics`, so the two cannot drift apart). What this
 * file draws is the machine, the glass and the light around it.
 *
 * Nothing is scroll-mapped: the only inputs are elapsed time (for the idle
 * effects) and a pointer offset (for a small parallax drift). Both are gentle
 * on purpose — the display has to stay readable at all times.
 */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const TAU = Math.PI * 2;

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** Deterministic 0–1 noise, so the dust motes sit still between frames. */
function hash(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Aluminium palette, shared by the lid, the deck and the lip. */
const SILVER = {
  highlight: '#f4f8fa',
  light: '#e2e9ee',
  base: '#c8d1d8',
  mid: '#a9b4bd',
  low: '#848f99',
  edge: '#5a656e',
  seam: '#38424a',
} as const;

/** Lid aspect (width ÷ height) — a 16:10 laptop. */
export const LID_RATIO = 1.62;
/** Deck depth as a fraction of the lid height. */
const DECK_DEPTH = 0.38;

export type HeroLayoutMode = 'overlay' | 'stacked';

export interface LaptopMetrics {
  mode: HeroLayoutMode;
  /** Lid width and height in CSS pixels. */
  lidW: number;
  lidH: number;
  /** Depth of the keyboard deck, seen in perspective. */
  deckDepth: number;
  /** Top edge of the lid. */
  screenTop: number;
  /** Where the lid meets the deck (the hinge). */
  hingeY: number;
}

/**
 * Geometry for one stage size. Both the canvas and the CSS that places the
 * hero copy read from this, so they cannot drift apart.
 */
export function laptopMetrics(width: number, height: number): LaptopMetrics {
  const overlay = width >= 820 && height >= 470;

  if (!overlay) {
    // Narrow stages: the copy owns the top of the stage and the laptop sits
    // beneath it. The reserve is the room the copy needs, so the two can never
    // collide on a short phone.
    const margin = Math.max(14, height * 0.03);
    const reserve = Math.max(286, height * 0.46);
    const available = Math.max(150, height - reserve - margin);
    const lidW = Math.max(
      180,
      Math.min(width * 0.94, 600, (available / (1 + DECK_DEPTH * 1.14)) * LID_RATIO),
    );
    const lidH = lidW / LID_RATIO;
    const deckDepth = lidH * DECK_DEPTH;
    const hingeY = height - margin - deckDepth * 1.14;
    return { mode: 'stacked', lidW, lidH, deckDepth, screenTop: hingeY - lidH, hingeY };
  }

  // Wide stages: the machine is the whole hero, so it is sized from the
  // viewport height rather than from a fixed fraction of the width — that is
  // what makes it read as a device on a desk instead of a small illustration.
  // The base is allowed to run a little past the bottom edge of the stage
  // (`BLEED`) so the machine can fill the screen; the canvas is masked out
  // there, so the base reads as continuing out of frame rather than being cut.
  const BLEED = 0.035;
  const LIP = 0.14;
  const lidW = Math.min(
    width * 0.94,
    1180,
    ((height - 10) / (1 + DECK_DEPTH * (1 + LIP) - BLEED * DECK_DEPTH)) * LID_RATIO,
  );
  const lidH = lidW / LID_RATIO;
  const deckDepth = lidH * DECK_DEPTH;
  const screenTop = 10;
  return { mode: 'overlay', lidW, lidH, deckDepth, screenTop, hingeY: screenTop + lidH };
}

/* ── reveal ─────────────────────────────────────────────────────────────── */

/**
 * How the hero copy arrives. One short pass (~1.4s) rather than an intro: the
 * machine is already open, the copy simply settles onto the glass with a
 * stagger. Values are fractions of `durationMs`.
 */
export const HERO_REVEAL = {
  durationMs: 1400,
  copy: {
    brand: { start: 0.02, end: 0.34 },
    headline: { start: 0.1, end: 0.46 },
    description: { start: 0.24, end: 0.62 },
    actions: { start: 0.38, end: 0.8 },
  },
} as const;

export type HeroLine = keyof typeof HERO_REVEAL.copy;

/** Reveal weight for one copy line at a given progress, 0–1. */
export function copyStrength(line: HeroLine, progress: number) {
  const { start, end } = HERO_REVEAL.copy[line];
  return clamp01((progress - start) / (end - start));
}

export interface LaptopFrame {
  width: number;
  height: number;
  dpr: number;
  /** Seconds since mount — drives every idle loop. */
  time: number;
  /** 0–1 through `HERO_REVEAL.durationMs`. */
  reveal: number;
  /** Pointer parallax, each −1…1, already smoothed. */
  px: number;
  py: number;
}

export function drawLaptopScene(ctx: CanvasRenderingContext2D, frame: LaptopFrame): void {
  const { width, height, dpr, time, px, py } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  const m = laptopMetrics(width, height);
  const reveal = clamp01(frame.reveal);
  const glow = 0.55 + 0.45 * reveal;

  // A slow float, plus a few pixels of parallax that follow the pointer.
  ctx.save();
  ctx.translate(width / 2 + px * 9, py * 5 + Math.sin(time * 0.85) * 1.8);

  drawDeskGlow(ctx, m, height, reveal);
  drawShadow(ctx, m);
  drawLightSpill(ctx, m, reveal);
  drawContactShadow(ctx, m);
  drawDeck(ctx, m, time, glow);
  drawLid(ctx, m, time, glow, reveal);
  drawHinge(ctx, m);
  drawDust(ctx, m, time, width, reveal);

  ctx.restore();
}

type Point = [number, number];

/* ── desk, light, shadow ────────────────────────────────────────────────── */

/** The room light pooling around the machine, so it sits in a scene. */
function drawDeskGlow(
  ctx: CanvasRenderingContext2D,
  m: LaptopMetrics,
  height: number,
  reveal: number,
) {
  const radius = m.lidW * 0.95;
  const centreY = m.screenTop + m.lidH * 0.42;
  const pool = ctx.createRadialGradient(0, centreY, 0, 0, centreY, radius);
  pool.addColorStop(0, `rgba(96, 214, 232, ${0.1 * reveal})`);
  pool.addColorStop(0.5, `rgba(52, 130, 168, ${0.05 * reveal})`);
  pool.addColorStop(1, 'rgba(24, 52, 74, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(0, centreY, radius, radius * 0.82, 0, 0, TAU);
  ctx.fill();

  // Horizon shadow, so the desk does not read as empty space.
  const floor = ctx.createLinearGradient(0, height * 0.72, 0, height);
  floor.addColorStop(0, 'rgba(0, 0, 0, 0)');
  floor.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = floor;
  ctx.fillRect(-m.lidW, height * 0.72, m.lidW * 2, height * 0.28);
}

/** A tight dark band under the front edge, so the base sits on the desk. */
function drawContactShadow(ctx: CanvasRenderingContext2D, m: LaptopMetrics) {
  const y = m.hingeY + m.deckDepth;
  const lip = m.deckDepth * 0.14;
  const contact = ctx.createLinearGradient(0, y, 0, y + lip * 2.6);
  contact.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
  contact.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, lip * 1.3);
  ctx.fillStyle = contact;
  ctx.beginPath();
  ctx.ellipse(0, 0, m.lidW * 0.54, 1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, m: LaptopMetrics) {
  const centreY = m.hingeY + m.deckDepth * 0.62;
  const rx = m.lidW * 0.6;
  const ry = m.lidW * 0.105;

  ctx.save();
  ctx.translate(0, centreY);
  ctx.scale(1, ry / rx);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  shadow.addColorStop(0.42, 'rgba(0, 0, 0, 0.24)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Display light falling onto the keyboard and the desk in front of it. */
function drawLightSpill(ctx: CanvasRenderingContext2D, m: LaptopMetrics, reveal: number) {
  const strength = 0.35 + reveal * 0.65;
  const top = m.hingeY - m.deckDepth * 0.1;
  const radius = m.lidW * 0.62;
  const spill = ctx.createRadialGradient(0, top, 6, 0, top, radius);
  spill.addColorStop(0, `rgba(110, 224, 238, ${0.16 * strength})`);
  spill.addColorStop(0.45, `rgba(64, 166, 198, ${0.07 * strength})`);
  spill.addColorStop(1, 'rgba(36, 96, 128, 0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.ellipse(0, top + m.deckDepth * 0.35, radius, m.deckDepth * 1.5 + 46, 0, 0, TAU);
  ctx.fill();
}

/** Keycap legends, one row per keyboard row (see the deck drawing). */
const LEGEND_ROWS: string[][] = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ''],
  ['', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '', ''],
  ['', '', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '', ''],
];

/** Bottom row: caption, share of the row width, and whether it is the space bar. */
const BOTTOM_ROW: Array<{ label?: string; share: number; space?: boolean }> = [
  { label: 'fn', share: 0.065 },
  { label: 'ctrl', share: 0.085 },
  { label: 'alt', share: 0.07 },
  { label: 'cmd', share: 0.115 },
  { share: 0.34, space: true },
  { label: 'cmd', share: 0.115 },
  { label: 'alt', share: 0.07 },
  { label: '←', share: 0.07 },
  { label: '→', share: 0.07 },
];

/* ── deck ───────────────────────────────────────────────────────────────── */

function drawDeck(ctx: CanvasRenderingContext2D, m: LaptopMetrics, time: number, glow: number) {
  const top = m.hingeY;
  const bottom = m.hingeY + m.deckDepth;
  const lip = m.deckDepth * 0.14;
  const backHalf = m.lidW / 2;
  const frontHalf = backHalf * 1.035;
  const frontLip = backHalf * 1.029;

  // One silhouette for the base: top face plus the thickness below the front
  // edge, so the two never look like stacked slabs.
  const silhouette: Point[] = [
    [-backHalf, top],
    [backHalf, top],
    [frontHalf, bottom],
    [frontLip, bottom + lip],
    [-frontLip, bottom + lip],
    [-frontHalf, bottom],
  ];
  roundedPolygon(ctx, silhouette, m.deckDepth * 0.06);
  // Light comes from above, so the gradient runs down the depth of the base
  // rather than across it — a diagonal one reads as a hard wedge.
  const shell = ctx.createLinearGradient(0, top, 0, bottom + lip);
  shell.addColorStop(0, SILVER.base);
  shell.addColorStop(0.16, SILVER.light);
  shell.addColorStop(0.46, SILVER.highlight);
  shell.addColorStop(0.78, SILVER.light);
  shell.addColorStop(0.9, SILVER.base);
  shell.addColorStop(0.96, SILVER.mid);
  shell.addColorStop(1, SILVER.edge);
  ctx.fillStyle = shell;
  ctx.fill();

  ctx.save();
  roundedPolygon(ctx, silhouette, m.deckDepth * 0.06);
  ctx.clip();

  // Keyboard tray: a recessed plate, darker than the palm rest.
  const wellTop = top + m.deckDepth * 0.05;
  const wellBottom = top + m.deckDepth * 0.68;
  const wellHeight = Math.max(4, wellBottom - wellTop);
  const wellInset = backHalf * 0.055;
  const wellTopHalf = backHalf - wellInset * 1.05;
  const wellBottomHalf = frontHalf - wellInset;
  roundedPolygon(ctx, [
    [-wellTopHalf, wellTop],
    [wellTopHalf, wellTop],
    [wellBottomHalf, wellBottom],
    [-wellBottomHalf, wellBottom],
  ], m.deckDepth * 0.045);
  const well = ctx.createLinearGradient(0, wellTop, 0, wellBottom);
  well.addColorStop(0, '#6f7a84');
  well.addColorStop(0.2, '#818d97');
  well.addColorStop(1, '#8d99a3');
  ctx.fillStyle = well;
  ctx.fill();

  // Keys, laid out in deck space so they splay with the perspective.
  const rows = 5;
  const columns = 14;
  const keyTop = wellTop + wellHeight * 0.08;
  const keyArea = wellHeight * 0.84;
  const rowH = keyArea / rows;
  for (let row = 0; row < rows; row += 1) {
    const v = (keyTop - top) / m.deckDepth + ((row + 0.6) * rowH) / m.deckDepth;
    const spread = backHalf * (1 + v * 0.045);
    const rowWidth = spread * 1.74;
    const left = -rowWidth / 2;
    const cellW = rowWidth / columns;
    const y = keyTop + row * rowH;
    const inset = cellW * 0.11;
    const isBottom = row === rows - 1;

    // One cap gradient per row — 70 were being built every frame before.
    const h = rowH * 0.68;
    const radius = Math.min(3.4, rowH * 0.2);
    const cap = ctx.createLinearGradient(0, y + rowH * 0.16, 0, y + rowH * 0.16 + h);
    cap.addColorStop(0, '#d3dbe1');
    cap.addColorStop(0.6, '#c2ccd4');
    cap.addColorStop(1, '#a8b4bd');

    // Legends are only worth drawing once the caps are big enough to read.
    const legendSize = Math.min(h * 0.68, cellW * 0.3);
    const legends = legendSize >= 5;
    if (legends) {
      ctx.font = `600 ${legendSize.toFixed(1)}px Manrope, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(48, 58, 66, 0.72)';
    }

    for (let column = 0; column < columns; column += 1) {
      if (isBottom && column > 3 && column < 10) continue;
      const keyWidth = isBottom && (column === 3 || column === 10) ? cellW * 2.05 : cellW;
      const keyX = isBottom && column === 10 ? left + column * cellW - cellW * 0.05 : left + column * cellW;
      const x = keyX + inset;
      const w = keyWidth - inset * 2;

      // Side wall, then the slightly brighter top face.
      ctx.fillStyle = 'rgba(84, 95, 105, 0.75)';
      roundRectPath(ctx, x, y + rowH * 0.2, w, h, radius);
      ctx.fill();
      ctx.fillStyle = cap;
      roundRectPath(ctx, x, y + rowH * 0.16, w, h, radius);
      ctx.fill();

      const legend = LEGEND_ROWS[row]?.[column];
      if (legends && legend) {
        // Set the ink after the cap gradient, or the lettering inherits it.
        ctx.fillStyle = 'rgba(38, 48, 56, 0.85)';
        ctx.fillText(legend, x + w / 2, y + rowH * 0.16 + h / 2);
      }
    }

    if (isBottom) {
      // The bottom row is laid out by hand: modifiers and arrows are not
      // uniform cells, and faking them on the grid clipped their legends.
      let cursor = left;
      BOTTOM_ROW.forEach(({ label, share, space }) => {
        const w = rowWidth * share - inset * 2;
        const x = cursor + inset;
        ctx.fillStyle = 'rgba(84, 95, 105, 0.75)';
        roundRectPath(ctx, x, y + rowH * 0.2, w, h, radius);
        ctx.fill();
        ctx.fillStyle = cap;
        roundRectPath(ctx, x, y + rowH * 0.16, w, h, radius);
        ctx.fill();

        if (space) {
          // The brand rides the space bar, etched rather than printed.
          if (legends) {
            const size = Math.min(h * 0.56, w * 0.055);
            const tracking = size * 0.34;
            ctx.font = `650 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
            const wordWidth = measureTracked(ctx, 'DEVZARD', tracking);
            const centreY = y + rowH * 0.16 + h / 2;
            drawTracked(ctx, 'DEVZARD', x + w / 2 - wordWidth / 2, centreY, tracking, 'rgba(40, 50, 58, 0.62)');
            ctx.fillStyle = 'rgba(28, 132, 150, 0.65)';
            ctx.beginPath();
            ctx.arc(x + w / 2 + wordWidth / 2 + size * 0.12, centreY + size * 0.2, size * 0.11, 0, TAU);
            ctx.fill();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
          }
        } else if (legends && label) {
          ctx.fillStyle = 'rgba(38, 48, 56, 0.85)';
          ctx.fillText(label, x + w / 2, y + rowH * 0.16 + h / 2);
        }
        cursor += rowWidth * share;
      });
    }
  }

  // Trackpad: a cooler plate with a hairline outline.
  const padW = backHalf * 0.38;
  const padTop = top + m.deckDepth * 0.715;
  const padH = Math.max(0, bottom - padTop - m.deckDepth * 0.07);
  if (padH > 4) {
    const pad = ctx.createLinearGradient(0, padTop, 0, padTop + padH);
    pad.addColorStop(0, 'rgba(214, 222, 228, 0.9)');
    pad.addColorStop(1, 'rgba(188, 198, 206, 0.85)');
    ctx.fillStyle = pad;
    roundRectPath(ctx, -padW / 2, padTop, padW, padH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(92, 104, 114, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Screen light along the back of the tray.
  const light = ctx.createLinearGradient(0, top, 0, bottom);
  light.addColorStop(0, `rgba(124, 228, 240, ${0.18 * glow})`);
  light.addColorStop(0.45, 'rgba(124, 228, 240, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(-frontHalf, top, frontHalf * 2, m.deckDepth);

  // Specular sweep travelling across the metal, once every ~9s.
  const pass = (time % 9) / 9;
  if (pass < 0.3) {
    const p = pass / 0.3;
    const x = lerp(-frontHalf * 1.4, frontHalf * 1.4, p);
    const band = ctx.createLinearGradient(x - m.lidW * 0.34, 0, x + m.lidW * 0.34, m.deckDepth * 0.5);
    band.addColorStop(0, 'rgba(255, 255, 255, 0)');
    band.addColorStop(0.5, 'rgba(255, 255, 255, 0.065)');
    band.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(-frontHalf, top, frontHalf * 2, m.deckDepth + lip);
  }

  // Thumb scoop on the front edge.
  ctx.fillStyle = 'rgba(72, 82, 91, 0.28)';
  roundRectPath(ctx, -m.lidW * 0.08, bottom + lip * 0.34, m.lidW * 0.16, lip * 0.36, lip * 0.16);
  ctx.fill();
  ctx.restore();

  // Hairline around the silhouette, which is what gives the base its thickness.
  ctx.strokeStyle = 'rgba(74, 85, 94, 0.4)';
  ctx.lineWidth = 1;
  roundedPolygon(ctx, silhouette, m.deckDepth * 0.06);
  ctx.stroke();
}

/* ── lid + display ──────────────────────────────────────────────────────── */

function drawLid(
  ctx: CanvasRenderingContext2D,
  m: LaptopMetrics,
  time: number,
  glow: number,
  reveal: number,
) {
  const half = m.lidW / 2;
  const topHalf = half * 0.985;
  const top = m.screenTop;
  const bottom = m.hingeY;
  const lidH = bottom - top;

  const shell: Point[] = [
    [-half, bottom],
    [half, bottom],
    [topHalf, top],
    [-topHalf, top],
  ];

  roundedPolygon(ctx, shell, m.lidW * 0.028);
  const metal = ctx.createLinearGradient(-half, bottom, half, top);
  metal.addColorStop(0, SILVER.low);
  metal.addColorStop(0.24, SILVER.highlight);
  metal.addColorStop(0.55, SILVER.light);
  metal.addColorStop(0.82, SILVER.base);
  metal.addColorStop(1, SILVER.mid);
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.save();
  ctx.clip();

  // Brushed-metal banding along the frame.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 26; i += 1) {
    const y = top + (i / 26) * lidH;
    ctx.fillStyle = i % 2 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(90, 101, 110, 0.5)';
    ctx.fillRect(-half, y, m.lidW, Math.max(0.6, lidH / 160));
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Bezel, then glass.
  const bezel = m.lidW * 0.024;
  // Thin bezel at the top and sides, a deeper chin for the etched mark.
  const screen: Point[] = [
    [-half + bezel, bottom - bezel * 2.1],
    [half - bezel, bottom - bezel * 2.1],
    [topHalf - bezel * 0.92, top + bezel * 1.5],
    [-topHalf + bezel * 0.92, top + bezel * 1.5],
  ];
  roundedPolygon(ctx, screen, m.lidW * 0.014);
  ctx.fillStyle = '#0d1216';
  ctx.fill();

  drawGlass(ctx, m, screen, time, glow, reveal);
  drawBezel(ctx, m, screen, bottom, bezel, glow, time);

  // Rim light down the outer edges of the lid.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = 1;
  roundedPolygon(ctx, shell, m.lidW * 0.028);
  ctx.stroke();
}

/** The display itself: wallpaper, grid, sweeping light, reflection. */
function drawGlass(
  ctx: CanvasRenderingContext2D,
  m: LaptopMetrics,
  quad: Point[],
  time: number,
  glow: number,
  reveal: number,
) {
  const left = quad[0][0];
  const right = quad[1][0];
  const top = quad[2][1];
  const bottom = quad[0][1];
  const width = right - left;
  const height = bottom - top;

  ctx.save();
  roundedPolygon(ctx, quad, m.lidW * 0.014);
  ctx.clip();

  const glass = ctx.createLinearGradient(left, top, right, bottom);
  glass.addColorStop(0, '#0a1116');
  glass.addColorStop(0.48, '#081014');
  glass.addColorStop(1, '#0b1620');
  ctx.fillStyle = glass;
  ctx.fillRect(left, top, width, height);

  // Two slow blooms, like a wallpaper breathing behind the copy.
  const drift = Math.sin(time * 0.32) * width * 0.03;
  const bloomA = ctx.createRadialGradient(
    left + width * 0.3 + drift,
    top + height * 0.28,
    0,
    left + width * 0.3 + drift,
    top + height * 0.28,
    width * 0.62,
  );
  bloomA.addColorStop(0, `rgba(48, 196, 220, ${0.17 * reveal})`);
  bloomA.addColorStop(0.55, `rgba(30, 116, 150, ${0.07 * reveal})`);
  bloomA.addColorStop(1, 'rgba(12, 40, 60, 0)');
  ctx.fillStyle = bloomA;
  ctx.fillRect(left, top, width, height);

  const bloomB = ctx.createRadialGradient(
    right - width * 0.14,
    bottom - height * 0.16,
    0,
    right - width * 0.14,
    bottom - height * 0.16,
    width * 0.56,
  );
  bloomB.addColorStop(0, `rgba(64, 96, 216, ${0.15 * reveal})`);
  bloomB.addColorStop(0.6, 'rgba(30, 44, 120, 0.05)');
  bloomB.addColorStop(1, 'rgba(10, 16, 40, 0)');
  ctx.fillStyle = bloomB;
  ctx.fillRect(left, top, width, height);

  // Faint engineering grid.
  ctx.strokeStyle = 'rgba(120, 226, 240, 0.05)';
  ctx.lineWidth = 1;
  const step = Math.max(26, m.lidW / 16);
  for (let x = left; x <= right; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = top; y <= bottom; y += step) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  // A wide band of light crossing the glass every ~7s.
  const pass = (time % 7) / 7;
  if (pass < 0.26) {
    const p = smoothstep(pass / 0.26);
    const centre = lerp(left - width * 0.4, right + width * 0.4, p);
    const band = ctx.createLinearGradient(centre - width * 0.24, top, centre + width * 0.24, bottom);
    band.addColorStop(0, 'rgba(150, 236, 248, 0)');
    band.addColorStop(0.5, 'rgba(150, 236, 248, 0.075)');
    band.addColorStop(1, 'rgba(150, 236, 248, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(left, top, width, height);
  }

  // Scan line drifting down, barely there.
  const scanY = top + ((time * 0.06) % 1) * height;
  const scan = ctx.createLinearGradient(0, scanY - height * 0.12, 0, scanY + height * 0.12);
  scan.addColorStop(0, 'rgba(160, 240, 250, 0)');
  scan.addColorStop(0.5, 'rgba(160, 240, 250, 0.028)');
  scan.addColorStop(1, 'rgba(160, 240, 250, 0)');
  ctx.fillStyle = scan;
  ctx.fillRect(left, top, width, height);

  // Glass reflection: a soft diagonal streak from the room.
  const reflection = ctx.createLinearGradient(left, top, right * 0.8, bottom);
  reflection.addColorStop(0, 'rgba(226, 245, 250, 0.07)');
  reflection.addColorStop(0.3, 'rgba(226, 245, 250, 0.02)');
  reflection.addColorStop(0.55, 'rgba(226, 245, 250, 0)');
  reflection.addColorStop(1, 'rgba(108, 222, 232, 0.035)');
  ctx.fillStyle = reflection;
  ctx.fillRect(left, top, width, height);

  // Vignette, so the copy keeps contrast at the corners.
  const vignette = ctx.createRadialGradient(
    left + width / 2,
    top + height / 2,
    Math.min(width, height) * 0.2,
    left + width / 2,
    top + height / 2,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 6, 9, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(left, top, width, height);

  // Display edge glow, strongest just after the copy lands.
  ctx.strokeStyle = `rgba(128, 232, 244, ${0.16 + glow * 0.16})`;
  ctx.lineWidth = 1;
  roundedPolygon(ctx, quad, m.lidW * 0.014);
  ctx.stroke();
  ctx.restore();
}

function drawBezel(
  ctx: CanvasRenderingContext2D,
  m: LaptopMetrics,
  screen: Point[],
  bottom: number,
  bezel: number,
  glow: number,
  time: number,
) {
  // Camera dot in the top bezel, with a slow breathing ring.
  const camY = screen[2][1] - bezel * 0.62;
  const camR = Math.max(1.5, m.lidW * 0.0038);
  ctx.fillStyle = 'rgba(16, 22, 27, 0.9)';
  ctx.beginPath();
  ctx.arc(0, camY, camR * 1.7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(132, 226, 240, ${0.35 + 0.25 * Math.sin(time * 1.1)})`;
  ctx.beginPath();
  ctx.arc(0, camY, camR, 0, TAU);
  ctx.fill();

  // Etched wordmark on the chin, matching the brand lockup.
  const chinY = bottom - bezel * 1.05;
  const fontSize = Math.max(5, m.lidW * 0.0125);
  ctx.font = `600 ${fontSize}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tracking = fontSize * 0.34;
  const width = measureTracked(ctx, 'DEVZARD', tracking);
  drawTracked(ctx, 'DEVZARD', -width / 2, chinY, tracking, 'rgba(198, 210, 220, 0.55)');
  ctx.fillStyle = `rgba(108, 222, 232, ${0.5 + glow * 0.3})`;
  ctx.beginPath();
  ctx.arc(width / 2 + fontSize * 0.2, chinY + 0.5, fontSize * 0.11, 0, TAU);
  ctx.fill();
}

function drawHinge(ctx: CanvasRenderingContext2D, m: LaptopMetrics) {
  const half = m.lidW / 2;
  const height = Math.max(2, m.lidW * 0.011);
  const bar = ctx.createLinearGradient(0, m.hingeY - height, 0, m.hingeY + height);
  bar.addColorStop(0, 'rgba(126, 137, 147, 0.95)');
  bar.addColorStop(0.45, 'rgba(62, 72, 81, 0.95)');
  bar.addColorStop(1, 'rgba(34, 41, 48, 0.9)');
  ctx.fillStyle = bar;
  roundRectPath(ctx, -half * 0.84, m.hingeY - height * 0.55, half * 1.68, height * 1.1, height * 0.55);
  ctx.fill();
}

/* ── dust ───────────────────────────────────────────────────────────────── */

const DUST = Array.from({ length: 26 }, (_, index) => ({
  x: hash(index * 1.7) * 2 - 1,
  y: hash(index * 3.1 + 5),
  r: 0.7 + hash(index * 5.3) * 1.5,
  speed: 0.008 + hash(index * 7.7) * 0.016,
  phase: hash(index * 11.3) * TAU,
}));

/** Motes drifting up through the light in front of the display. */
function drawDust(
  ctx: CanvasRenderingContext2D,
  m: LaptopMetrics,
  time: number,
  width: number,
  reveal: number,
) {
  if (reveal < 0.35) return;
  const spanX = Math.min(width * 0.46, m.lidW * 0.62);
  const topY = m.screenTop - m.lidH * 0.1;
  const spanY = m.lidH + m.deckDepth * 0.9;
  ctx.save();
  for (const mote of DUST) {
    const y = topY + (((mote.y + time * mote.speed) % 1) + 1) % 1 * spanY;
    const x = mote.x * spanX * (0.75 + 0.25 * Math.sin(time * 0.4 + mote.phase));
    const twinkle = 0.5 + 0.5 * Math.sin(time * 1.3 + mote.phase);
    ctx.globalAlpha = (0.06 + twinkle * 0.16) * reveal;
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
