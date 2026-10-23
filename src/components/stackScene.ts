/**
 * Pixel-art software stack: four layers of one system, drawn on the same grid
 * as the hero.
 *
 * Frontend sits on top, then the backend, then the database, with security as
 * the layer underneath all three. Assembled the four plates touch and read as
 * one machine; on scroll they separate so each can be named, and a data packet
 * keeps travelling down through them the whole time.
 */

import { box, dither, text, type Painter } from './pixelScene';

export type LayerId = 'frontend' | 'backend' | 'database' | 'security';

interface LayerSpec {
  id: LayerId;
  /** Width / height in design units. */
  w: number;
  h: number;
  /** Top edge when the stack is closed and when it is fully separated. */
  closedY: number;
  openY: number;
  /** Label etched into the plate. */
  name: string;
}

const W = 100;

export const LAYERS: LayerSpec[] = [
  { id: 'frontend', w: 96, h: 26, closedY: 0, openY: 0, name: 'FRONTEND' },
  { id: 'backend', w: 88, h: 24, closedY: 24, openY: 38, name: 'BACKEND' },
  { id: 'database', w: 72, h: 26, closedY: 46, openY: 74, name: 'DATABASE' },
  { id: 'security', w: 84, h: 20, closedY: 70, openY: 112, name: 'SECURITY' },
];

