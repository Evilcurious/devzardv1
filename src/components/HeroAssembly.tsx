import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import {
  assemblyMetrics,
  drawAssemblyScene,
  explodeAt,
  type AssemblyFrame,
} from './assemblyScene';

/**
 * Hero: the machine, opened up.
 *
 * The first frame is the product shot — an open silver laptop with the hero
 * copy on its display. As the page scrolls the camera pulls back and the
 * machine separates into its display assembly, keyboard deck, mainboard,
 * battery and bottom cover, then comes back together for a closing line that
 * lands on the display again.
 *
 * The section is a tall track and the stage inside it is pinned with CSS
 * `position: sticky`, so one scroll distance drives the whole sequence. Scroll
 * never touches React state: one rAF-batched measurement writes to the canvas
 * and the overlays directly. Ambient drift runs on a slow timer that only ticks
 * while the stage is on screen.
 */

interface Beat {
  /** Scroll position (0–1) where this beat is fully visible. */
  at: number;
  align: 'left' | 'right';
  index: string;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    at: 0.3,
    align: 'left',
    index: '01 / The build',
    title: 'Every layer, designed together.',
    body: 'Websites, ecommerce platforms, business systems and custom software — one team from the first sketch to the shipped product.',
  },
  {
    at: 0.6,
    align: 'right',
    index: '02 / Under the hood',
    title: 'Built for the real thing.',
    body: 'Clean interfaces over systems that hold up under real traffic, real data and real deadlines.',
  },
];

const FINAL = {
  at: 0.9,
  index: '03 / Ship',
  title: "Tell us what you're building.",
  body: 'We scope it, design it, build it, and keep it running.',
};

/** Half-width of each beat's fade window, in scroll progress. */
const BEAT_WINDOW = 0.18;
/** Scroll range over which the closing line arrives on the display. */
const FINAL_IN = { start: 0.73, end: 0.87 };

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function beatStrength(index: number, progress: number) {
  return clamp01(1 - Math.abs(progress - BEATS[index].at) / BEAT_WINDOW);
}

/**
 * Strength of the dark scrim that lets the side beats sit over the lower part
 * of the machine when there is no room for side columns. Off for the product
 * shot — the deck has to stay clean on the first frame.
 */
function scrimAt(progress: number) {
  return clamp01((progress - 0.045) / 0.11);
}

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

