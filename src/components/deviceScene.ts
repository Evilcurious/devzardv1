/**
 * Devzard scroll scene.
 *
 * Draws the hero "device" that separates into its engineering layers as the
 * visitor scrolls. Everything is vector art rendered to a 2D canvas, so there
 * is no image sequence to download and the scene stays crisp at any size.
 *
 * The scene is intentionally rendered in Devzard's own palette (charcoal,
 * cool greys, cyan light) and with a transparent background, so it blends into
 * the page instead of sitting in a coloured rectangle.
 *
 * Rendering is a pure function of (size, progress): the component decides when
 * to repaint, this module only knows how to paint one frame.
 */

export const SCENE = {
  /** Virtual design box the artwork is laid out in, in design units. */
  designWidth: 780,
  designHeight: 1000,
  /** Plate geometry, in design units. */
  plateWidth: 600,
  plateDepth: 110,
  plateRadius: 34,
  /** Distance between layer centres in the fully exploded state. */
  explodedPitch: 142,
  /** How many layers the device is built from. */
  layerCount: 6,
} as const;

const ACCENT = '#6cdee8';

/** Scroll progress (0–1 of the sticky track) → 0 assembled, 1 fully exploded. */
export function explodeAt(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.06) return 0;
  if (p < 0.44) return smoothstep((p - 0.06) / 0.38);
  if (p < 0.58) return 1;
  if (p < 0.96) return 1 - smoothstep((p - 0.58) / 0.38);
  return 0;
}

export interface DeviceSceneFrame {
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** Device pixel ratio used for the backing store. */
  dpr: number;
  /** Section scroll progress, 0–1. */
  progress: number;
  /** When true, skip ambient drift and draw the resting, assembled product. */
  reduced?: boolean;
}

export function drawDeviceScene(ctx: CanvasRenderingContext2D, frame: DeviceSceneFrame): void {
  const { width, height, dpr, progress, reduced } = frame;
  const explore = reduced ? 0 : explodeAt(progress);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  // Contain-fit with a small safety margin so no plate ever touches the edge.
  const scale = Math.min(width / SCENE.designWidth, height / SCENE.designHeight) * 0.94;
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);

  const layout = layoutLayers(explore, reduced ? 0 : progress);

  drawAmbient(ctx, explore);
  if (!reduced) drawParticles(ctx, progress);
  drawFloorShadow(ctx, layout, explore);
  drawConnectors(ctx, layout);
  // Bottom-up so upper plates overlap lower ones while the device is closed.
  for (let index = LAYERS.length - 1; index >= 0; index -= 1) {
    drawPlate(ctx, LAYERS[index], layout[index], index);
  }
  drawStatusLight(ctx, layout, progress);
}

/* ── layout ─────────────────────────────────────────────────────────────── */

interface LayerSpec {
  kind: 'shell' | 'display' | 'frame' | 'board' | 'core' | 'base';
  thickness: number;
  /** Deterministic sideways nudge when separated, so the stack has life. */
  drift: number;
}

const LAYERS: LayerSpec[] = [
  { kind: 'shell', thickness: 16, drift: 0 },
  { kind: 'display', thickness: 20, drift: 7 },
  { kind: 'frame', thickness: 22, drift: -9 },
  { kind: 'board', thickness: 18, drift: 8 },
  { kind: 'core', thickness: 14, drift: -6 },
  { kind: 'base', thickness: 30, drift: 0 },
];

interface LayerLayout {
  /** Top edge of the top face, in design units, relative to the scene centre. */
  top: number;
  /** Vertical travel of this layer, 0 assembled → 1 fully separated. */
  spread: number;
  driftX: number;
}

