/**
 * Pixel-art exploded view: a display, taken apart.
 *
 * Everything is drawn on an integer pixel grid — there are no curves, no
 * anti-aliased edges and no image assets. The art lives in a small design
 * space (the panel is 104 × 62 units) and the camera fits it to the canvas, so
 * one set of numbers works from a phone to a 4K monitor.
 *
 * The layout is a function of a single value: `explode` (0 = assembled,
 * 1 = fully separated). The panel stays at the top and the parts slide out
 * from behind it, in the order you would actually take the thing apart.
 */

export type PartId = 'panel' | 'diffuser' | 'board' | 'power' | 'shell' | 'stand';

export interface PartSpec {
  id: PartId;
  /** Width / height in design units. */
  w: number;
  h: number;
  /** Top edge when assembled and when fully exploded. */
  baseY: number;
  openY: number;
}

export const PANEL_W = 104;
export const PANEL_H = 62;
const BEZEL = 3;
const CHIN = 6;

/** Front to back, in the order the parts come off. */
export const PARTS: PartSpec[] = [
  { id: 'panel', w: PANEL_W, h: PANEL_H, baseY: 0, openY: 0 },
  { id: 'diffuser', w: 100, h: 26, baseY: 0, openY: 66 },
  { id: 'board', w: 84, h: 26, baseY: 0, openY: 94 },
  { id: 'power', w: 62, h: 22, baseY: 0, openY: 122 },
  { id: 'shell', w: 104, h: 22, baseY: 0, openY: 146 },
  { id: 'stand', w: 52, h: 20, baseY: 56, openY: 172 },
];

export interface Camera {
  /** Device pixels per design unit. */
  s: number;
  /** Device-space position of design-space origin. */
  ox: number;
  oy: number;
}

export interface PartBox {
  id: PartId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PixelLayout {
  camera: Camera;
  parts: PartBox[];
  /** Art bounds in device pixels, for debugging and for the dust field. */
  bounds: { x: number; y: number; w: number; h: number };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ease the separation so the parts accelerate out and settle gently. */
function easeInOut(raw: number) {
  return raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
}

/**
 * Separation for a scroll position: closed until 0.08, open by 0.44, held
 * through the three chapters, then shut again between 0.66 and 0.92 so the
 * closing line lands on an assembled machine.
 */
export function explodeAt(progress: number) {
  const rise = clamp01((progress - 0.08) / 0.3);
  const fall = clamp01((progress - 0.66) / 0.26);
  return easeInOut(clamp01(rise - fall));
}

/**
 * Where everything sits for a given canvas size and separation.
 * `w`/`h` are CSS pixels inside the canvas box.
 */
export function pixelLayout(w: number, h: number, explode: number, stacked = false): PixelLayout {
  const e = clamp01(explode);

  // Every part moves on the same clock, so the stack can never pass through
  // itself: the order of the parts is the order of the drawing.
  const parts = PARTS.map(part => {
    const y = part.baseY + (part.openY - part.baseY) * e;
    return { id: part.id, x: (PANEL_W - part.w) / 2, y, w: part.w, h: part.h };
  });

  // The drawing grows downward as the parts come out, so the camera pulls
  // back and the panel keeps its place at the top of the frame.
  let top = Infinity;
  let bottom = -Infinity;
  for (const part of parts) {
    top = Math.min(top, part.y);
    bottom = Math.max(bottom, part.y + part.h);
  }
  const artH = bottom - top;
  const artW = PANEL_W;

  const widthRoom = w * (stacked ? 0.98 : 0.94);
  const heightRoom = h * (stacked ? 0.9 : 0.84);
  const s = Math.min(widthRoom / artW, heightRoom / artH);

  const oy = h * 0.5 - (artH * s) / 2 - top * s;
  const ox = w / 2 - (artW * s) / 2;

  return {
    camera: { s, ox, oy },
    parts,
    bounds: { x: ox, y: oy, w: artW * s, h: artH * s },
  };
}

/* ── 5 × 7 pixel font ─────────────────────────────────────────────────────
   One hex digit per row, five bits wide. Only what the art needs. */

const FONT: Record<string, string> = {
  A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1c12111111121c',
  E: '1f10101e10101f', F: '1f10101e101010', G: '0e11101711110f', H: '1111111f111111',
  I: '1f04040404041f', J: '0702020202120c', K: '11121418141211', L: '1010101010101f',
  M: '111b1515111111', N: '11191915131311', O: '0e11111111110e', P: '1e11111e101010',
  Q: '0e11111115120d', R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404',
  U: '1111111111110e', V: '11111111110a04', W: '11111115151b11', X: '11110a040a1111',
  Y: '11110a04040404', Z: '1f01020408101f',
  0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e',
  4: '02060a121f0202', 5: '1f101e0101110e', 6: '0608101e11110e', 7: '1f010204080808',
  8: '0e11110e11110e', 9: '0e11110f01020c',
  ' ': '00000000000000', '.': '00000000000c0c', '-': '0000001f000000',
  '/': '01010204081010', ':': '000c0c000c0c00', '·': '0000000c0c0000', '+': '0004041f040400',
};

export interface Painter {
  s: number;
  ox: number;
  oy: number;
}

const X = (p: Painter, v: number) => Math.round(p.ox + v * p.s);
const Y = (p: Painter, v: number) => Math.round(p.oy + v * p.s);
const L = (p: Painter, v: number) => Math.max(1, Math.round(v * p.s));

export function box(ctx: CanvasRenderingContext2D, p: Painter, x: number, y: number, w: number, h: number, color: string) {
  const x0 = X(p, x);
  const y0 = Y(p, y);
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, Math.max(1, X(p, x + w) - x0), Math.max(1, Y(p, y + h) - y0));
}

/** Checkerboard shading, two design units apart. */
export function dither(
  ctx: CanvasRenderingContext2D,
  p: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  offset = 0,
) {
  ctx.fillStyle = color;
  const dot = L(p, 1);
  for (let j = 0; j < h; j += 2) {
    for (let i = j % 4 === 0 ? offset : 1 - offset; i < w; i += 2) {
      ctx.fillRect(X(p, x + i), Y(p, y + j), dot, dot);
    }
  }
}

/** Width of a run of pixel text, in design units. */
const textWidth = (value: string, unit: number) => value.length * 6 * unit - unit;

/** A blocky circle, drawn as horizontal spans. */
function disc(ctx: CanvasRenderingContext2D, p: Painter, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let j = -r; j <= r; j += 1) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
    box(ctx, p, cx - span, cy + j, span * 2 + 1, 1, color);
  }
}

