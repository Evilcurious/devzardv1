import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import {
  drawLaptopScene,
  HERO_ANIMATION,
  laptopMetrics,
  type HeroLine,
} from './laptopScene';

/**
 * Hero: a silver laptop that opens by itself when the page loads and throws the
 * hero copy out of its screen, then stays open.
 *
 * The intro is a one-shot, time-based animation (`HERO_ANIMATION.durationMs`,
 * ~4.6s) that runs once on mount. It does not listen to scroll and the section
 * is not pinned: the laptop simply stays open at the top of the page while you
 * scroll on to the rest of the site.
 */

const LINE_ORDER: HeroLine[] = ['brand', 'headline', 'description', 'actions'];

/** Overshoot easing, so each line reads as thrown out rather than faded in. */
function easeOutBack(t: number) {
  const c1 = 1.24;
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
    progress: 0,
    width: 0,
    height: 0,
    dpr: 1,
    frame: 0,
  });

  /** Draw the canvas at a given point in the intro. */
  const paint = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    const current = state.current;
    if (!canvas || current.width <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawLaptopScene(ctx, {
      width: current.width,
      height: current.height,
      dpr: current.dpr,
      progress,
    });
  }, []);

  /** Push a progress value into the copy; each line lands with its own ease. */
  const applyCopy = useCallback((progress: number) => {
    const current = state.current;
    current.progress = progress;

    let actionsVisible = 0;
    LINE_ORDER.forEach(key => {
      const element = lineRefs.current[key];
      if (!element) return;
      const { start, end } = HERO_ANIMATION.copy[key];
      const raw = Math.max(0, Math.min(1, (progress - start) / (end - start)));
      const slid = easeOutBack(raw);
      const faded = easeOutCubic(raw);

      element.style.setProperty('--o', faded.toFixed(3));
      element.style.setProperty('--y', `${((1 - slid) * 34).toFixed(2)}px`);
      element.style.setProperty('--s', (0.94 + slid * 0.06).toFixed(4));
      element.style.setProperty('--blur', `${((1 - faded) * 7).toFixed(2)}px`);
      element.classList.toggle('is-hidden', faded < 0.01);
      if (key === 'actions') actionsVisible = faded;
    });

    // Buttons only accept input once they are actually on screen.
    copyRef.current?.classList.toggle('is-interactive', actionsVisible > 0.55);

    // The wordmark types itself out as its own line arrives, not before it is
    // visible — otherwise it is already complete by the time it appears.
    if (typedRef.current) {
      const brand = HERO_ANIMATION.copy.brand;
      const typed = Math.max(0, Math.min(1, (progress - brand.start) / ((brand.end - brand.start) * 0.85)));
      typedRef.current.style.setProperty('--typed', easeOutCubic(typed).toFixed(3));
    }

    paint(progress);
  }, [paint]);

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
    paint(current.progress);
  }, [paint]);

  // The intro itself: measure, then play the clock once.
  useEffect(() => {
    measure();

    if (reduced) {
      applyCopy(1);
      setFinished(true);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / HERO_ANIMATION.durationMs);
      applyCopy(progress);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else setFinished(true);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [applyCopy, measure, reduced]);

  // Keep the drawing correct across resizes; the intro clock is untouched.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [measure]);

  const bindLine = (key: HeroLine) => (node: HTMLElement | null) => {
    lineRefs.current[key] = node;
  };

  return (
    <section
      className="hero-intro"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      data-finished={finished ? 'true' : 'false'}
    >
      <div className="stage-grid" aria-hidden="true" />
      <div className="hero-intro-glow" aria-hidden="true" />
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
