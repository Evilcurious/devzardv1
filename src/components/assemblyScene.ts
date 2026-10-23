/**
 * Hero assembly scene.
 *
 * The device is a display panel, not a laptop: glass, bezel, a thin chin with
 * the wordmark, and the layers that live behind the glass. Assembled it is the
 * product shot — one big lit panel floating on a dark studio sweep. As
 * `explode` rises the internals slide out from behind it and hang below in
 * perfect vertical alignment: backlight sheet, control board, power board and
 * back cover.
 *
 * Everything is vector art in one design space, and the frame is fitted by the
 * drawing's own bounds, so the same code works from a phone to a wide monitor.
 * Rendering is a pure function of size + explode.
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
  highlight: '#f5f9fb',
  light: '#e4ebf0',
  base: '#cbd4db',
  mid: '#aab5be',
  low: '#87929c',
  edge: '#5c6771',
} as const;

/* ── design space ───────────────────────────────────────────────────────── */

const PANEL = {
  w: 900,
  h: 560,
  radius: 24,
  bezel: 26,
  /** Bottom chin that carries the wordmark. */
  chin: 44,
  /** Thickness of the panel edge. */
  thickness: 11,
} as const;

const GLASS = {
  w: PANEL.w - PANEL.bezel * 2,
  h: PANEL.h - PANEL.bezel - PANEL.chin,
  top: -PANEL.h / 2 + PANEL.bezel,
  bottom: PANEL.h / 2 - PANEL.chin,
} as const;

interface LayerDef {
  kind: 'backlight' | 'board' | 'power' | 'cover';
  depth: number;
  /** Width as a fraction of the panel. */
  width: number;
  /** Gap above this layer, from the panel or the previous layer. */
  gap: number;
}

/** The internals, in the order they hang below the panel. */
const LAYERS: LayerDef[] = [
  { kind: 'backlight', depth: 74, width: 0.9, gap: 34 },
  { kind: 'board', depth: 96, width: 0.74, gap: 26 },
  { kind: 'power', depth: 78, width: 0.6, gap: 26 },
  { kind: 'cover', depth: 112, width: 0.93, gap: 28 },
];

interface Plate {
  y: number;
  depth: number;
  halfW: number;
  /** How much narrower the back edge is, as a fraction. */
  taper?: number;
}

interface Layout {
  panelTop: number;
  panelBottom: number;
  layers: Array<{ def: LayerDef; plate: Plate }>;
  bounds: { top: number; bottom: number; left: number; right: number };
}

/** Layer positions for one explode value. The panel is centred on y = 0. */
function layout(explode: number): Layout {
  const panelTop = -PANEL.h / 2;
  const panelBottom = PANEL.h / 2;

  let cursor = panelBottom;
  const layers = LAYERS.map(def => {
    const y = cursor + def.gap + def.depth / 2;
    cursor = y + def.depth / 2;
    return {
      def,
      plate: {
        y: lerp(0, y, explode),
        depth: def.depth,
        halfW: (PANEL.w * def.width) / 2,
      },
    };
  });

  // Bounds follow the layers where they actually are, so the assembled panel
  // fills the stage instead of being sized for the opened stack.
  let top = panelTop;
  let bottom = panelBottom + PANEL.thickness;
  for (const layer of layers) {
    top = Math.min(top, layer.plate.y - layer.plate.depth / 2);
    bottom = Math.max(bottom, layer.plate.y + layer.plate.depth / 2 + 9);
  }

  const halfW = PANEL.w / 2 + 30;
  return {
    panelTop,
    panelBottom,
    layers,
    bounds: { top: top - 16, bottom: bottom + 20, left: -halfW, right: halfW },
  };
}

interface Frame {
  fit: number;
  offsetX: number;
  offsetY: number;
}

function frameFor(width: number, height: number, l: Layout, explode: number): Frame {
  const artW = l.bounds.right - l.bounds.left;
  const artH = l.bounds.bottom - l.bounds.top;
  // The product shot fills the stage; once the panel opens the camera pulls
  // back far enough to keep every part in frame.
  const heightFactor = 0.94 - 0.07 * clamp01(explode);
  const fit = Math.min((width * 0.94) / artW, (height * heightFactor) / artH);
  const centreX = (l.bounds.left + l.bounds.right) / 2;
  const centreY = (l.bounds.top + l.bounds.bottom) / 2;
  return { fit, offsetX: width / 2 - centreX * fit, offsetY: height * 0.47 - centreY * fit };
}