/** Run-merged pixel text, snapped to the device grid. */
export function text(
  ctx: CanvasRenderingContext2D,
  p: Painter,
  value: string,
  x: number,
  y: number,
  unit: number,
  color: string,
) {
  const px = Math.round(unit * p.s);
  // Below this the glyphs are noise rather than information.
  if (px < 1.4) return;
  let cx = X(p, x);
  const cy = Y(p, y);
  ctx.fillStyle = color;
  for (const ch of value.toUpperCase()) {
    const glyph = FONT[ch] ?? FONT['.'];
    for (let row = 0; row < 7; row += 1) {
      const bits = parseInt(glyph.slice(row * 2, row * 2 + 2), 16);
      let run = -1;
      for (let col = 0; col <= 5; col += 1) {
        const on = col < 5 && (bits & (16 >> col)) !== 0;
        if (on && run < 0) run = col;
        if (!on && run >= 0) {
          ctx.fillRect(cx + run * px, cy + row * px, (col - run) * px, px);
          run = -1;
        }
      }
    }
    cx += 6 * px;
  }
}

/* ── Parts ─────────────────────────────────────────────────────────────── */

const C = {
  edgeDark: '#05080a',
  metalDeep: '#1b2127',
  metal: '#39424a',
  metalLight: '#5a656e',
  metalHi: '#828d96',
  glass: '#06141a',
  accent: '#6cdee8',
  accentDim: '#2e93a0',
  pcb: '#12352c',
  pcbEdge: '#0a211b',
  trace: '#1d6149',
  chip: '#090d10',
  pin: '#96a1a7',
  gold: '#c6a45d',
  sheet: '#9aa9ae',
  sheetHi: '#ccdadd',
  white: '#eaf2f4',
};

/**
 * What the screen is showing: the five services, one per row, set big enough
 * to stay legible when the machine is apart and the whole drawing is small.
 * Nothing here is a metric we cannot back up — it is a menu, not a dashboard.
 */
