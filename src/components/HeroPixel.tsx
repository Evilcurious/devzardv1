import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import { drawPixelScene, explodeAt, PARTS, pixelLayout, type PartId } from './pixelScene';

/**
 * Hero: a display, drawn in pixels and taken apart as you scroll.
 *
 * The first frame is the product shot — a pixel monitor on a dark sweep with
 * the site's own hero copy beside it. Scrolling separates the front glass, the
 * diffuser sheet, the control board, the power board and the chassis, holds
 * them apart while the three chapters are read, then puts the machine back
 * together for the closing line.
 *
 * The section is a tall track and the stage inside it is pinned with CSS
 * `position: sticky`. Scrolling never touches React state: one rAF-batched
 * pass reads the scroll position and writes to the canvas and the overlays
 * directly. Nothing here can escape its box — every decorative layer is
 * absolutely positioned inside an `overflow: hidden` stage, with no fixed
 * overlays, no cursor followers and no negative offsets.
 */

interface Chapter {
  /** Scroll position (0–1) where the chapter is fully visible. */
  at: number;
  /** Half-width of its fade window. */
  half: number;
  tag: string;
  title: string;
  body: string;
  href: string;
  link: string;
}

const CHAPTERS: Chapter[] = [
  {
    at: 0.3,
    half: 0.12,
    tag: '01 / Services',
    title: 'Websites, stores, systems.',
    body: 'Marketing sites, ecommerce, internal tools and custom software — designed, built and shipped by the same team.',
    href: '/#services',
    link: 'What we build',
  },
  {
    at: 0.54,
    half: 0.1,
    tag: '02 / Work',
    title: 'Shipped, not shelved.',
    body: 'Storefronts, dashboards and business tools running in production, with the code and the process to keep them moving.',
    href: '/#work',
    link: 'See the work',
  },
  {
    at: 0.76,
    half: 0.1,
    tag: '03 / Process',
    title: 'Six steps. One team.',
    body: 'Discover, design, build, test, launch, grow. No hand-offs between departments, no layers between you and the build.',
    href: '/#process',
    link: 'How we work',
  },
];

