import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import { drawDeviceScene } from './deviceScene';

/**
 * Scroll-driven "inside the build" experience.
 *
 * The section is a tall track; the stage inside it is pinned with CSS
 * `position: sticky`, and a single passive scroll listener maps the track's
 * progress to a canvas frame. Nothing here goes through React state on scroll:
 * captions, dots and the canvas are written to directly from one rAF-batched
 * paint, so scrolling never triggers a re-render.
 */

/**
 * Optional raster image sequence.
 *
 * The scene ships as vector art (`deviceScene.ts`) because it stays crisp at
 * every size and needs no downloads. To use a pre-rendered sequence instead,
 * drop zero-padded frames into `public/images/devzard-sequence/`, set
 * `enabled: true` and `frames` to the number of files, and list the still image
 * to fall back to. See README → "Scroll experience".
 */
export const SEQUENCE = {
  enabled: false,
  directory: '/images/devzard-sequence',
  pattern: 'frame_',
  extension: 'webp',
  pad: 4,
  frames: 0,
  fallbackImage: '/images/devzard-social.jpg',
} as const;

interface Chapter {
  /** Scroll position (0–1) where this chapter is fully visible. */
  at: number;
  align: 'center' | 'left' | 'right';
  index: string;
  title: string;
  body: string;
  cta?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    at: 0,
    align: 'center',
    index: '01 / Introduction',
    title: 'Ideas Into Impact.',
    body: 'We combine strategy, design, and technology to create digital experiences that matter.',
  },
  {
    at: 0.32,
    align: 'left',
    index: '02 / Innovation',
    title: 'Engineered for Possibility.',
    body: 'Every detail has a purpose. Every interaction brings your vision closer to reality.',
  },
  {
    at: 0.62,
    align: 'right',
    index: '03 / Technology',
    title: 'Power Beneath the Surface.',
    body: 'Smart systems, thoughtful engineering, and intelligent technology work together to create exceptional results.',
  },
  {
    at: 0.9,
    align: 'center',
    index: '04 / Completion',
    title: 'Your Next Chapter Starts Here.',
    body: "Ready to build something exceptional? Let's make it happen with Devzard.",
    cta: true,
  },
];

/** Half-width of each chapter's fade window, in scroll progress. */
const CHAPTER_WINDOW = 0.17;

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Fade weight for a chapter at a given progress. The first and last chapters
 * are clamped at the ends so the opening and closing lines can sit fully
 * visible at 0% and 100%, instead of fading out into the section edges.
 */
function chapterStrength(index: number, progress: number) {
  const { at } = CHAPTERS[index];
  if (index === 0) return clamp01(1 - Math.max(0, progress - at) / CHAPTER_WINDOW);
  if (index === CHAPTERS.length - 1) return clamp01(1 - Math.max(0, at - progress) / CHAPTER_WINDOW);
  return clamp01(1 - Math.abs(progress - at) / CHAPTER_WINDOW);
}