function drawScreen(
  ctx: CanvasRenderingContext2D,
  p: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  explode: number,
) {
  const dim = 1 - explode * 0.3;

  // Header: wordmark and a live dot.
  box(ctx, p, x, y, w, 7, 'rgba(9, 24, 29, 0.9)');
  text(ctx, p, 'DEVZARD', x + 3, y + 1.2, 0.72, C.white);
  // Right-aligned, measured, so it can never run over the bezel.
  text(ctx, p, 'LIVE', x + w - 3 - textWidth('LIVE', 0.6), y + 1.4, 0.6, C.accent);
  box(ctx, p, x + w - 5.6 - textWidth('LIVE', 0.6), y + 3.2, 1.6, 1.6, C.accent);
  box(ctx, p, x, y + 7, w, 0.5, 'rgba(108,222,232,0.2)');

  // The menu: five services, front to back. The marker steps down the list on
  // the same clock as the dust, so the screen keeps choosing the next one.
  const rows: string[] = ['SOFTWARE', 'HOSTING', 'ERP', 'AI AUTOMATION', 'DESIGN'];
  const active = Math.floor(time / 1400) % rows.length;
  rows.forEach((label, index) => {
    const ry = y + 9 + index * 8;
    const on = index === active;
    box(ctx, p, x + 3, ry, w - 6, 7, on ? 'rgba(20, 49, 57, 0.95)' : 'rgba(13, 31, 37, 0.9)');
    box(ctx, p, x + 3, ry, w - 6, 0.4, on ? 'rgba(108,222,232,0.4)' : 'rgba(108,222,232,0.14)');
    box(ctx, p, x + 4, ry + (on ? 1.5 : 1.8), 1.2, on ? 4 : 3.2, on ? C.accent : C.accentDim);
    text(ctx, p, label, x + 8, ry + 1.6, 0.62, on ? C.white : 'rgba(214,228,232,0.82)');
  });

  // Footer: a pipeline bar that breathes with the clock.
  const footY = y + h - 4;
  box(ctx, p, x + 3, footY, w - 6, 0.4, 'rgba(255,255,255,0.1)');
  const fill = 0.42 + 0.26 * (0.5 + 0.5 * Math.sin(time * 0.0006));
  box(ctx, p, x + 3, footY + 1.4, (w - 6) * fill, 1, `rgba(108,222,232,${0.7 * dim})`);

  // Vignette.
  dither(ctx, p, x, y + h - 3, w, 3, 'rgba(0,0,0,0.16)', 1);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  p: Painter,
  part: PartBox,
  copy: number,
  explode: number,
  time: number,
) {
  const { x, y, w, h } = part;
  // Body.
  box(ctx, p, x, y, w, h, '#131a20');
  box(ctx, p, x, y, w, 1, C.metalLight);
  box(ctx, p, x, y + h - 1, w, 1, '#0c1116');
  box(ctx, p, x + w - 1, y, 1, h, C.metalDeep);
  box(ctx, p, x, y + 1, 0.5, h - 2, '#232b32');
  box(ctx, p, x + w - 1.5, y + 1, 0.5, h - 2, '#0a0e12');

  const gx = x + BEZEL;
  const gy = y + BEZEL;
  const gw = w - BEZEL * 2;
  const gh = h - BEZEL - CHIN;

  // Glass.
  box(ctx, p, gx, gy, gw, gh, C.glass);

  // Screen glow — the one soft edge in the drawing, because it is light.
  const cx = X(p, gx + gw * 0.36);
  const cy = Y(p, gy + gh * 0.3);
  const radius = Math.max(2, L(p, gw * 0.66));
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const strength = (0.25 + 0.55 * copy) * (1 - explode * 0.4);
  glow.addColorStop(0, `rgba(64, 201, 214, ${0.15 * strength})`);
  glow.addColorStop(0.55, `rgba(42, 120, 132, ${0.09 * strength})`);
  glow.addColorStop(1, 'rgba(6, 20, 26, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(X(p, gx), Y(p, gy), L(p, gw), L(p, gh));

  drawScreen(ctx, p, gx, gy, gw, gh, time, explode);

  // Glass edge catchlight.
  box(ctx, p, gx, gy, gw, 0.5, 'rgba(198,235,240,0.2)');
  box(ctx, p, gx, gy, 0.5, gh, 'rgba(198,235,240,0.1)');

  // Chin: status LED.
  const chinY = y + h - CHIN;
  box(ctx, p, x + BEZEL, chinY, w - BEZEL * 2, 1, '#0d1317');
  box(ctx, p, x + w - 8, chinY + 2.5, 1.5, 1.5, C.accentDim);
}

function drawDiffuser(ctx: CanvasRenderingContext2D, p: Painter, part: PartBox) {
  const { x, y, w, h } = part;
  box(ctx, p, x, y, w, h, C.sheet);
  box(ctx, p, x, y, w, 1, C.sheetHi);
  box(ctx, p, x, y + h - 1, w, 1, '#7f8d92');
  box(ctx, p, x + w - 1, y + 1, 1, h - 1, '#98a5aa');
  dither(ctx, p, x + 2, y + 2, w - 4, h - 4, 'rgba(255,255,255,0.3)');

  // LED array along the long edges, and the light guide between them.
  for (let i = 6; i < w - 6; i += 8) {
    box(ctx, p, x + i, y + 2, 2, 1, C.accentDim);
    box(ctx, p, x + i, y + h - 3, 2, 1, C.accentDim);
  }
  box(ctx, p, x + 4, y + h * 0.5 - 0.5, w - 8, 0.5, 'rgba(255,255,255,0.45)');
  box(ctx, p, x + 4, y + h * 0.5 + 1.5, w - 8, 0.5, 'rgba(120,140,146,0.35)');
  text(ctx, p, 'SOFTWARE', x + 5, y + h - 9, 0.5, '#4d5a5f');
}

function drawBoard(ctx: CanvasRenderingContext2D, p: Painter, part: PartBox) {
  const { x, y, w, h } = part;
  box(ctx, p, x, y, w, h, C.pcb);
  box(ctx, p, x, y, w, 1, '#1d4a3a');
  box(ctx, p, x, y + h - 1, w, 1, C.pcbEdge);
  box(ctx, p, x + w - 1, y + 1, 1, h - 1, C.pcbEdge);

  // Mounting holes.
  for (const [hx, hy] of [
    [3, 3],
    [w - 6, 3],
    [3, h - 6],
    [w - 6, h - 6],
  ]) {
    box(ctx, p, x + hx, y + hy, 3, 3, C.pcbEdge);
    box(ctx, p, x + hx + 1, y + hy + 1, 1, 1, C.edgeDark);
    box(ctx, p, x + hx, y + hy - 0.5, 3, 0.5, '#2f6b53');
  }

  // Traces.
  for (const ty of [7, 11, 15, 20, 23]) {
    box(ctx, p, x + 8, y + ty, w - 20, 0.5, C.trace);
  }
  for (const tx of [20, 28, 44, 56, 68]) {
    box(ctx, p, x + tx, y + 5, 0.5, h - 11, C.trace);
  }

  // Processor and its pins.
  box(ctx, p, x + 30, y + 7, 17, 13, C.chip);
  box(ctx, p, x + 30, y + 7, 17, 1, '#222c31');
  box(ctx, p, x + 36, y + 10, 5, 4, C.accentDim);
  for (let i = 0; i < 6; i += 1) {
    box(ctx, p, x + 31 + i * 2.6, y + 20, 1, 1, C.pin);
    box(ctx, p, x + 31 + i * 2.6, y + 6, 1, 1, C.pin);
    box(ctx, p, x + 29, y + 9 + i * 2, 1, 1, C.pin);
    box(ctx, p, x + 47, y + 9 + i * 2, 1, 1, C.pin);
  }

  // Small chips, passives, connector.
  box(ctx, p, x + 8, y + 17, 11, 6, C.chip);
  for (let i = 0; i < 4; i += 1) box(ctx, p, x + 9 + i * 2.6, y + 16, 1, 1, C.pin);
  box(ctx, p, x + 52, y + 17, 6, 5, C.chip);
  for (let i = 0; i < 5; i += 1) box(ctx, p, x + 22 + i * 2, y + 13, 1, 3, C.pin);
  box(ctx, p, x + 74, y + 6, 6, 9, '#262d33');
  for (let i = 0; i < 4; i += 1) box(ctx, p, x + 75, y + 7 + i * 2, 4, 1, C.gold);

  text(ctx, p, 'HOSTING', x + 5, y + 3.4, 0.45, 'rgba(210,232,226,0.5)');
}

function drawPower(ctx: CanvasRenderingContext2D, p: Painter, part: PartBox) {
  const { x, y, w, h } = part;
  box(ctx, p, x, y, w, h, C.pcb);
  box(ctx, p, x, y, w, 1, '#1d4a3a');
  box(ctx, p, x, y + h - 1, w, 1, C.pcbEdge);
  box(ctx, p, x + w - 1, y + 1, 1, h - 1, C.pcbEdge);

  // Transformer.
  box(ctx, p, x + 5, y + 6, 13, h - 11, '#2a2f33');
  box(ctx, p, x + 5, y + 6, 13, 1, '#4a5257');
  for (let i = 0; i < 3; i += 1) box(ctx, p, x + 7, y + 9 + i * 4, 9, 1, '#171c1f');

  // Capacitors.
  disc(ctx, p, x + 27, y + h * 0.5, 5, '#3f4a51');
  disc(ctx, p, x + 27, y + h * 0.5, 3, '#2a3238');
  box(ctx, p, x + 27, y + h * 0.5 - 7, 1, 2, C.pin);
  disc(ctx, p, x + 38, y + h * 0.5 + 1, 4, '#3f4a51');
  disc(ctx, p, x + 38, y + h * 0.5 + 1, 2, '#2a3238');

  // Regulators and connector.
  box(ctx, p, x + 46, y + 5, 8, 3, C.chip);
  for (let i = 0; i < 3; i += 1) box(ctx, p, x + 47 + i * 2.5, y + 8, 1, 1, C.pin);
  box(ctx, p, x + 45, y + 12, 8, 6, '#262d33');
  for (let i = 0; i < 3; i += 1) box(ctx, p, x + 46, y + 13 + i * 2, 6, 1, C.gold);

  text(ctx, p, 'ERP', x + 5, y + 1.4, 0.45, 'rgba(210,232,226,0.4)');
}

function drawShell(ctx: CanvasRenderingContext2D, p: Painter, part: PartBox) {
  const { x, y, w, h } = part;
  box(ctx, p, x, y, w, h, C.metal);
  box(ctx, p, x, y, w, 1, C.metalHi);
  box(ctx, p, x, y + h - 1, w, 1, C.metalDeep);
  box(ctx, p, x, y, 1, h, C.metalLight);
  box(ctx, p, x + w - 1, y, 1, h, C.metalDeep);
  dither(ctx, p, x + 3, y + h - 9, w - 6, 7, 'rgba(0,0,0,0.13)', 1);

  // Vent slots.
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 11; i += 1) {
      box(ctx, p, x + 14 + i * 7, y + 5 + row * 4, 4, 1.5, '#141a1f');
    }
  }

  // Screw bosses.
  for (const [bx, by] of [
    [4, 3],
    [w - 7, 3],
    [4, h - 6],
    [w - 7, h - 6],
  ]) {
    box(ctx, p, x + bx, y + by, 3, 3, C.metalHi);
    box(ctx, p, x + bx + 1, y + by, 1, 3, C.metalDeep);
    box(ctx, p, x + bx, y + by + 1, 3, 1, C.metalDeep);
  }

  box(ctx, p, x + 12, y + h - 3.5, w - 24, 0.5, 'rgba(20,26,31,0.5)');
  text(ctx, p, 'AI AUTOMATION', x + 12, y + 14, 0.42, 'rgba(14,20,24,0.72)');
}