const FINAL = {
  at: 0.93,
  half: 0.1,
  tag: '04 / Ship',
  title: "Have an idea? Let's build it.",
  body: 'Tell us what you are trying to build. We will figure out the technology and the plan.',
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const smooth = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const update = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

const LABELS: PartId[] = ['diffuser', 'board', 'power', 'shell', 'stand'];

export function HeroPixel() {
  const { content } = useContent();
  const home = content.homepage;
  const reduced = usePrefersReducedMotion();

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const finalRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stageTextRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);

  const state = useRef({
    progress: 0,
    explode: 0,
    time: 0,
    px: 0,
    py: 0,
    targetX: 0,
    targetY: 0,
    cw: 0,
    ch: 0,
    dpr: 1,
    stacked: false,
    visible: true,
    rafSync: 0,
    rafPaint: 0,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    if (!canvas || current.cw < 2 || current.ch < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPixelScene(ctx, {
      width: current.cw,
      height: current.ch,
      dpr: current.dpr,
      explode: current.explode,
      copy: 1 - smooth(current.progress, 0.03, 0.12),
      time: current.time,
      px: current.px,
      py: current.py,
      stacked: current.stacked,
    });
    canvas.classList.add('is-ready');
  }, []);

  /** Read the scroll position once and write it everywhere it is needed. */
  const sync = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const current = state.current;
    if (!track || !stage) return;

    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, rect.height - stage.getBoundingClientRect().height);
    const progress = clamp01(-rect.top / travel);
    const explode = explodeAt(progress);
    const previous = current.progress;
    current.progress = progress;
    current.explode = explode;
    const stacked = stage.clientWidth < 900;
    current.stacked = stacked;
    if (stage.dataset.layout !== (stacked ? 'stacked' : 'split')) {
      stage.dataset.layout = stacked ? 'stacked' : 'split';
    }

    // Hero copy leaves the frame once the machine starts to open.
    const copy = 1 - smooth(progress, 0.04, 0.13);
    if (copyRef.current) {
      copyRef.current.style.opacity = copy.toFixed(3);
      copyRef.current.style.visibility = copy < 0.02 ? 'hidden' : 'visible';
      copyRef.current.style.transform = `translate3d(0, ${(-copy + 1) * -18}px, 0)`;
    }

    // Chapters.
    CHAPTERS.forEach((chapter, index) => {
      const node = chapterRefs.current[index];
      if (!node) return;
      const o = clamp01(1 - Math.abs(progress - chapter.at) / chapter.half);
      node.style.opacity = o.toFixed(3);
      node.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      node.style.transform = `translate3d(0, ${(1 - o) * 14}px, 0)`;
    });
    if (finalRef.current) {
      const o = clamp01(1 - Math.abs(progress - FINAL.at) / FINAL.half);
      finalRef.current.style.opacity = o.toFixed(3);
      finalRef.current.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      finalRef.current.style.transform = `translate3d(0, ${(1 - o) * 14}px, 0)`;
    }

    // Annotations, pinned to the parts they describe.
    const figure = figureRef.current;
    if (figure && current.cw > 0) {
      const layout = pixelLayout(current.cw, current.ch, explode, current.stacked);
      LABELS.forEach((id, index) => {
        const node = labelRefs.current[index];
        const part = layout.parts.find(item => item.id === id);
        if (!node || !part) return;
        const { s: scale, ox, oy } = layout.camera;
        const x = ox + (part.x + part.w + 7) * scale;
        const y = oy + (part.y + part.h - 7) * scale;
        const o = clamp01((explode - index * 0.07) / 0.22);
        node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        node.style.opacity = (o * (current.stacked ? 0 : 1)).toFixed(3);
      });
    }

    // Stage readout + progress rail.
    const stageText = stageTextRef.current;
    if (stageText) {
      const label =
        progress < 0.1
          ? 'STAGE 00 · ASSEMBLED'
          : progress < 0.46
            ? 'STAGE 01 · DISASSEMBLING'
            : progress < 0.66
              ? 'STAGE 02 · SEPARATED'
              : progress < 0.93
                ? 'STAGE 03 · REASSEMBLING'
                : 'STAGE 00 · ASSEMBLED';
      if (stageText.textContent !== label) stageText.textContent = label;
    }
    if (railRef.current) railRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;

    // Only repaint when something the canvas cares about moved.
    if (Math.abs(progress - previous) > 0.0004) paint();
  }, [paint]);

  const requestSync = useCallback(() => {
    const current = state.current;
    if (current.rafSync) return;
    current.rafSync = window.requestAnimationFrame(() => {
      current.rafSync = 0;
      sync();
    });
  }, [sync]);

  // Size the canvas, keep it sized, and paint the first frame.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const current = state.current;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      current.cw = rect.width;
      current.ch = rect.height;
      current.dpr = dpr;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      sync();
      paint();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint, reduced, sync]);

  // Scroll, pointer and the ambient clock.
  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onScroll = () => requestSync();
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = stage.getBoundingClientRect();
      const current = state.current;
      current.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      current.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    };
    const onLeave = () => {
      state.current.targetX = 0;
      state.current.targetY = 0;
    };
    const onVisibility = () => requestSync();

    const observer = new IntersectionObserver(
      entries => {
        state.current.visible = entries.some(entry => entry.isIntersecting);
        requestSync();
      },
      { threshold: 0 },
    );
    observer.observe(stage);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onPointer, { passive: true });
    stage.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    // Dust and the screen sweep keep moving while the stage is on screen.
    const idle = window.setInterval(() => {
      const current = state.current;
      if (document.hidden || !current.visible) return;
      current.time += 90;
      current.px += (current.targetX - current.px) * 0.25;
      current.py += (current.targetY - current.py) * 0.25;
      paint();
    }, 90);

    requestSync();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointer);
      stage.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      window.clearInterval(idle);
      const current = state.current;
      if (current.rafSync) window.cancelAnimationFrame(current.rafSync);
      if (current.rafPaint) window.cancelAnimationFrame(current.rafPaint);
      current.rafSync = 0;
      current.rafPaint = 0;
    };
  }, [paint, reduced, requestSync, sync]);

  const heroCopy = (
    <>
      <span className="pixel-brand">
        {home.heroBrand}
        <span className="pixel-brand-dot">.</span>
      </span>
      <h1 className="pixel-headline">
        {home.heroHeadline}
        <br />
        <span className="pixel-headline-accent">{home.heroHeadlineAccent}</span>
      </h1>
      <p className="pixel-sub">{home.heroSubtitle}</p>
      <div className="pixel-actions">
        <SiteLink href={home.heroCtaLink} className="button button-primary">
          {home.heroCta}
          <Icon name="arrow" size={16} />
        </SiteLink>
        <SiteLink href={home.heroSecondaryLink} className="button button-quiet">
          {home.heroSecondary}
          <Icon name="arrow-down" size={15} />
        </SiteLink>
      </div>
    </>
  );

  // Reduced motion: one still frame, the copy, and the chapters as sections.
  if (reduced) {
    return (
      <section className="pixel-hero pixel-hero--static" aria-labelledby="hero-heading">
        <div className="pixel-stage pixel-stage--static" data-layout="overlay">
          <div className="pixel-grid" aria-hidden="true" />
          <div className="pixel-glow" aria-hidden="true" />
          <div className="pixel-body">
            <div className="pixel-column">
              <div className="pixel-copy is-static">{heroCopy}</div>
            </div>
            <div className="pixel-figure">
              <StaticPanel />
            </div>
          </div>
        </div>
        <div className="pixel-chapters container">
          {[...CHAPTERS, { ...FINAL, href: '/#contact', link: 'Start a project' }].map(chapter => (
            <article key={chapter.title}>
              <p className="pixel-tag">{chapter.tag}</p>
              <h2>{chapter.title}</h2>
              <p className="pixel-chapter-body">{chapter.body}</p>
              <SiteLink href={chapter.href} className="pixel-chapter-link">
                {chapter.link}
                <Icon name="arrow" size={14} />
              </SiteLink>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="pixel-hero" ref={trackRef} aria-labelledby="hero-heading">
      <div
        className="pixel-stage"
        ref={stageRef}
        data-layout={typeof window !== 'undefined' && window.innerWidth < 900 ? 'stacked' : 'split'}
      >
        <div className="pixel-grid" aria-hidden="true" />
        <div className="pixel-glow" aria-hidden="true" />

        <div className="pixel-hud" aria-hidden="true">
          <span className="pixel-hud-left">
            <span className="pixel-hud-mark" />
            DEVZARD / SYSTEM
          </span>
          <span className="pixel-hud-right" ref={stageTextRef}>
            STAGE 00 · ASSEMBLED
          </span>
        </div>

        <div className="pixel-body">
          <div className="pixel-column">
            <div className="pixel-copy" ref={copyRef}>
              {heroCopy}
            </div>

            {CHAPTERS.map((chapter, index) => (
              <div
                className="pixel-chapter"
                key={chapter.title}
                ref={node => { chapterRefs.current[index] = node; }}
              >
                <p className="pixel-tag">{chapter.tag}</p>
                <h2>{chapter.title}</h2>
                <p className="pixel-chapter-body">{chapter.body}</p>
                <SiteLink href={chapter.href} className="pixel-chapter-link">
                  {chapter.link}
                  <Icon name="arrow" size={14} />
                </SiteLink>
              </div>
            ))}

            <div className="pixel-chapter pixel-final" ref={finalRef}>
              <p className="pixel-tag">{FINAL.tag}</p>
              <h2>{FINAL.title}</h2>
              <p className="pixel-chapter-body">{FINAL.body}</p>
              <div className="pixel-actions">
                <SiteLink href="/#contact" className="button button-primary">
                  Start a Project
                  <Icon name="arrow" size={16} />
                </SiteLink>
                <SiteLink href="/#work" className="button button-quiet">
                  View our work
                  <Icon name="arrow-down" size={15} />
                </SiteLink>
              </div>
            </div>
          </div>

          <div className="pixel-figure" ref={figureRef}>
            <span className="pixel-fig-frame" aria-hidden="true" />
            <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
            <div className="pixel-labels" aria-hidden="true">
              {LABELS.map((id, index) => {
                const part = PARTS.find(item => item.id === id)!;
                return (
                  <div
                    className="pixel-label"
                    key={id}
                    ref={node => { labelRefs.current[index] = node; }}
                  >
                    <span className="pixel-label-name">{part.label}</span>
                    <span className="pixel-label-spec">{part.spec}</span>
                  </div>
                );
              })}
            </div>
            <span className="pixel-fig-caption" aria-hidden="true">
              FIG. 01 — DISPLAY, 24 IN / 6 PARTS
            </span>
          </div>
        </div>

        <div className="pixel-rail" aria-hidden="true">
          <span className="pixel-rail-track">
            <span className="pixel-rail-fill" ref={railRef} />
          </span>
          <span className="pixel-rail-labels">
            <span>Assemble</span>
            <span>Inspect</span>
            <span>Ship</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/** One assembled frame of the panel, for the reduced-motion variant. */
function StaticPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawPixelScene(ctx, {
        width: rect.width,
        height: rect.height,
        dpr,
        explode: 0,
        copy: 1,
        time: 0,
        px: 0,
        py: 0,
        still: true,
      });
      canvas.classList.add('is-ready');
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />;
}
