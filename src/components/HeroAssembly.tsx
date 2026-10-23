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
 * Hero: a display panel, opened up.
 *
 * The first frame is the product shot — one big lit panel floating on a dark
 * studio sweep, with the hero copy on the glass. The copy slides in from the
 * right, then swaps every five seconds with the same right-to-left motion while
 * the section is on screen.
 *
 * Scroll works the panel: the internals slide out from behind the glass into a
 * centre-aligned stack (backlight, control board, power board, back cover),
 * hold while the second beat is read, then close again for a closing line that
 * lands back on the display.
 *
 * The section is a tall track and the stage inside it is pinned with CSS
 * `position: sticky`. Scroll never touches React state: one rAF-batched
 * measurement writes to the canvas and the overlays directly. The slideshow is
 * the one exception — it advances on a timer, not on scroll.
 */

interface Slide {
  line: string;
  accent: string;
  body: string;
}

/** Seconds each slide holds before the next one pushes in from the right. */
const SLIDE_MS = 5000;
/** Matches the slide keyframes in `styles/assembly.css`. */
const SLIDE_ANIM_MS = 640;

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
 * Strength of the dark scrim that lets the beats sit over the lower part of the
 * machine when there is no room for side columns. Off for the product shot —
 * the panel has to stay clean on the first frame.
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

  const slides: Slide[] = [
    { line: home.heroHeadline, accent: home.heroHeadlineAccent, body: home.heroSubtitle },
    {
      line: 'Websites that make your business',
      accent: 'easier to understand.',
      body: 'Fast, modern sites designed around your brand and your customers — and built so you can maintain them.',
    },
    {
      line: 'Ecommerce built for',
      accent: 'real orders.',
      body: 'Storefront, payments, stock and back-office workflows connected around the way you sell.',
    },
    {
      line: 'Business software that replaces',
      accent: 'the spreadsheets.',
      body: 'One reliable system with the right permissions, reporting and workflows for your team.',
    },
  ];

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [slide, setSlide] = useState<{ index: number; previous: number | null }>({
    index: 0,
    previous: null,
  });

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

    // The hero copy lives on the glass and is gone once the panel opens.
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
   * display geometry to CSS so the copy can sit on the drawn glass. The stage
   * swaps to the stacked layout when the panel would be too small to hold it.
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

      // Side columns only when the drawing, at its widest during the beats,
      // still leaves a readable column on each side.
      const wide = assemblyMetrics(current.width, current.height, 0.62);
      const inset = Math.min(104, Math.max(24, stageRect.width * 0.06));
      const sideSpace = stageRect.width / 2 - wide.halfWidth - inset;
      stage.dataset.chapters = sideSpace >= 230 ? 'sides' : 'bottom';
      stage.style.setProperty('--art-half', `${Math.round(wide.halfWidth)}px`);

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

  // Slide timer: one swap every SLIDE_MS while the hero is on screen and the
  // copy is still on the glass. Paused while the tab is hidden.
  useEffect(() => {
    if (reduced || slides.length < 2) return;
    let tick = 0;
    let clear = 0;

    const schedule = () => {
      tick = window.setTimeout(() => {
        const current = state.current;
        if (document.hidden || !current.visible || current.progress > 0.12) {
          schedule();
          return;
        }
        setSlide(state => ({
          index: (state.index + 1) % slides.length,
          previous: state.index,
        }));
        window.clearTimeout(clear);
        clear = window.setTimeout(() => {
          setSlide(state => ({ ...state, previous: null }));
        }, SLIDE_ANIM_MS);
        schedule();
      }, SLIDE_MS);
    };

    schedule();
    return () => {
      window.clearTimeout(tick);
      window.clearTimeout(clear);
    };
  }, [reduced, slides.length]);

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

  const slideContent = (index: number) => {
    const item = slides[index];
    return (
      <>
        <span className="hero-stage-headline">
          {item.line}
          <br />
          <span className="hero-stage-headline-accent">{item.accent}</span>
        </span>
        <span className="hero-description">{item.body}</span>
      </>
    );
  };

  // Reduced motion: no pinning, no scroll mapping, no rotation. The product
  // shot carries the hero copy, and the three beats become normal sections.
  if (reduced) {
    return (
      <section className="assembly assembly--static" aria-labelledby="hero-heading">
        <div className="assembly-stage assembly-stage--static" data-layout="overlay" data-chapters="bottom">
          <div className="stage-grid" aria-hidden="true" />
          <div className="assembly-glow" aria-hidden="true" />
          <div className="assembly-art">
            <StaticScene />
            <div className="assembly-copy hero-copy--stage is-live">
              <div className="assembly-copy-inner">
                <span className="hero-brand">
                  {home.heroBrand}
                  <span className="hero-brand-dot">.</span>
                </span>
                <div className="assembly-slides">
                  <div className="assembly-slide">{slideContent(0)}</div>
                </div>
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
            </div>
          </div>
        </div>
        <div className="assembly-static-chapters container">
          {[...BEATS, { ...FINAL, at: 0.9, align: 'left' as const }].map((beat, index) => (
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
          A display panel on a dark studio surface: as the page scrolls it separates into its
          backlight sheet, control board, power board and back cover, then comes back together.
        </p>

        <div className="assembly-copy hero-copy--stage" ref={copyRef}>
          <div className="assembly-copy-inner">
            <span className="hero-brand">
              {home.heroBrand}
              <span className="hero-brand-dot">.</span>
            </span>

            <div className="assembly-slides">
              {slide.previous !== null && (
                <div key={`out-${slide.previous}`} className="assembly-slide is-out" aria-hidden="true">
                  {slideContent(slide.previous)}
                </div>
              )}
              <div
                key={`in-${slide.index}`}
                className={`assembly-slide${slide.previous === null ? '' : ' is-in'}`}
              >
                {slideContent(slide.index)}
              </div>
            </div>

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

            <span className="assembly-dots" aria-hidden="true">
              {slides.map((item, index) => (
                <span key={item.accent} className={index === slide.index ? 'is-on' : ''} />
              ))}
            </span>
          </div>
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

/** One still frame of the assembled panel, for the reduced-motion variant. */
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