function drawStand(ctx: CanvasRenderingContext2D, p: Painter, part: PartBox) {
  const { x, y, w } = part;
  // Neck.
  box(ctx, p, x + w / 2 - 6, y, 12, 12, C.metal);
  box(ctx, p, x + w / 2 - 6, y, 1, 12, C.metalLight);
  box(ctx, p, x + w / 2 + 5, y, 1, 12, C.metalDeep);
  // Base.
  box(ctx, p, x, y + 12, w, 5, '#2d343b');
  box(ctx, p, x, y + 12, w, 1, C.metalLight);
  box(ctx, p, x, y + 16, w, 1, C.edgeDark);
  box(ctx, p, x + 2, y + 14, 6, 1, 'rgba(255,255,255,0.12)');
  text(ctx, p, 'DESIGN', x + 3, y + 13.6, 0.34, 'rgba(220,232,236,0.42)');
}

/* ── Ambient ───────────────────────────────────────────────────────────── */

const DUST = [
  [0.12, 0.28, 0.9], [0.3, 0.62, 1.4], [0.46, 0.18, 0.6], [0.58, 0.74, 1.1],
  [0.72, 0.36, 0.8], [0.86, 0.58, 1.3], [0.2, 0.82, 0.7], [0.66, 0.12, 1.0],
  [0.92, 0.24, 0.5], [0.4, 0.9, 0.9], [0.8, 0.86, 1.2], [0.08, 0.55, 0.4],
];