/** Stage-space geometry of the display, for positioning the copy on the glass. */
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
    lidW: GLASS.w * f.fit,
    lidH: GLASS.h * f.fit,
    deckDepth: 0,
    screenTop: f.offsetY + GLASS.top * f.fit,
    hingeY: f.offsetY + GLASS.bottom * f.fit,
    halfWidth: ((l.bounds.right - l.bounds.left) / 2) * f.fit,
  };
}

/* ── scroll mapping ─────────────────────────────────────────────────────── */

/**
 * Scroll progress → explode. The panel holds together while the first line is
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
  /** Copy strength on the glass. */
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

  drawHalo(ctx, explode);

  // Deepest first so the layer above overlaps it while they separate.
  const byDepth = [...l.layers].reverse();
  for (const layer of byDepth) {
    drawCastShadow(ctx, layer.plate, explode);
    drawLayer(ctx, layer.def.kind, layer.plate, explode);
  }

  drawPanel(ctx, explode);
  if (!frame.still) drawDust(ctx, width / f.fit, height / f.fit, time, explode);

  ctx.restore();
}

/* ── atmosphere ─────────────────────────────────────────────────────────── */

function drawHalo(ctx: CanvasRenderingContext2D, explode: number) {
  const radius = PANEL.w * 0.62;
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  halo.addColorStop(0, `rgba(84, 208, 228, ${0.1 + explode * 0.04})`);
  halo.addColorStop(0.5, 'rgba(44, 124, 156, 0.05)');
  halo.addColorStop(1, 'rgba(20, 44, 62, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.86, 0, 0, TAU);
  ctx.fill();
}

/** Soft shadow one layer drops on the layer beneath it, once they separate. */
function drawCastShadow(ctx: CanvasRenderingContext2D, p: Plate, explode: number) {
  if (explode < 0.03) return;
  const rx = p.halfW * 1.04;
  ctx.save();
  ctx.translate(0, p.y + p.depth / 2);
  ctx.scale(1, 0.26);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${(0.42 * explode).toFixed(3)})`);
  shadow.addColorStop(0.55, `rgba(0, 0, 0, ${(0.16 * explode).toFixed(3)})`);
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ── panel ──────────────────────────────────────────────────────────────── */

function panelPath(ctx: CanvasRenderingContext2D) {
  const topHalf = PANEL.w / 2 - 7;
  const half = PANEL.w / 2;
  roundedPolygon(
    ctx,
    [
      [-topHalf, -PANEL.h / 2],
      [topHalf, -PANEL.h / 2],
      [half, PANEL.h / 2],
      [-half, PANEL.h / 2],
    ],
    PANEL.radius,
  );
}

function drawPanel(ctx: CanvasRenderingContext2D, explode: number) {
  // Edge under the front face, so the panel reads as an object with thickness.
  ctx.fillStyle = '#4d5862';
  roundedPolygon(
    ctx,
    [
      [-PANEL.w / 2 + 18, PANEL.h / 2],
      [PANEL.w / 2 - 18, PANEL.h / 2],
      [PANEL.w / 2 - 24, PANEL.h / 2 + PANEL.thickness],
      [-PANEL.w / 2 + 24, PANEL.h / 2 + PANEL.thickness],
    ],
    PANEL.thickness * 0.55,
  );
  ctx.fill();

  panelPath(ctx);
  const shell = ctx.createLinearGradient(0, -PANEL.h / 2, 0, PANEL.h / 2);
  shell.addColorStop(0, SILVER.base);
  shell.addColorStop(0.07, SILVER.highlight);
  shell.addColorStop(0.45, SILVER.light);
  shell.addColorStop(0.86, SILVER.base);
  shell.addColorStop(1, SILVER.mid);
  ctx.fillStyle = shell;
  ctx.fill();

  // Glass.
  roundedPolygon(
    ctx,
    [
      [-GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.bottom],
      [-GLASS.w / 2, GLASS.bottom],
    ],
    10,
  );
  const glass = ctx.createLinearGradient(0, GLASS.top, 0, GLASS.bottom);
  glass.addColorStop(0, '#0b1418');
  glass.addColorStop(0.55, '#081014');
  glass.addColorStop(1, '#0c1720');
  ctx.fillStyle = glass;
  ctx.fill();

  ctx.save();
  roundedPolygon(
    ctx,
    [
      [-GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.bottom],
      [-GLASS.w / 2, GLASS.bottom],
    ],
    10,
  );
  ctx.clip();

  const width = GLASS.w;
  const height = GLASS.h;

  // Wallpaper blooms.
  const bloom = ctx.createRadialGradient(
    -width * 0.16,
    GLASS.top + height * 0.34,
    0,
    -width * 0.16,
    GLASS.top + height * 0.34,
    width * 0.62,
  );
  bloom.addColorStop(0, 'rgba(46, 194, 220, 0.2)');
  bloom.addColorStop(0.6, 'rgba(26, 104, 136, 0.07)');
  bloom.addColorStop(1, 'rgba(10, 36, 54, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(-width / 2, GLASS.top, width, height);

  const bloomB = ctx.createRadialGradient(
    width * 0.3,
    GLASS.top + height * 0.8,
    0,
    width * 0.3,
    GLASS.top + height * 0.8,
    width * 0.5,
  );
  bloomB.addColorStop(0, 'rgba(58, 94, 210, 0.17)');
  bloomB.addColorStop(1, 'rgba(10, 16, 40, 0)');
  ctx.fillStyle = bloomB;
  ctx.fillRect(-width / 2, GLASS.top, width, height);

  // Grid.
  ctx.strokeStyle = 'rgba(120, 226, 240, 0.05)';
  ctx.lineWidth = 1;
  const step = width / 10;
  for (let x = -width / 2; x <= width / 2; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, GLASS.top);
    ctx.lineTo(x, GLASS.bottom);
    ctx.stroke();
  }
  for (let y = GLASS.top; y <= GLASS.bottom; y += step) {
    ctx.beginPath();
    ctx.moveTo(-width / 2, y);
    ctx.lineTo(width / 2, y);
    ctx.stroke();
  }

  // Reflection.
  const sheen = ctx.createLinearGradient(-width / 2, GLASS.top, width / 2, GLASS.bottom);
  sheen.addColorStop(0, 'rgba(226, 245, 250, 0.07)');
  sheen.addColorStop(0.36, 'rgba(226, 245, 250, 0.02)');
  sheen.addColorStop(0.6, 'rgba(226, 245, 250, 0)');
  sheen.addColorStop(1, 'rgba(108, 222, 232, 0.04)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-width / 2, GLASS.top, width, height);

  const vignette = ctx.createRadialGradient(
    0,
    GLASS.top + height * 0.5,
    height * 0.2,
    0,
    GLASS.top + height * 0.5,
    height * 0.85,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 6, 9, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(-width / 2, GLASS.top, width, height);
  ctx.restore();

  // Bright edge of the glass.
  ctx.strokeStyle = `rgba(150, 236, 246, ${0.26 + explode * 0.06})`;
  ctx.lineWidth = 1.3;
  roundedPolygon(
    ctx,
    [
      [-GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.top],
      [GLASS.w / 2, GLASS.bottom],
      [-GLASS.w / 2, GLASS.bottom],
    ],
    10,
  );
  ctx.stroke();

  // Chin: wordmark and a small status light.
  const chinY = GLASS.bottom + (PANEL.h / 2 - GLASS.bottom) * 0.52;
  const size = Math.max(6, PANEL.w * 0.024);
  ctx.fillStyle = 'rgba(74, 86, 96, 0.62)';
  ctx.font = `650 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D E V Z A R D', 0, chinY);

  ctx.fillStyle = 'rgba(108, 222, 232, 0.9)';
  ctx.beginPath();
  ctx.arc(-PANEL.w / 2 + 42, chinY, 3.2, 0, TAU);
  ctx.fill();

  // Top highlight, so the aluminium catches the key light.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-PANEL.w / 2 + 30, -PANEL.h / 2 + 1.2);
  ctx.lineTo(PANEL.w / 2 - 30, -PANEL.h / 2 + 1.2);
  ctx.stroke();
}