export function HeroAssembly() {
  const { content } = useContent();
  const home = content.homepage;
  const reduced = usePrefersReducedMotion();

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  const state = useRef({
    progress: -1,
    width: 0,
    height: 0,
    dpr: 1,
    px: 0,
    py: 0,
    targetX: 0,
    targetY: 0,
    rafPaint: 0,
    rafSync: 0,
    visible: true,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    current.rafPaint = 0;
    if (!canvas || current.width <= 0 || current.height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = current.progress < 0 ? 0 : current.progress;

    // Ease the pointer so the parallax never snaps.
    current.px += (current.targetX - current.px) * 0.08;
    current.py += (current.targetY - current.py) * 0.08;

    const frame: AssemblyFrame = {
      width: current.width,
      height: current.height,
      dpr: current.dpr,
      explode: explodeAt(progress),
      copy: Math.max(1 - clamp01(progress / 0.09), clamp01((progress - 0.73) / 0.14)),
      time: performance.now() / 1000,
      px: current.px,
      py: current.py,
      still: reduced,
    };
    drawAssemblyScene(ctx, frame);
    stageRef.current?.classList.add('is-ready');
  }, [reduced]);

  const requestPaint = useCallback(() => {
    const current = state.current;
    if (current.rafPaint || !current.visible) return;
    current.rafPaint = window.requestAnimationFrame(paint);
  }, [paint]);

  /** Read scroll, write it into the overlays, repaint the canvas. */
  const sync = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const current = state.current;
    if (!track || !stage) return;
    const rect = track.getBoundingClientRect();
    const travel = rect.height - stage.offsetHeight;
    const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;
    if (Math.abs(progress - current.progress) < 0.0002) {
      requestPaint();
      return;
    }
    current.progress = progress;

    // The hero copy lives on the display and is gone once the machine opens.
    const copy = 1 - clamp01(progress / 0.09);
    if (copyRef.current) {
      copyRef.current.style.setProperty('--o', copy.toFixed(3));
      copyRef.current.classList.toggle('is-live', copy > 0.55);
      copyRef.current.classList.toggle('is-hidden', copy < 0.02);
    }

    // The closing line lands back on the display once it has reassembled.
    const final = clamp01((progress - FINAL_IN.start) / (FINAL_IN.end - FINAL_IN.start));
    if (finalRef.current) {
      finalRef.current.style.setProperty('--o', final.toFixed(3));
      finalRef.current.style.setProperty('--y', `${((1 - final) * 12).toFixed(2)}px`);
      finalRef.current.classList.toggle('is-live', final > 0.6);
      finalRef.current.classList.toggle('is-hidden', final < 0.02);
    }

    BEATS.forEach((_beat, index) => {
      const element = beatRefs.current[index];
      if (!element) return;
      const strength = beatStrength(index, progress);
      element.style.setProperty('--o', strength.toFixed(3));
      element.style.setProperty('--y', `${((1 - strength) * 16).toFixed(2)}px`);
      element.classList.toggle('is-hidden', strength < 0.02);
    });

    const stacked = stage.dataset.layout === 'stacked';
    const bottom = stage.dataset.chapters === 'bottom';
    stage.style.setProperty('--assembly-progress', progress.toFixed(4));
    stage.style.setProperty('--scrim', !stacked && bottom ? scrimAt(progress).toFixed(3) : '0');
    requestPaint();
  }, [requestPaint]);

  const requestSync = useCallback(() => {
    if (state.current.rafSync) return;
    state.current.rafSync = window.requestAnimationFrame(() => {
      state.current.rafSync = 0;
      sync();
    });
  }, [sync]);

  /**
   * Size the backing store from the canvas' own CSS box, then publish the
   * assembled geometry to CSS so the copy can sit on the drawn display. The
   * stage swaps to the stacked layout when the display would be too small to
   * hold the hero copy.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const current = state.current;
      current.width = Math.round(rect.width);
      current.height = Math.round(rect.height);
      current.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      stage.dataset.layout = stageRect.width < 860 || stageRect.height < 440 ? 'stacked' : 'overlay';
      stage.dataset.chapters = stageRect.width >= 1240 ? 'sides' : 'bottom';

      const metrics = assemblyMetrics(current.width, current.height);
      const top = rect.top - stageRect.top;
      stage.style.setProperty('--lid-w', `${Math.round(metrics.lidW)}px`);
      stage.style.setProperty('--lid-h', `${Math.round(metrics.lidH)}px`);
      stage.style.setProperty('--screen-top', `${Math.round(top + metrics.screenTop)}px`);
      stage.style.setProperty('--hinge-y', `${Math.round(top + metrics.hingeY)}px`);

      requestPaint();
      sync();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [requestPaint, sync]);

  // Scroll, visibility and the ambient tick that keeps the dust alive.
  useEffect(() => {
    sync();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);

    const section = trackRef.current;
    let observer: IntersectionObserver | null = null;
    if (section) {
      observer = new IntersectionObserver(
        entries => {
          state.current.visible = entries.some(entry => entry.isIntersecting);
          if (state.current.visible) requestPaint();
        },
        { threshold: 0 },
      );
      observer.observe(section);
    }

    // Ambient drift only: slow enough that ~9 fps reads as continuous.
    const idle = window.setInterval(() => {
      if (!state.current.visible || document.hidden) return;
      requestPaint();
    }, 110);

    const onVisibility = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      window.clearInterval(idle);
      const current = state.current;
      if (current.rafSync) window.cancelAnimationFrame(current.rafSync);
      if (current.rafPaint) window.cancelAnimationFrame(current.rafPaint);
      current.rafSync = 0;
      current.rafPaint = 0;
    };
  }, [requestPaint, requestSync, sync]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width < 1) return;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    state.current.targetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    state.current.targetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  const handlePointerLeave = () => {
    state.current.targetX = 0;
    state.current.targetY = 0;
  };

  // Reduced motion: no pinning and no scroll mapping. The product shot carries
  // the hero copy, and the three beats become ordinary readable sections.
  if (reduced) {
    return (
      <section className="assembly assembly--static" aria-labelledby="hero-heading">
        <div className="assembly-stage assembly-stage--static" data-layout="overlay" data-chapters="bottom">
          <div className="stage-grid" aria-hidden="true" />
          <div className="assembly-glow" aria-hidden="true" />
          <div className="assembly-art">
            <StaticScene />
            <div className="assembly-copy hero-copy--stage is-live">
              <HeroCopy />
            </div>
          </div>
        </div>
        <div className="assembly-static-chapters container">
          {[...BEATS, { ...FINAL, align: 'left' as const }].map((beat, index) => (
            <article key={beat.title}>
              <p className="assembly-eyebrow">{beat.index}</p>
              <h2>{beat.title}</h2>
              <p className="assembly-body">{beat.body}</p>
              {index === BEATS.length && (
                <SiteLink href="/#contact" className="text-link">
                  Start a Project
                  <Icon name="arrow" size={15} />
                </SiteLink>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="assembly"
      ref={trackRef}
      aria-labelledby="hero-heading"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="assembly-stage" ref={stageRef} data-layout="overlay" data-chapters="sides">
        <div className="stage-grid" aria-hidden="true" />
        <div className="assembly-glow" aria-hidden="true" />
        <div className="assembly-scrim" aria-hidden="true" />

        <div className="assembly-art">
          <canvas ref={canvasRef} className="assembly-canvas" aria-hidden="true" />
        </div>

        <h1 className="sr-only" id="hero-heading">
          {home.heroBrand} — {home.heroHeadline} {home.heroHeadlineAccent}
        </h1>
        <p className="sr-only">
          An open laptop on a dark studio surface: as the page scrolls it separates into its display,
          keyboard deck, mainboard, battery and bottom cover, then comes back together.
        </p>

        <div className="assembly-copy hero-copy--stage" ref={copyRef}>
          <HeroCopy />
        </div>

        <div className="assembly-final" ref={finalRef}>
          <div className="assembly-final-inner">
            <p className="assembly-eyebrow">{FINAL.index}</p>
            <h2>{FINAL.title}</h2>
            <p className="assembly-body">{FINAL.body}</p>
            <div className="assembly-actions">
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

        <div className="assembly-chapters">
          {BEATS.map((beat, index) => (
            <div
              key={beat.title}
              className={`assembly-chapter assembly-chapter--${beat.align}`}
              ref={node => { beatRefs.current[index] = node; }}
            >
              <div className="assembly-chapter-inner">
                <p className="assembly-eyebrow">{beat.index}</p>
                <h2>{beat.title}</h2>
                <p className="assembly-body">{beat.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="assembly-rail" aria-hidden="true">
          <span className="assembly-rail-line" />
          <span className="assembly-rail-fill" />
        </div>
      </div>
    </section>
  );
}

/** Hero copy, drawn on the display exactly as the rest of the site sets type. */
function HeroCopy() {
  const { content } = useContent();
  const home = content.homepage;
  return (
    <div className="assembly-copy-inner">
      <span className="hero-brand">
        {home.heroBrand}
        <span className="hero-brand-dot">.</span>
      </span>
      <span className="hero-stage-headline">
        {home.heroHeadline}
        <br />
        <span className="hero-stage-headline-accent">{home.heroHeadlineAccent}</span>
      </span>
      <span className="hero-description">{home.heroSubtitle}</span>
      <span className="hero-ctas">
        <SiteLink href={home.heroCtaLink} className="button button-primary">
          {home.heroCta}
          <Icon name="arrow" size={17} />
        </SiteLink>
        <SiteLink href={home.heroSecondaryLink} className="button button-quiet">
          {home.heroSecondary}
          <Icon name="arrow-down" size={16} />
        </SiteLink>
      </span>
    </div>
  );
}

/** One still frame of the assembled machine, for the reduced-motion variant. */
function StaticScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stage = canvas.closest('.assembly-stage') as HTMLElement | null;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const stageRect = stage?.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const metrics = assemblyMetrics(rect.width, rect.height);
      if (stage && stageRect) {
        const top = rect.top - stageRect.top;
        stage.style.setProperty('--lid-w', `${Math.round(metrics.lidW)}px`);
        stage.style.setProperty('--lid-h', `${Math.round(metrics.lidH)}px`);
        stage.style.setProperty('--screen-top', `${Math.round(top + metrics.screenTop)}px`);
        stage.style.setProperty('--hinge-y', `${Math.round(top + metrics.hingeY)}px`);
      }
      drawAssemblyScene(ctx, {
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
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="assembly-canvas is-ready" aria-hidden="true" />;
}