function drawDust(ctx: CanvasRenderingContext2D, p: Painter, frame: PixelFrame) {
  const unit = Math.max(1, Math.round(p.s * 0.5));
  const w = frame.width;
  const h = frame.height;
  for (let i = 0; i < DUST.length; i += 1) {
    const [dx, dy, speed] = DUST[i];
    const drift = (frame.time * speed * 0.006 + i * 0.37) % 1;
    const x = Math.round(dx * w + Math.sin(frame.time * 0.0004 + i) * 12 + (dy - 0.5) * 8);
    const y = Math.round((1 - drift) * h);
    const alpha = 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(frame.time * 0.001 + i));
    ctx.fillStyle = `rgba(140, 200, 210, ${alpha})`;
    ctx.fillRect(x, y, unit, unit);
  }
}

/* ── Frame ─────────────────────────────────────────────────────────────── */

export interface PixelFrame {
  width: number;
  height: number;
  dpr: number;
  /** 0 = assembled, 1 = fully apart. */
  explode: number;
  /** Hero copy presence, 0–1. Drives the screen glow. */
  copy: number;
  time: number;
  /** Pointer parallax, −1…1. */
  px: number;
  py: number;
  still?: boolean;
  /** True when the stage is in the stacked (narrow) layout. */
  stacked?: boolean;
}

