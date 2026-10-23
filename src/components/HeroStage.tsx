import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import {
  copyStrength,
  drawLaptopScene,
  HERO_REVEAL,
  laptopMetrics,
  type HeroLine,
} from './laptopScene';

/**
 * Hero: an open silver laptop with the hero copy on its display.
 *
 * There is no open/close sequence any more — the machine is open on the first
 * frame. The only motion is ambient: the copy settles onto the glass over
 * ~1.4s, a light passes over the metal every few seconds, the wallpaper
 * breathes, dust drifts through the display light, and the whole device leans a
 * few pixels towards the cursor. Nothing is scroll-mapped and nothing is
 * pinned: the hero simply scrolls away with the rest of the page.
 */

const LINE_ORDER: HeroLine[] = ['brand', 'headline', 'description', 'actions'];

/** Overshoot easing, so each line settles rather than merely fading in. */
function easeOutBack(t: number) {
  const c1 = 0.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
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

export function HeroStage() {
  const { content } = useContent();
  const home = content.homepage;
  const reduced = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Partial<Record<HeroLine, HTMLElement | null>>>({});
  const typedRef = useRef<HTMLSpanElement>(null);
  const [finished, setFinished] = useState(false);

  const state = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    reveal: 0,
    px: 0,
    py: 0,
    targetX: 0,
    targetY: 0,
  });
  const visible = useRef(true);
  const settled = useRef(false);

  /** Draw the scene at the current clock and pointer position. */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    if (!canvas || current.width <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawLaptopScene(ctx, {
      width: current.width,
      height: current.height,
      dpr: current.dpr,
      time: current.time,
      reveal: current.reveal,
      px: current.px,
      py: current.py,
    });
  }, []);

  /** Push a reveal value into the copy; each line lands with its own ease. */
  const applyCopy = useCallback((progress: number) => {
    let actionsVisible = 0;
    LINE_ORDER.forEach(key => {
      const element = lineRefs.current[key];
      if (!element) return;
      const raw = copyStrength(key, progress);
      const slid = easeOutBack(raw);
      const faded = easeOutCubic(raw);

      element.style.setProperty('--o', faded.toFixed(3));
      element.style.setProperty('--y', `${((1 - slid) * 24).toFixed(2)}px`);
      element.style.setProperty('--s', (0.975 + slid * 0.025).toFixed(4));
      element.style.setProperty('--blur', `${((1 - faded) * 6).toFixed(2)}px`);
      element.classList.toggle('is-hidden', faded < 0.01);
      if (key === 'actions') actionsVisible = faded;
    });

    // Buttons only accept input once they are actually on screen.
    copyRef.current?.classList.toggle('is-interactive', actionsVisible > 0.55);

    // The wordmark types itself out as its own line arrives.
    if (typedRef.current) {
      const brand = HERO_REVEAL.copy.brand;
      const typed = Math.max(0, Math.min(1, (progress - brand.start) / (brand.end - brand.start)));
      typedRef.current.style.setProperty('--typed', easeOutCubic(typed).toFixed(3));
    }
  }, []);

  /** Size the canvas from its CSS box and publish the geometry as variables. */
  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const current = state.current;
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    current.width = Math.round(rect.width);
    current.height = Math.round(rect.height);
    current.dpr = dpr;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    const metrics = laptopMetrics(current.width, current.height);
    section.dataset.layout = metrics.mode;
    section.style.setProperty('--lid-w', `${Math.round(metrics.lidW)}px`);
    section.style.setProperty('--lid-h', `${Math.round(metrics.lidH)}px`);
    section.style.setProperty('--screen-top', `${Math.round(metrics.screenTop)}px`);
    paint();
  }, [paint]);

  // The clock: copy reveal, then ambient loops for as long as the hero is on
  // screen. It keeps the pointer easing inside the same frame callback.
  useEffect(() => {
    measure();

    if (reduced) {
      state.current.reveal = 1;
      applyCopy(1);
      paint();
      setFinished(true);
      settled.current = true;
      return;
    }

    // Time comes from the frame timestamp, so the reveal and the ambient loops
    // share one clock and cannot drift apart.
    let started = -1;
    let frame = 0;
    let lastReveal = -1;

    const tick = (now: number) => {
      if (started < 0) started = now;
      const current = state.current;
      const elapsed = now - started;
      current.time = elapsed / 1000;
      current.reveal = Math.min(1, elapsed / HERO_REVEAL.durationMs);

      // Ease towards the pointer instead of snapping to it.
      current.px += (current.targetX - current.px) * 0.05;
      current.py += (current.targetY - current.py) * 0.05;

      if (current.reveal !== lastReveal) {
        applyCopy(current.reveal);
        lastReveal = current.reveal;
      }

      if (visible.current) paint();

      if (current.reveal >= 1 && !settled.current) {
        settled.current = true;
        setFinished(true);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [applyCopy, measure, paint, reduced]);

  // Keep the drawing correct across resizes; the clock is untouched.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [measure]);

  // Stop painting when the hero scrolls out of view or the tab is hidden.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      entries => {
        visible.current = entries.some(entry => entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(section);
    const onVisibility = () => {
      visible.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /** A few pixels of parallax, mouse only — touch would fight the scroll. */
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

  const bindLine = (key: HeroLine) => (node: HTMLElement | null) => {
    lineRefs.current[key] = node;
  };

  return (
    <section
      className="hero-intro"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      data-finished={finished ? 'true' : 'false'}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="stage-grid" aria-hidden="true" />
      <div className="hero-intro-glow" aria-hidden="true" />
      <div className="hero-screen-bloom" aria-hidden="true" />
      <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />

      <div className="hero-copy hero-copy--stage" ref={copyRef}>
        <h1 id="hero-heading" className="hero-stage-h1">
          <span className="hero-line" ref={bindLine('brand')}>
            <span className="hero-brand">
              <span className="hero-brand-text" ref={typedRef}>{home.heroBrand}</span>
              <span className="hero-brand-dot">.</span>
            </span>
          </span>
          <span className="hero-line" ref={bindLine('headline')}>
            <span className="hero-stage-headline">
              {home.heroHeadline}
              <br />
              <span className="hero-stage-headline-accent">{home.heroHeadlineAccent}</span>
            </span>
          </span>
        </h1>
        <span className="hero-line" ref={bindLine('description')}>
          <span className="hero-description">{home.heroSubtitle}</span>
        </span>
        <span className="hero-line" ref={bindLine('actions')}>
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
        </span>
      </div>

      <p className="hero-scroll-cue" aria-hidden="true">
        <span className="hero-cue-line" />
        Scroll to explore
        <Icon name="arrow-down" size={13} />
      </p>
    </section>
  );
}