function framePath(index: number) {
  return `${SEQUENCE.directory}/${SEQUENCE.pattern}${String(index).padStart(SEQUENCE.pad, '0')}.${SEQUENCE.extension}`;
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

export function DevzardScrollExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = usePrefersReducedMotion();

  // Mutable render state. Kept out of React on purpose: scroll must not cause
  // re-renders, and the canvas only repaints when something actually changed.
  const state = useRef({
    progress: -1,
    drawnProgress: -1,
    width: 0,
    height: 0,
    dpr: 1,
    sequence: [] as HTMLImageElement[],
    sequenceReady: false,
    sequenceFailed: false,
    rafPaint: 0,
    rafSync: 0,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    current.rafPaint = 0;
    if (!canvas || current.width <= 0 || current.height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = current.progress < 0 ? 0 : current.progress;
    if (Math.abs(progress - current.drawnProgress) < 0.0004) return;
    current.drawnProgress = progress;

    if (current.sequenceReady && current.sequence.length > 0) {
      // Raster sequence mode: pick the nearest preloaded frame.
      const last = current.sequence.length - 1;
      const frame = current.sequence[Math.min(last, Math.max(0, Math.round(progress * last)))];
      ctx.setTransform(current.dpr, 0, 0, current.dpr, 0, 0);
      ctx.clearRect(0, 0, current.width, current.height);
      if (frame?.complete && frame.naturalWidth > 0) {
        const scale = Math.min(current.width / frame.naturalWidth, current.height / frame.naturalHeight);
        const drawWidth = frame.naturalWidth * scale;
        const drawHeight = frame.naturalHeight * scale;
        ctx.drawImage(frame, (current.width - drawWidth) / 2, (current.height - drawHeight) / 2, drawWidth, drawHeight);
      }
      return;
    }

    drawDeviceScene(ctx, {
      width: current.width,
      height: current.height,
      dpr: current.dpr,
      progress,
      reduced,
    });
  }, [reduced]);

  const requestPaint = useCallback(() => {
    const current = state.current;
    if (current.rafPaint) return;
    current.rafPaint = window.requestAnimationFrame(paint);
  }, [paint]);

  /** Read scroll position and push it into captions, dots and the canvas. */
  const sync = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const stage = stageRef.current;
    const travel = rect.height - (stage?.offsetHeight || window.innerHeight);
    const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;
    const current = state.current;
    if (Math.abs(progress - current.progress) < 0.0002) return;
    current.progress = progress;

    CHAPTERS.forEach((_chapter, index) => {
      const element = captionRefs.current[index];
      if (!element) return;
      const strength = chapterStrength(index, progress);
      element.style.setProperty('--o', strength.toFixed(3));
      element.style.setProperty('--y', `${((1 - strength) * 16).toFixed(2)}px`);
      element.classList.toggle('is-hidden', strength < 0.02);
    });

    let active = 0;
    CHAPTERS.forEach((chapter, index) => {
      if (progress >= chapter.at - CHAPTER_WINDOW / 2) active = index;
    });
    dotRefs.current.forEach((dot, index) => dot?.classList.toggle('is-current', index === active));
    section.style.setProperty('--story-progress', progress.toFixed(4));

    requestPaint();
  }, [requestPaint]);

  const requestSync = useCallback(() => {
    // Coalesce bursts of scroll events into one measurement per frame. Kept on
    // its own handle so a scroll arriving mid-paint still gets measured.
    if (state.current.rafSync) return;
    state.current.rafSync = window.requestAnimationFrame(() => {
      state.current.rafSync = 0;
      sync();
    });
  }, [sync]);

  // Size the backing store from the canvas' own CSS box (which CSS controls via
  // insets) and the device pixel ratio. The display size is never written from
  // JS, so there is no measure → style → measure loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const current = state.current;
      current.width = Math.round(rect.width);
      current.height = Math.round(rect.height);
      current.dpr = dpr;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      current.drawnProgress = -1;
      requestPaint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [requestPaint]);

  // Scroll + visibility wiring, batched through requestAnimationFrame.
  useEffect(() => {
    sync();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    const onVisibility = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      document.removeEventListener('visibilitychange', onVisibility);
      if (state.current.rafSync) window.cancelAnimationFrame(state.current.rafSync);
      if (state.current.rafPaint) window.cancelAnimationFrame(state.current.rafPaint);
      state.current.rafSync = 0;
      state.current.rafPaint = 0;
    };
  }, [requestSync, sync]);

  // Optional image sequence preload. Dormant unless SEQUENCE.enabled is set.
  useEffect(() => {
    if (!SEQUENCE.enabled || SEQUENCE.frames <= 0) return;
    let cancelled = false;
    const current = state.current;
    const images: HTMLImageElement[] = [];
    let loaded = 0;
    let failed = 0;

    for (let index = 1; index <= SEQUENCE.frames; index += 1) {
      const image = new Image();
      image.decoding = 'async';
      image.src = framePath(index);
      image.onload = () => {
        if (cancelled) return;
        loaded += 1;
        if (loaded === SEQUENCE.frames) {
          current.sequence = images;
          current.sequenceReady = true;
          current.drawnProgress = -1;
          requestPaint();
        }
      };
      image.onerror = () => {
        if (cancelled) return;
        failed += 1;
        if (failed > 2) current.sequenceFailed = true;
      };
      images.push(image);
    }

    return () => {
      cancelled = true;
      current.sequenceReady = false;
      current.sequence = [];
    };
  }, [requestPaint]);

  // Reduced motion: no pinning, no scroll mapping — the same artwork as a
  // still, followed by the story as regular, readable content.
  if (reduced) {
    return (
      <section className="story story--static" aria-labelledby="story-heading-static">
        <div className="story-static-inner container">
          <div className="story-static-visual">
            <StaticScene />
          </div>
          <div className="story-static-copy">
            <p className="section-label"><span className="label-cross">+</span>Inside the build</p>
            <h2 id="story-heading-static">From idea to production.</h2>
            <p className="story-static-lede">
              Every product Devzard ships is built in layers: strategy, interface, systems, and the services that keep it running.
            </p>
            <div className="story-static-grid">
              {CHAPTERS.map(chapter => (
                <article key={chapter.title}>
                  <p className="story-eyebrow">{chapter.index}</p>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.body}</p>
                  {chapter.cta && <SiteLink href="/#contact" className="text-link">Start Your Project<Icon name="arrow" size={15} /></SiteLink>}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="story" ref={sectionRef} aria-labelledby="story-heading">
      <div className="story-stage" ref={stageRef}>
        <div className="story-glow" aria-hidden="true" />
        <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />
        <h2 className="sr-only" id="story-heading">Inside the build</h2>
        <p className="sr-only">
          Devzard build story: as you scroll, the product separates into its interface, frame, circuit board,
          processing core and chassis, then reassembles.
        </p>

        <div className="story-captions">
          {CHAPTERS.map((chapter, index) => (
            <div
              key={chapter.title}
              className={`story-caption story-caption--${chapter.align}`}
              ref={node => { captionRefs.current[index] = node; }}
            >
              <div className="story-caption-inner">
                <p className="story-eyebrow">{chapter.index}</p>
                <h2>{chapter.title}</h2>
                <p className="story-body">{chapter.body}</p>
                {chapter.cta && (
                  <SiteLink href="/#contact" className="button button-primary story-cta">
                    Start Your Project
                    <Icon name="arrow" size={16} />
                  </SiteLink>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="story-rail" role="group" aria-label="Story chapters">
          <span className="story-rail-track" aria-hidden="true"><span className="story-rail-fill" /></span>
          {CHAPTERS.map((chapter, index) => (
            <button
              key={chapter.title}
              type="button"
              className="story-dot"
              ref={node => { dotRefs.current[index] = node; }}
              aria-label={`Go to chapter ${index + 1}: ${chapter.title}`}
              onClick={() => {
                const section = sectionRef.current;
                if (!section) return;
                const travel = section.offsetHeight - (stageRef.current?.offsetHeight || window.innerHeight);
                window.scrollTo({
                  top: section.offsetTop + travel * chapter.at,
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                });
              }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>

        <p className="story-hint" aria-hidden="true">
          <span className="story-hint-line" />
          Scroll to separate
        </p>
      </div>
    </section>
  );
}

/** One static, fully assembled frame for the reduced-motion variant. */
function StaticScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawDeviceScene(ctx, { width: rect.width, height: rect.height, dpr, progress: 0, reduced: true });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />;
}