export function drawPixelScene(ctx: CanvasRenderingContext2D, frame: PixelFrame) {
  const { width, height, dpr } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  if (width < 2 || height < 2) return;

  const e = clamp01(frame.explode);
  const layout = pixelLayout(width, height, e, frame.stacked);
  const sway = frame.still ? 0 : 1;
  const camera: Camera = {
    s: layout.camera.s,
    ox: layout.camera.ox + frame.px * 3 * sway,
    oy: layout.camera.oy + frame.py * 2 * sway,
  };
  const p: Painter = camera;
  const byId = new Map(layout.parts.map(part => [part.id, part]));

  // Floor shadow under the machine, sized from the drawing itself.
  const artBottom = layout.bounds.y + layout.bounds.h;
  const shadowW = layout.bounds.w * 0.62;
  const shadowX = layout.bounds.x + (layout.bounds.w - shadowW) / 2;
  for (let j = 0; j < 4; j += 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.4 - j * 0.09})`;
    const inset = j * 2.5;
    ctx.fillRect(
      Math.round(shadowX + inset),
      Math.round(artBottom + 3 + j),
      Math.round(shadowW - inset * 2),
      Math.max(1, Math.round(p.s)),
    );
  }

  // Back to front: the panel is nearest the viewer, the stand sits under it.
  const shell = byId.get('shell');
  const power = byId.get('power');
  const board = byId.get('board');
  const diffuser = byId.get('diffuser');
  const panel = byId.get('panel');
  const stand = byId.get('stand');

  if (e > 0.01) {
    // A soft shadow under each plate gives the stack its depth.
    for (const part of [diffuser, board, power, shell]) {
      if (!part) continue;
      box(ctx, p, part.x + 2, part.y - 1.5, part.w, 1, `rgba(0,0,0,${0.28 * e})`);
    }
    if (shell) drawShell(ctx, p, shell);
    if (power) drawPower(ctx, p, power);
    if (board) drawBoard(ctx, p, board);
    if (diffuser) drawDiffuser(ctx, p, diffuser);
  }

  if (panel) drawPanel(ctx, p, panel, frame.copy, e, frame.time);
  if (stand) drawStand(ctx, p, stand);

  // The edge light that links the plates while they are apart.
  if (e > 0.05) {
    ctx.fillStyle = `rgba(108, 222, 232, ${0.1 * e})`;
    const spineX = X(p, PANEL_W / 2);
    const top = Y(p, 4);
    const bottom = Y(p, (PARTS[4].openY + PARTS[4].h) * e);
    ctx.fillRect(spineX, top, Math.max(1, Math.round(p.s * 0.35)), Math.max(1, bottom - top));
  }

  if (!frame.still) drawDust(ctx, p, frame);
}

/** One assembled frame, used by the reduced-motion variant. */
export function drawPixelStill(ctx: CanvasRenderingContext2D, frame: Omit<PixelFrame, 'explode'>) {
  drawPixelScene(ctx, { ...frame, explode: 0, copy: 1, px: 0, py: 0, still: true, time: 0 });
}
