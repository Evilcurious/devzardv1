import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import { drawLaptopScene, laptopMetrics } from './laptopScene';

/**
 * Hero: a closed laptop that opens as you scroll and hands you the hero copy,
 * then closes again and hands off to the build story below it.
 *
 * The section is a tall track with a sticky stage inside it. Progress through
 * the track drives one canvas frame and four copy lines; nothing here goes
 * through React state on scroll, and the canvas only repaints when the frame
 * actually changed.
 */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** When each copy line arrives, and where it leaves. */
const LINES = {
  brand: { start: 0.11, end: 0.21 },
  headline: { start: 0.23, end: 0.33 },
  description: { start: 0.28, end: 0.38 },
  actions: { start: 0.33, end: 0.43 },
} as const;

const EXIT_START = 0.66;
const EXIT_END = 0.82;

type LineKey = keyof typeof LINES;

function useMedia(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const update = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function HeroScrollStage() {
  const { content } = useContent();
  const home = content.homepage;
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const short = useMedia('(max-height: 560px)');
  const staticMode = reduced || short;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Partial<Record<LineKey, HTMLElement | null>>>({});
  const typedRef = useRef<HTMLSpanElement>(null);

  const state = useRef({
    progress: -1,
    drawn: -1,
    width: 0,
    height: 0,
    dpr: 1,
    frame: 0,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    current.frame = 0;
    if (!canvas || current.width <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const progress = current.progress < 0 ? 0 : current.progress;
    if (Math.abs(progress - current.drawn) < 0.0006) return;
    current.drawn = progress;
    drawLaptopScene(ctx, { width: current.width, height: current.height, dpr: current.dpr, progress });
  }, []);

  const requestPaint = useCallback(() => {
    if (state.current.frame) return;
    state.current.frame = window.requestAnimationFrame(paint);
  }, [paint]);

  const applyProgress = useCallback((progress: number) => {
    const current = state.current;
    if (Math.abs(progress - current.progress) < 0.0004) return;
    current.progress = progress;

    const section = sectionRef.current;
    if (section) section.style.setProperty('--hero-progress', progress.toFixed(4));

    const exit = 1 - clamp01((progress - EXIT_START) / (EXIT_END - EXIT_START));
    let actionsVisible = 0;

    (Object.keys(LINES) as LineKey[]).forEach(key => {
      const { start, end } = LINES[key];
      const element = lineRefs.current[key];
      if (!element) return;
      const strength = clamp01((progress - start) / (end - start)) * exit;
      element.style.setProperty('--o', strength.toFixed(3));
      element.style.setProperty('--y', `${((1 - strength) * 12).toFixed(2)}px`);
      element.classList.toggle('is-hidden', strength < 0.012);
      if (key === 'actions') actionsVisible = strength;
    });

    // Buttons only become clickable once they are actually on screen.
    copyRef.current?.classList.toggle('is-interactive', actionsVisible > 0.6);

    // The wordmark types itself out as the lid comes up.
    if (typedRef.current) {
      typedRef.current.style.setProperty('--typed', clamp01((progress - 0.09) / 0.09).toFixed(3));
    }

    requestPaint();
  }, [requestPaint]);

  const sync = useCallback(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const travel = rect.height - (stage?.offsetHeight || window.innerHeight);
    applyProgress(travel > 0 ? clamp01(-rect.top / travel) : 0);
  }, [applyProgress]);

  const requestSync = useCallback(() => {
    const current = state.current;
    if (current.frame) return;
    current.frame = window.requestAnimationFrame(() => {
      current.frame = 0;
      sync();
    });
  }, [sync]);

  /**
   * Size the canvas from its own CSS box and publish the drawn geometry as CSS
   * variables. The copy is positioned from those variables, so it always sits
   * inside the screen — no duplicated magic numbers between canvas and CSS.
   */
  useEffect(() => {
    if (staticMode) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const current = state.current;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      current.width = Math.round(rect.width);
      current.height = Math.round(rect.height);
      current.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      current.drawn = -1;

      const metrics = laptopMetrics(current.width, current.height);
      stage.dataset.layout = metrics.mode;
      stage.style.setProperty('--lid-w', `${Math.round(metrics.lidW)}px`);
      stage.style.setProperty('--lid-h', `${Math.round(metrics.lidH)}px`);
      stage.style.setProperty('--screen-top', `${Math.round(metrics.screenTop)}px`);
      stage.style.setProperty('--hinge-y', `${Math.round(metrics.hingeY)}px`);
      requestPaint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [requestPaint, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    sync();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    const onVisibility = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      document.removeEventListener('visibilitychange', onVisibility);
      if (state.current.frame) window.cancelAnimationFrame(state.current.frame);
      state.current.frame = 0;
    };
  }, [staticMode, requestSync, sync]);

  const bindLine = (key: LineKey) => (node: HTMLElement | null) => {
    lineRefs.current[key] = node;
  };

  const copy = (
    <div className={`hero-copy hero-copy--stage${staticMode ? ' is-static' : ''}`} ref={copyRef}>
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
  );

  if (staticMode) {
    return (
      <section className="hero hero--static" aria-labelledby="hero-heading">
        <div className="hero-static-inner container">
          {copy}
          <div className="hero-static-visual">
            <StillLaptop />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-track" ref={sectionRef} aria-labelledby="hero-heading">
      <div className="hero-stage" ref={stageRef} data-layout="overlay">
        <div className="stage-grid" aria-hidden="true" />
        <div className="hero-stage-glow" aria-hidden="true" />
        <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
        {copy}
        <p className="hero-scroll-cue" aria-hidden="true">
          <span className="hero-cue-line" />
          Scroll to open
          <Icon name="arrow-down" size={13} />
        </p>
        <SiteLink href="/#story" className="hero-skip">Skip to the build story<Icon name="arrow" size={13} /></SiteLink>
      </div>
    </section>
  );
}

/** One settled, open frame — reduced motion and very short viewports. */
function StillLaptop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawLaptopScene(ctx, { width: rect.width, height: rect.height, dpr, progress: 0.46 });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="hero-canvas hero-canvas--static" aria-hidden="true" />;
}