/* ── layers ─────────────────────────────────────────────────────────────── */

const back = (p: Plate) => p.halfW * (1 - (p.taper ?? 0.05));

function platePath(ctx: CanvasRenderingContext2D, p: Plate, radius = p.depth * 0.14) {
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
    radius,
  );
}

/** Drawing coordinates for a point on a plate: u −1…1 across, v 0…1 front. */
function onPlate(p: Plate, u: number, v: number): [number, number] {
  const half = lerp(back(p), p.halfW, v);
  return [u * half, p.y - p.depth / 2 + v * p.depth];
}

function plateRect(
  ctx: CanvasRenderingContext2D,
  p: Plate,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  radius: number,
) {
  roundedPolygon(ctx, [onPlate(p, u0, v0), onPlate(p, u1, v0), onPlate(p, u1, v1), onPlate(p, u0, v1)], radius);
}

/** Top face plus the thickness below the front edge. */
function drawPlateBase(
  ctx: CanvasRenderingContext2D,
  p: Plate,
  top: CanvasGradient | string,
  side: CanvasGradient | string,
  edge: string,
) {
  const bottom = p.y + p.depth / 2;
  const thickness = 9;
  ctx.fillStyle = side;
  roundedPolygon(
    ctx,
    [
      [-p.halfW, bottom],
      [p.halfW, bottom],
      [p.halfW * 0.99, bottom + thickness],
      [-p.halfW * 0.99, bottom + thickness],
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

function drawLayer(
  ctx: CanvasRenderingContext2D,
  kind: LayerDef['kind'],
  p: Plate,
  explode: number,
) {
  if (kind === 'backlight') drawBacklight(ctx, p);
  else if (kind === 'board') drawBoard(ctx, p);
  else if (kind === 'power') drawPower(ctx, p);
  else drawCover(ctx, p, explode);
}

/** The diffuser sheet that sits directly behind the glass. */
function drawBacklight(ctx: CanvasRenderingContext2D, p: Plate) {
  const top = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  top.addColorStop(0, '#f2f7f9');
  top.addColorStop(0.45, '#e6eef2');
  top.addColorStop(1, '#cfd9df');
  drawPlateBase(
    ctx,
    p,
    top,
    '#b9c4cb',
    'rgba(255, 255, 255, 0.55)',
  );

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Diffuser texture: a faint dot field, brighter at the centre.
  const glow = ctx.createRadialGradient(0, p.y, 0, 0, p.y, p.halfW);
  glow.addColorStop(0, 'rgba(163, 240, 250, 0.28)');
  glow.addColorStop(0.7, 'rgba(163, 240, 250, 0.06)');
  glow.addColorStop(1, 'rgba(163, 240, 250, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-p.halfW, p.y - p.depth, p.halfW * 2, p.depth * 2);

  ctx.fillStyle = 'rgba(120, 140, 152, 0.22)';
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 22; column += 1) {
      const [x, y] = onPlate(p, -0.9 + column * 0.086, 0.14 + row * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Display control board: processor, memory, ports. */
function drawBoard(ctx: CanvasRenderingContext2D, p: Plate) {
  const top = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  top.addColorStop(0, '#15231f');
  top.addColorStop(0.45, '#1b2d27');
  top.addColorStop(1, '#101b17');
  drawPlateBase(ctx, p, top, '#0d1512', 'rgba(108, 222, 232, 0.24)');

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Traces.
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.14)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 12; index += 1) {
    const v = 0.16 + (index / 11) * 0.68;
    const [x1, y1] = onPlate(p, -0.22, v);
    const [x2, y2] = onPlate(p, index % 2 === 0 ? -0.94 : 0.94, v);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (let index = 0; index < 5; index += 1) {
    const u = -0.7 + index * 0.36;
    const [x1, y1] = onPlate(p, u, 0.1);
    const [x2, y2] = onPlate(p, u, 0.9);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Processor.
  const [socX, socY] = onPlate(p, -0.24, 0.46);
  ctx.fillStyle = '#0a1012';
  roundRectPath(ctx, socX - 40, socY - 24, 80, 48, 5);
  ctx.fill();
  const die = ctx.createLinearGradient(socX, socY - 24, socX, socY + 24);
  die.addColorStop(0, '#3c4952');
  die.addColorStop(1, '#1b252b');
  ctx.fillStyle = die;
  roundRectPath(ctx, socX - 27, socY - 15, 54, 30, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(108, 222, 232, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Memory packages.
  for (const u of [0.18, 0.44]) {
    const [x, y] = onPlate(p, u, 0.34);
    ctx.fillStyle = '#121b1e';
    roundRectPath(ctx, x - 21, y - 12, 42, 24, 2.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 168, 178, 0.2)';
    ctx.stroke();
  }

  // Ports along the front edge.
  for (const [u, w] of [[-0.62, 40], [-0.32, 22], [-0.1, 22]] as const) {
    const [x, y] = onPlate(p, u, 0.93);
    ctx.fillStyle = '#0b1114';
    roundRectPath(ctx, x - w / 2, y - 7, w, 14, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170, 186, 196, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Small parts.
  for (let index = 0; index < 10; index += 1) {
    const u = -0.85 + hash(index * 3.7) * 1.7;
    const v = 0.16 + hash(index * 7.1) * 0.7;
    const [x, y] = onPlate(p, u, v);
    ctx.fillStyle = 'rgba(160, 176, 186, 0.22)';
    roundRectPath(ctx, x - 5, y - 2.5, 10, 5, 1);
    ctx.fill();
  }
  ctx.restore();
}

/** Power board: transformer, capacitors, connector. */
function drawPower(ctx: CanvasRenderingContext2D, p: Plate) {
  const top = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  top.addColorStop(0, '#1a2227');
  top.addColorStop(0.5, '#222b31');
  top.addColorStop(1, '#131a1e');
  drawPlateBase(ctx, p, top, '#0f1518', 'rgba(150, 168, 178, 0.22)');

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Transformer.
  const [tx, ty] = onPlate(p, -0.34, 0.44);
  ctx.fillStyle = '#0d1215';
  roundRectPath(ctx, tx - 60, ty - 26, 120, 52, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(196, 158, 96, 0.5)';
  ctx.lineWidth = 3;
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.moveTo(tx - 46 + index * 22, ty - 18);
    ctx.lineTo(tx - 46 + index * 22, ty + 18);
    ctx.stroke();
  }

  // Capacitors.
  for (const [u, r] of [[0.16, 13], [0.32, 10], [0.46, 8]] as const) {
    const [x, y] = onPlate(p, u, 0.3);
    ctx.fillStyle = '#1b2429';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 168, 178, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Connector strip.
  const [cx, cy] = onPlate(p, 0.3, 0.86);
  ctx.fillStyle = '#e8eef2';
  roundRectPath(ctx, cx - 46, cy - 9, 92, 18, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 72, 80, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Back cover: the panel's shell, seen from behind. */
function drawCover(ctx: CanvasRenderingContext2D, p: Plate, explode: number) {
  const top = ctx.createLinearGradient(0, p.y - p.depth / 2, 0, p.y + p.depth / 2);
  top.addColorStop(0, SILVER.base);
  top.addColorStop(0.2, SILVER.light);
  top.addColorStop(0.62, SILVER.highlight);
  top.addColorStop(1, SILVER.base);
  const side = ctx.createLinearGradient(0, p.y + p.depth / 2, 0, p.y + p.depth / 2 + 9);
  side.addColorStop(0, SILVER.light);
  side.addColorStop(1, SILVER.edge);
  drawPlateBase(ctx, p, top, side, 'rgba(255, 255, 255, 0.4)');

  ctx.save();
  platePath(ctx, p);
  ctx.clip();

  // Vent fields.
  ctx.fillStyle = 'rgba(104, 118, 128, 0.4)';
  for (const side_ of [-1, 1]) {
    for (let row = 0; row < 6; row += 1) {
      const v = 0.2 + row * 0.1;
      plateRect(ctx, p, side_ * 0.6 - 0.13, v, side_ * 0.6 + 0.13, v + 0.035, 2);
      ctx.fill();
    }
  }

  // Screws.
  for (const [u, v] of [[-0.9, 0.1], [0.9, 0.1], [-0.91, 0.9], [0.91, 0.9]] as const) {
    const [x, y] = onPlate(p, u, v);
    drawScrew(ctx, x, y, 5);
  }

  // Etched monogram.
  const size = Math.max(5, p.halfW * 0.05);
  ctx.fillStyle = 'rgba(120, 132, 142, 0.35)';
  ctx.font = `650 ${size.toFixed(1)}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D E V Z A R D', 0, p.y + 2);

  const sheen = ctx.createLinearGradient(-p.halfW, p.y, p.halfW * 0.5, p.y + p.depth);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-p.halfW, p.y - p.depth, p.halfW * 2, p.depth * 2);
  ctx.restore();

  if (explode > 0.02) {
    ctx.strokeStyle = `rgba(108, 222, 232, ${0.12 * explode})`;
    ctx.lineWidth = 1;
    platePath(ctx, p);
    ctx.stroke();
  }
}

function drawScrew(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(150, 162, 172, 0.6)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 48, 55, 0.55)';
  ctx.lineWidth = 1.1;
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
    const y = -height * 0.42 + ((((mote.y + time * mote.speed) % 1) + 1) % 1) * height * 0.84;
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

type Point = [number, number];

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