const C = {
  ink: '#05080a',
  slab: '#131a20',
  edge: '#39424a',
  hi: '#828d96',
  low: '#0b1014',
  accent: '#6cdee8',
  accentDim: '#2e93a0',
  white: '#eaf2f4',
  muted: 'rgba(160,190,196,0.75)',
  pcb: '#12352c',
  pcbEdge: '#0a211b',
  trace: '#1d6149',
  chip: '#090d10',
  pin: '#96a1a7',
  screen: '#06141a',
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function stackExplode(progress: number) {
  const rise = clamp01((progress - 0.04) / 0.26);
  const fall = clamp01((progress - 0.9) / 0.1);
  return clamp01(rise - fall);
}

export interface StackPart {
  id: LayerId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StackLayout {
  s: number;
  ox: number;
  oy: number;
  parts: StackPart[];
  bounds: { x: number; y: number; w: number; h: number };
}

export function stackLayout(width: number, height: number, explode: number): StackLayout {
  const e = clamp01(explode);
  const parts = LAYERS.map(layer => ({
    id: layer.id,
    name: layer.name,
    x: (W - layer.w) / 2,
    y: layer.closedY + (layer.openY - layer.closedY) * e,
    w: layer.w,
    h: layer.h,
  }));

  let top = Infinity;
  let bottom = -Infinity;
  for (const part of parts) {
    top = Math.min(top, part.y);
    bottom = Math.max(bottom, part.y + part.h);
  }
  const artH = bottom - top;
  const s = Math.min((width * 0.94) / W, (height * 0.9) / artH);
  const ox = width / 2 - (W * s) / 2;
  const oy = height * 0.5 - (artH * s) / 2 - top * s;

  return { s, ox, oy, parts, bounds: { x: ox, y: oy, w: W * s, h: artH * s } };
}

/* ── Painters ──────────────────────────────────────────────────────────── */

/** Shared plate: body, bevels and a shadow underneath. */
function slab(ctx: CanvasRenderingContext2D, p: Painter, part: StackPart, active: boolean, explode: number) {
  const { x, y, w, h } = part;
  if (explode > 0.02) {
    box(ctx, p, x + 2, y - 1.6, w, 1.2, `rgba(0,0,0,${0.3 * explode})`);
  }
  box(ctx, p, x, y, w, h, C.slab);
  box(ctx, p, x, y, w, 0.8, active ? C.accent : C.edge);
  box(ctx, p, x, y + h - 0.8, w, 0.8, C.low);
  box(ctx, p, x, y, 0.6, h, '#232b32');
  box(ctx, p, x + w - 0.6, y, 0.6, h, C.low);

  // Active layer gets a keyline and a live marker, so the chapter and the
  // drawing always point at the same plate.
  if (active) {
    box(ctx, p, x - 0.8, y - 0.8, w + 1.6, 0.6, C.accent);
    box(ctx, p, x - 0.8, y + h + 0.2, w + 1.6, 0.6, C.accent);
    box(ctx, p, x - 0.8, y - 0.8, 0.6, h + 1.6, C.accent);
    box(ctx, p, x + w + 0.2, y - 0.8, 0.6, h + 1.6, C.accent);
    box(ctx, p, x + w + 2.4, y + 1.4, 2.2, 1.2, C.accent);
  }
}

function drawFrontend(ctx: CanvasRenderingContext2D, p: Painter, part: StackPart, active: boolean, time: number) {
  const { x, y, w, h } = part;
  slab(ctx, p, part, active, 0.4);

  // Browser chrome.
  const bx = x + 4;
  const by = y + 4;
  const bw = w - 8;
  const bh = h - 8;
  box(ctx, p, bx, by, bw, bh, C.screen);
  box(ctx, p, bx, by, bw, 3.4, '#0d2128');
  box(ctx, p, bx, by + 3.4, bw, 0.4, 'rgba(108,222,232,0.25)');
  for (let i = 0; i < 3; i += 1) {
    box(ctx, p, bx + 2 + i * 2.4, by + 1.2, 1.2, 1.2, i === 0 ? C.accentDim : '#31434a');
  }
  text(ctx, p, 'DEVZARD.COM', bx + 11, by + 0.8, 0.42, 'rgba(190,214,220,0.7)');

  // Page: a hero block, two cards, a CTA.
  box(ctx, p, bx + 2, by + 5.4, bw * 0.5, 5, '#122c34');
  box(ctx, p, bx + 2, by + 11, bw * 0.5, 1.2, 'rgba(108,222,232,0.45)');
  box(ctx, p, bx + 2, by + 13, bw * 0.34, 1, 'rgba(160,190,196,0.3)');
  const cards = 3;
  for (let i = 0; i < cards; i += 1) {
    const cw = (bw - 6) / cards;
    box(ctx, p, bx + 2 + i * cw, by + 5.4, cw - 1.4, bh - 7, 'rgba(16,42,50,0.85)');
    box(ctx, p, bx + 2.6 + i * cw, by + 7, 2, 2, C.accentDim);
    box(ctx, p, bx + 2.6 + i * cw, by + 10.4, cw - 4, 0.8, 'rgba(200,226,232,0.28)');
    box(ctx, p, bx + 2.6 + i * cw, by + 12, cw - 5.5, 0.8, 'rgba(200,226,232,0.16)');
  }

  // Cursor blinks slowly, like someone is reading the page.
  if (Math.floor(time / 700) % 2 === 0) {
    box(ctx, p, bx + 3, by + bh - 4.4, 0.8, 2.4, C.accent);
  }
}

function drawBackend(ctx: CanvasRenderingContext2D, p: Painter, part: StackPart, active: boolean, time: number) {
  const { x, y, w } = part;
  slab(ctx, p, part, active, 0.4);

  // Three server units, stacked, with a blinking activity LED.
  const ux = x + 4;
  const uw = w * 0.46;
  for (let i = 0; i < 3; i += 1) {
    const uy = y + 3 + i * 5;
    box(ctx, p, ux, uy, uw, 4.2, '#20272d');
    box(ctx, p, ux, uy, uw, 0.5, '#3d474f');
    box(ctx, p, ux + 1.4, uy + 1.4, 1.4, 1.4, (Math.floor(time / 400) + i) % 3 === 0 ? C.accent : C.accentDim);
    for (let v = 0; v < 4; v += 1) {
      box(ctx, p, ux + 5 + v * 2.4, uy + 1.4, 1.4, 1.4, 'rgba(120,140,148,0.35)');
    }
    box(ctx, p, ux + uw - 4, uy + 1.2, 2.4, 1.8, 'rgba(108,222,232,0.22)');
  }

  // Request lines running from the edge into a routing block.
  for (let i = 0; i < 4; i += 1) {
    const ly = y + 4 + i * 4;
    box(ctx, p, ux + uw + 3, ly, 8, 0.6, C.trace);
    box(ctx, p, ux + uw + 11, ly, 0.6, 3, C.trace);
  }
  box(ctx, p, x + w * 0.68, y + 6, w * 0.2, 10, C.pcb);
  box(ctx, p, x + w * 0.68, y + 6, w * 0.2, 0.5, '#1d4a3a');
  box(ctx, p, x + w * 0.68 + 3, y + 9, 4, 4, C.chip);
  box(ctx, p, x + w * 0.68 + 4, y + 10, 2, 2, C.accentDim);
  for (let i = 0; i < 4; i += 1) {
    box(ctx, p, x + w * 0.68 + 1.4, y + 7 + i * 2, 0.6, 1, C.pin);
  }

}

function drawDatabase(ctx: CanvasRenderingContext2D, p: Painter, part: StackPart, active: boolean, time: number) {
  const { x, y, w, h } = part;
  slab(ctx, p, part, active, 0.4);

  // Two disk drums: cap, body, platters.
  const drumW = w * 0.34;
  const drumH = h - 7;
  [0, 1].forEach(index => {
    const dx = x + 5 + index * (drumW + 5);
    const dy = y + 4;
    box(ctx, p, dx, dy + 1, drumW, drumH - 2, '#1b2730');
    box(ctx, p, dx + 0.8, dy, drumW - 1.6, 1.4, '#3b4a54');
    box(ctx, p, dx, dy + drumH - 1.4, drumW, 1.2, '#0d1519');
    for (let row = 0; row < 3; row += 1) {
      box(ctx, p, dx + 1.4, dy + 3 + row * 4, drumW - 2.8, 0.6, 'rgba(140,190,196,0.22)');
    }
    const lit = (Math.floor(time / 500) + index) % 2 === 0;
    box(ctx, p, dx + drumW - 3, dy + 2, 1.2, 1.2, lit ? C.accent : '#2e4a52');
  });

  // Rows of records and a query caret.
  const tx = x + w * 0.5;
  for (let row = 0; row < 5; row += 1) {
    box(ctx, p, tx, y + 4 + row * 3.6, w * 0.42, 2.2, row % 2 === 0 ? 'rgba(18,53,44,0.9)' : 'rgba(14,42,35,0.9)');
    box(ctx, p, tx + 1, y + 4.8 + row * 3.6, w * 0.16, 0.6, 'rgba(120,200,180,0.5)');
    box(ctx, p, tx + w * 0.2, y + 4.8 + row * 3.6, w * 0.1, 0.6, 'rgba(108,222,232,0.4)');
  }
  if (Math.floor(time / 600) % 2 === 0) {
    box(ctx, p, tx + w * 0.3, y + 22, 0.8, 1.6, C.accent);
  }

}

function drawSecurity(ctx: CanvasRenderingContext2D, p: Painter, part: StackPart, active: boolean, time: number) {
  const { x, y, w } = part;
  slab(ctx, p, part, active, 0.4);

  // Shield, drawn as spans so it stays on the pixel grid.
  const sx = x + 6;
  const sy = y + 2.2;
  const spans = [12, 12, 12, 12, 11, 10, 9, 8, 6, 5, 3, 2];
  spans.forEach((span, row) => {
    box(ctx, p, sx + (12 - span) / 2, sy + row, span, 1, row < 1 ? '#22323a' : '#182830');
  });
  // Keyhole.
  box(ctx, p, sx + 5, sy + 3.4, 2, 2, C.accentDim);
  box(ctx, p, sx + 5.6, sy + 5.4, 0.8, 2, C.accentDim);

  // Hashed rows: what a stored credential looks like.
  const hx = sx + 18;
  for (let row = 0; row < 4; row += 1) {
    const width = 16 + ((row * 7 + Math.floor(time / 900)) % 6);
    box(ctx, p, hx, sy + 1 + row * 3.4, width, 1.6, row === 0 ? 'rgba(108,222,232,0.4)' : 'rgba(120,160,168,0.25)');
  }

  // A lock indicator that pulses instead of a claim.
  if (Math.floor(time / 800) % 2 === 0) {
    box(ctx, p, x + w - 6, y + 3, 1.4, 1.4, C.accent);
  }

}

/* ── Frame ─────────────────────────────────────────────────────────────── */

export interface StackFrame {
  width: number;
  height: number;
  dpr: number;
  /** 0 = closed stack, 1 = fully separated. */
  explode: number;
  /** Which layer the current chapter is talking about. */
  active: number;
  time: number;
  still?: boolean;
}

export function drawStackScene(ctx: CanvasRenderingContext2D, frame: StackFrame) {
  const { width, height, dpr } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  if (width < 2 || height < 2) return;

  const e = clamp01(frame.explode);
  const layout = stackLayout(width, height, e);
  const p: Painter = { s: layout.s, ox: layout.ox, oy: layout.oy };
  const byId = new Map(layout.parts.map(part => [part.id, part]));

  // Floor shadow.
  const bottom = layout.bounds.y + layout.bounds.h;
  const shadowW = layout.bounds.w * 0.5 * (1 + e * 0.18);
  for (let j = 0; j < 4; j += 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.4 - j * 0.09})`;
    const inset = j * 2.5;
    ctx.fillRect(
      Math.round(layout.bounds.x + (layout.bounds.w - shadowW) / 2 + inset),
      Math.round(bottom + 3 + j),
      Math.round(shadowW - inset * 2),
      Math.max(1, Math.round(layout.s)),
    );
  }

  const active = frame.active;
  const security = byId.get('security');
  const database = byId.get('database');
  const backend = byId.get('backend');
  const frontend = byId.get('frontend');

  if (security) drawSecurity(ctx, p, security, active === 3, frame.time);
  if (database) drawDatabase(ctx, p, database, active === 2, frame.time);
  if (backend) drawBackend(ctx, p, backend, active === 1, frame.time);
  if (frontend) drawFrontend(ctx, p, frontend, active === 0, frame.time);

  // The packet: one request travelling down the stack and back up.
  if (!frame.still) {
    const span = layout.bounds.h;
    const cycle = (frame.time * 0.00022) % 1;
    const down = cycle < 0.62;
    const t = down ? cycle / 0.62 : 1 - (cycle - 0.62) / 0.38;
    const px = Math.round(layout.bounds.x + layout.bounds.w / 2);
    const py = Math.round(layout.bounds.y + span * t);
    const size = Math.max(2, Math.round(layout.s * 0.7));
    ctx.fillStyle = 'rgba(108,222,232,0.18)';
    ctx.fillRect(px - size * 2, py - size * 2, size * 5, size * 5);
    ctx.fillStyle = C.accent;
    ctx.fillRect(px, py, size, size);
    // Trail.
    ctx.fillStyle = 'rgba(108,222,232,0.35)';
    ctx.fillRect(px, Math.round(py - (down ? 6 : -6)), size, size);
  }

  // Ambient dust, kept very quiet so the diagram stays the subject.
  if (!frame.still) {
    for (let i = 0; i < 8; i += 1) {
      const drift = (frame.time * 0.004 + i * 0.37) % 1;
      const x = Math.round(((i * 0.13 + 0.08) % 1) * width);
      const y = Math.round((1 - drift) * height);
      const alpha = 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(frame.time * 0.001 + i));
      ctx.fillStyle = `rgba(140, 200, 210, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  void dither;
}