function layoutLayers(explode: number, progress: number): LayerLayout[] {
  const pitch = 1;
  const assembled: number[] = [];
  let cursor = 0;
  for (const layer of LAYERS) {
    assembled.push(cursor);
    cursor += layer.thickness + pitch;
  }

  const slab = (index: number) => SCENE.plateDepth + LAYERS[index].thickness;
  const assembledHeight = assembled[assembled.length - 1] + slab(LAYERS.length - 1);
  const centre = assembledHeight / 2;

  return LAYERS.map((layer, index) => {
    const from = assembled[index] + slab(index) / 2 - centre;
    const to = (index - (LAYERS.length - 1) / 2) * SCENE.explodedPitch;
    const spread = smoothstep((explode - index * 0.055) / 0.72);
    const centreY = from + (to - from) * spread;
    // A whisper of lateral drift so the exploded stack reads as engineering
    // rather than a perfectly stacked deck. Kept tiny to avoid misalignment.
    const driftX = layer.drift * spread * (0.55 + 0.45 * Math.sin(progress * Math.PI));
    return { top: centreY - slab(index) / 2, spread, driftX };
  });
}

/* ── scene chrome ───────────────────────────────────────────────────────── */

function drawAmbient(ctx: CanvasRenderingContext2D, explode: number) {
  const radius = 430 + explode * 90;
  const glow = ctx.createRadialGradient(0, -10, 20, 0, -10, radius);
  glow.addColorStop(0, 'rgba(64, 208, 226, 0.16)');
  glow.addColorStop(0.42, 'rgba(46, 164, 190, 0.07)');
  glow.addColorStop(1, 'rgba(10, 14, 18, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -10, radius, 0, Math.PI * 2);
  ctx.fill();

  // Faint horizon line that anchors the product in the composition.
  const horizon = ctx.createLinearGradient(-330, 0, 330, 0);
  horizon.addColorStop(0, 'rgba(108, 222, 232, 0)');
  horizon.addColorStop(0.5, 'rgba(108, 222, 232, 0.14)');
  horizon.addColorStop(1, 'rgba(108, 222, 232, 0)');
  ctx.strokeStyle = horizon;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-330, 0);
  ctx.lineTo(330, 0);
  ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, progress: number) {
  const random = mulberry32(20261023);
  for (let index = 0; index < 30; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 175 + random() * 170;
    const depth = 0.35 + random() * 0.65;
    const drift = Math.sin(progress * Math.PI * 2 + random() * Math.PI * 2) * 16;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.62 + drift;
    ctx.globalAlpha = 0.05 + depth * 0.16;
    ctx.fillStyle = index % 3 === 0 ? ACCENT : '#cfe0e6';
    ctx.beginPath();
    ctx.arc(x, y, 0.9 + depth * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloorShadow(ctx: CanvasRenderingContext2D, layout: LayerLayout[], explode: number) {
  const lowest = Math.max(...layout.map((layer, index) => layer.top + SCENE.plateDepth + LAYERS[index].thickness));
  const centreY = lowest + 54 + explode * 26;
  const width = 300 + explode * 90;
  const shadow = ctx.createRadialGradient(0, centreY, 10, 0, centreY, width);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${0.5 - explode * 0.16})`);
  shadow.addColorStop(0.55, `rgba(0, 0, 0, ${0.24 - explode * 0.08})`);
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.translate(0, centreY);
  ctx.scale(1, 0.2);
  ctx.translate(0, -centreY);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, centreY, width, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Slim alignment posts that appear in the gaps while the device is open. */
function drawConnectors(ctx: CanvasRenderingContext2D, layout: LayerLayout[]) {
  const offsets = [-208, -74, 74, 208];
  for (let index = 0; index < layout.length - 1; index += 1) {
    const upper = layout[index];
    const lower = layout[index + 1];
    const upperBottom = upper.top + SCENE.plateDepth + LAYERS[index].thickness;
    const gap = lower.top - upperBottom;
    const alpha = clamp01(gap / 90) * 0.55;
    if (gap < 6 || alpha <= 0.01) continue;

    for (const offset of offsets) {
      const x = offset + (upper.driftX + lower.driftX) / 2;
      const beam = ctx.createLinearGradient(0, upperBottom, 0, lower.top);
      beam.addColorStop(0, `rgba(108, 222, 232, ${alpha * 0.15})`);
      beam.addColorStop(0.5, `rgba(108, 222, 232, ${alpha})`);
      beam.addColorStop(1, `rgba(108, 222, 232, ${alpha * 0.15})`);
      ctx.strokeStyle = beam;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, upperBottom);
      ctx.lineTo(x, lower.top);
      ctx.stroke();

      ctx.fillStyle = `rgba(160, 240, 245, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, upperBottom, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStatusLight(ctx: CanvasRenderingContext2D, layout: LayerLayout[], progress: number) {
  if (progress < 0.9 && progress > 0.1) return;
  const base = layout[layout.length - 1];
  const y = base.top + SCENE.plateDepth + LAYERS[LAYERS.length - 1].thickness - 12;
  const pulse = 0.55 + 0.45 * Math.sin(progress * Math.PI * 6);
  ctx.save();
  ctx.shadowColor = `rgba(108, 222, 232, ${0.55 * pulse})`;
  ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(130, 240, 246, ${0.55 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.arc(248, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ── plates ─────────────────────────────────────────────────────────────── */

function drawPlate(ctx: CanvasRenderingContext2D, layer: LayerSpec, box: LayerLayout, index: number) {
  const x = -SCENE.plateWidth / 2;
  const width = SCENE.plateWidth;
  const depth = SCENE.plateDepth;
  const radius = SCENE.plateRadius;
  const thickness = layer.thickness;
  const y = box.top;

  ctx.save();
  ctx.translate(box.driftX, 0);

  // Contact shadow: gives each separated layer weight and depth.
  if (box.spread > 0.02) {
    const drop = ctx.createLinearGradient(0, y + depth + thickness, 0, y + depth + thickness + 26);
    drop.addColorStop(0, `rgba(0, 0, 0, ${0.24 * box.spread})`);
    drop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = drop;
    ctx.fillRect(x + radius * 0.4, y + depth + thickness, width - radius * 0.8, 26);
  }

  // Side band: the plate's edge thickness, always visible under the top face.
  ctx.save();
  ctx.translate(0, thickness);
  platePath(ctx, x, y, width, depth, radius);
  const edge = ctx.createLinearGradient(0, y, 0, y + depth + thickness);
  edge.addColorStop(0, edgeColor(layer.kind, 0));
  edge.addColorStop(1, edgeColor(layer.kind, 1));
  ctx.fillStyle = edge;
  ctx.fill();
  ctx.restore();

  // Top face.
  platePath(ctx, x, y, width, depth, radius);
  ctx.save();
  ctx.clip();
  paintFace(ctx, layer.kind, x, y, width, depth, box.spread);
  ctx.restore();

  // Ambient occlusion where the face meets its own rim.
  ctx.save();
  platePath(ctx, x, y, width, depth, radius);
  ctx.clip();
  const ao = ctx.createLinearGradient(0, y + depth - 26, 0, y + depth);
  ao.addColorStop(0, 'rgba(0, 0, 0, 0)');
  ao.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = ao;
  ctx.fillRect(x, y, width, depth);
  ctx.restore();

  // Rim light along the top edge, in the accent hue.
  ctx.save();
  platePath(ctx, x, y, width, depth, radius);
  ctx.shadowColor = `rgba(108, 222, 232, ${0.22 + 0.2 * box.spread})`;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = layer.kind === 'display' || layer.kind === 'board'
    ? `rgba(108, 222, 232, ${0.34 + 0.2 * box.spread})`
    : 'rgba(226, 244, 249, 0.62)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();

  // Hairline split so each plate reads as a distinct component.
  ctx.strokeStyle = 'rgba(6, 10, 13, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + radius, y + depth + thickness);
  ctx.lineTo(x + width - radius, y + depth + thickness);
  ctx.stroke();

  ctx.restore();

  // Tiny index ticks on the left edge: engineering-drawing detail.
  if (box.spread > 0.15) {
    ctx.globalAlpha = clamp01((box.spread - 0.15) / 0.5) * 0.5;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x - 22 - index * 2, y + depth / 2 - 1, 10 + index * 2, 1);
    ctx.globalAlpha = 1;
  }
}

function edgeColor(kind: LayerSpec['kind'], at: 0 | 1) {
  switch (kind) {
    case 'shell':
      return at === 0 ? '#93a7b3' : '#4c5f6b';
    case 'display':
      return at === 0 ? '#2b3a44' : '#151f26';
    case 'frame':
      return at === 0 ? '#7d8f9b' : '#3c4b56';
    case 'board':
      return at === 0 ? '#1a3034' : '#0c171a';
    case 'core':
      return at === 0 ? '#1d4a52' : '#0d2429';
    default:
      return at === 0 ? '#263137' : '#101619';
  }
}

function paintFace(
  ctx: CanvasRenderingContext2D,
  kind: LayerSpec['kind'],
  x: number,
  y: number,
  width: number,
  depth: number,
  spread: number,
) {
  switch (kind) {
    case 'shell':
      paintShell(ctx, x, y, width, depth);
      break;
    case 'display':
      paintDisplay(ctx, x, y, width, depth);
      break;
    case 'frame':
      paintFrame(ctx, x, y, width, depth);
      break;
    case 'board':
      paintBoard(ctx, x, y, width, depth);
      break;
    case 'core':
      paintCore(ctx, x, y, width, depth, spread);
      break;
    default:
      paintBase(ctx, x, y, width, depth);
  }
}

function paintShell(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number) {
  const body = ctx.createLinearGradient(x, y, x + width * 0.4, y + depth);
  body.addColorStop(0, '#fbfdfe');
  body.addColorStop(0.35, '#e4eef3');
  body.addColorStop(0.72, '#c3d4dd');
  body.addColorStop(1, '#a8bcc7');
  ctx.fillStyle = body;
  ctx.fillRect(x, y, width, depth);

  const sheen = ctx.createLinearGradient(x + width * 0.1, y, x + width * 0.6, y + depth);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.42, 'rgba(255, 255, 255, 0.85)');
  sheen.addColorStop(0.58, 'rgba(255, 255, 255, 0.1)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, depth);

  // Inner glass panel outline + the brand mark etched into the corner.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  dashedRect(ctx, x + 26, y + 16, width - 52, depth - 32, 20);

  const mark = getBrandMark();
  if (mark) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(x + width - 96, y + depth / 2);
    ctx.scale(0.42, 0.42);
    ctx.translate(-48, -39);
    ctx.fillStyle = '#5f7784';
    ctx.fill(mark);
    ctx.restore();
  }
}

function paintDisplay(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number) {
  const glass = ctx.createLinearGradient(x, y, x, y + depth);
  glass.addColorStop(0, '#0d151a');
  glass.addColorStop(0.6, '#101b21');
  glass.addColorStop(1, '#0a1116');
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, width, depth);

  // Abstract product UI: a bar, a few rows, an upward trend line.
  ctx.fillStyle = 'rgba(198, 228, 236, 0.20)';
  roundRect(ctx, x + 40, y + 26, 96, 6, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(108, 222, 232, 0.55)';
  roundRect(ctx, x + 40, y + 42, 46, 4, 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(198, 228, 236, 0.12)';
  for (let row = 0; row < 3; row += 1) {
    roundRect(ctx, x + width - 250, y + 26 + row * 13, 150 - row * 26, 4, 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(108, 222, 232, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 40, y + depth - 28);
  ctx.bezierCurveTo(x + 130, y + depth - 32, x + 168, y + depth - 62, x + 232, y + depth - 52);
  ctx.bezierCurveTo(x + 300, y + depth - 42, x + 330, y + depth - 78, x + 392, y + depth - 74);
  ctx.stroke();
  ctx.fillStyle = 'rgba(108, 222, 232, 0.9)';
  ctx.beginPath();
  ctx.arc(x + 392, y + depth - 74, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(198, 228, 236, 0.10)';
  for (let row = 0; row < 4; row += 1) {
    roundRect(ctx, x + 40 + row * 34, y + depth - 24, 24, 3, 1.5);
    ctx.fill();
  }

  // Glass reflection.
  const glare = ctx.createLinearGradient(x + 60, y, x + width - 60, y + depth);
  glare.addColorStop(0, 'rgba(255, 255, 255, 0)');
  glare.addColorStop(0.48, 'rgba(255, 255, 255, 0.07)');
  glare.addColorStop(0.62, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(x, y, width, depth);
}

function paintFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number) {
  const metal = ctx.createLinearGradient(x, y, x + width * 0.5, y + depth);
  metal.addColorStop(0, '#e8f1f5');
  metal.addColorStop(0.45, '#b9c9d2');
  metal.addColorStop(1, '#7d8f9a');
  ctx.fillStyle = metal;
  ctx.fillRect(x, y, width, depth);

  // Punch the frame's window out so it reads as a machined ring.
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x + 46, y + 20, width - 92, depth - 40, 18);
  ctx.clip();
  const window = ctx.createLinearGradient(x, y, x, y + depth);
  window.addColorStop(0, '#0b1418');
  window.addColorStop(1, '#0e1a1f');
  ctx.fillStyle = window;
  ctx.fillRect(x, y, width, depth);
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 46, y + 20, width - 92, depth - 40);
  // Faint flex-cable trace.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x + 70, y + depth / 2);
  ctx.lineTo(x + 120, y + depth / 2);
  ctx.lineTo(x + 138, y + depth / 2 + 10);
  ctx.lineTo(x + width - 70, y + depth / 2 + 10);
  ctx.stroke();
  ctx.restore();

  // Machined screws at the corners.
  ctx.fillStyle = 'rgba(96, 112, 122, 0.85)';
  for (const [sx, sy] of [[22, 20], [width - 22, 20], [22, depth - 20], [width - 22, depth - 20]]) {
    ctx.beginPath();
    ctx.arc(x + sx, y + sy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBoard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number) {
  const board = ctx.createLinearGradient(x, y, x + width, y + depth);
  board.addColorStop(0, '#0f1e21');
  board.addColorStop(0.55, '#0c171a');
  board.addColorStop(1, '#091215');
  ctx.fillStyle = board;
  ctx.fillRect(x, y, width, depth);

  // Etched traces.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.30)';
  ctx.lineWidth = 1.1;
  const traces: number[][][] = [
    [[-16, 24], [70, 24], [92, 40], [150, 40]],
    [[-8, 76], [52, 76], [74, 62], [138, 62]],
    [[604, 28], [520, 28], [498, 44], [404, 44]],
    [[608, 82], [536, 82], [512, 66], [430, 66]],
    [[220, 12], [220, 30], [250, 30], [250, 44]],
    [[330, 92], [330, 74], [300, 74], [300, 60]],
  ];
  for (const points of traces) {
    ctx.beginPath();
    points.forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(x + px, y + py);
      else ctx.lineTo(x + px, y + py);
    });
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(140, 235, 242, 0.55)';
  for (const points of traces) {
    const [px, py] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(x + px, y + py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central package.
  const chipWidth = 172;
  const chipHeight = 62;
  const chipX = x + width / 2 - chipWidth / 2;
  const chipY = y + depth / 2 - chipHeight / 2;
  ctx.fillStyle = '#081013';
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.45)';
  ctx.lineWidth = 1;
  roundRect(ctx, chipX, chipY, chipWidth, chipHeight, 6);
  ctx.fill();
  ctx.stroke();

  // Pins.
  ctx.fillStyle = 'rgba(163, 196, 204, 0.45)';
  for (let pin = 0; pin < 10; pin += 1) {
    const py = chipY + 8 + pin * 5;
    ctx.fillRect(chipX - 5, py, 4, 2);
    ctx.fillRect(chipX + chipWidth + 1, py, 4, 2);
  }

  // Die.
  const die = ctx.createLinearGradient(chipX, chipY, chipX + chipWidth, chipY + chipHeight);
  die.addColorStop(0, '#124b52');
  die.addColorStop(1, '#0a2b30');
  ctx.fillStyle = die;
  roundRect(ctx, chipX + 34, chipY + 15, chipWidth - 68, chipHeight - 30, 4);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(108, 222, 232, 0.55)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(150, 240, 246, 0.55)';
  ctx.stroke();
  ctx.restore();

  // Passives.
  ctx.fillStyle = 'rgba(170, 190, 198, 0.28)';
  for (const [cx, cy, cw] of [[96, 52, 18], [128, 52, 12], [470, 56, 16], [500, 56, 10]]) {
    roundRect(ctx, x + cx, y + cy, cw, 7, 2);
    ctx.fill();
  }
}

function paintCore(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number, spread: number) {
  const shell = ctx.createLinearGradient(x, y, x, y + depth);
  shell.addColorStop(0, '#0c1a1e');
  shell.addColorStop(1, '#081113');
  ctx.fillStyle = shell;
  ctx.fillRect(x, y, width, depth);

  const cx = x + width / 2;
  const cy = y + depth / 2;

  // Energy bloom.
  const bloom = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150);
  bloom.addColorStop(0, 'rgba(120, 240, 246, 0.34)');
  bloom.addColorStop(0.4, 'rgba(80, 205, 220, 0.12)');
  bloom.addColorStop(1, 'rgba(30, 90, 105, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(x, y, width, depth);

  // Concentric rings, opening slightly with the device.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.30)';
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.globalAlpha = 0.5 - ring * 0.12;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 42 + ring * 18 + spread * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Core disc.
  const disc = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 46);
  disc.addColorStop(0, '#e8feff');
  disc.addColorStop(0.35, '#7fe6ee');
  disc.addColorStop(1, '#12626f');
  ctx.save();
  ctx.shadowColor = 'rgba(108, 222, 232, 0.6)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Brand mark, drawn from the same paths as the site logo.
  const mark = getBrandMark();
  if (mark) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.5, 0.5);
    ctx.translate(-48, -39);
    ctx.fillStyle = 'rgba(8, 26, 30, 0.9)';
    ctx.fill(mark);
    ctx.restore();
  }
}

function paintBase(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number) {
  const chassis = ctx.createLinearGradient(x, y, x + width * 0.3, y + depth);
  chassis.addColorStop(0, '#232e35');
  chassis.addColorStop(0.5, '#161e23');
  chassis.addColorStop(1, '#0b1013');
  ctx.fillStyle = chassis;
  ctx.fillRect(x, y, width, depth);

  // Vent slots.
  ctx.fillStyle = 'rgba(4, 8, 10, 0.55)';
  for (let row = 0; row < 2; row += 1) {
    for (let slot = 0; slot < 6; slot += 1) {
      roundRect(ctx, x + 58 + slot * 26, y + 40 + row * 20, 14, 5, 2.5);
      ctx.fill();
    }
  }

  // Feet.
  ctx.fillStyle = 'rgba(3, 6, 8, 0.75)';
  for (const [fx, fy] of [[34, 22], [width - 34, 22], [34, depth - 22], [width - 34, depth - 22]]) {
    ctx.beginPath();
    ctx.ellipse(x + fx, y + fy, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Etched wordmark.
  ctx.fillStyle = 'rgba(196, 220, 228, 0.22)';
  ctx.font = '500 9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D E V Z A R D', x + width / 2, y + depth - 18);
  ctx.textAlign = 'start';
}

/* ── primitives ─────────────────────────────────────────────────────────── */

/** Same geometry as the site's <BrandMark>, built lazily so importing this
 *  module never touches a browser-only API (safe for SSR and tests). */
const BRAND_PATHS = [
  'M8 2 35 26c5 5 8 11 9 16L34 54c0-11-5-17-10-22l-6-6v39h20L27 77H0l8-10V2Z',
  'M31 13h64L52 65h42L83 77H30l43-53H43L31 13Z',
  'm31 65 22-28 12-8-29 36h-5Z',
];

let brandMark: Path2D | null = null;

function getBrandMark(): Path2D | null {
  if (brandMark) return brandMark;
  if (typeof Path2D === 'undefined') return null;
  const path = new Path2D();
  for (const command of BRAND_PATHS) path.addPath(new Path2D(command));
  brandMark = path;
  return path;
}

function platePath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number, radius: number) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, depth, radius);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number, radius: number) {
  const r = Math.min(radius, depth / 2, width / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + depth - r);
  ctx.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
  ctx.lineTo(x + r, y + depth);
  ctx.quadraticCurveTo(x, y + depth, x, y + depth - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number, radius: number) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, depth, radius);
}

function dashedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth: number, radius: number) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, depth, radius);
  ctx.stroke();
  ctx.restore();
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
