import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon } from './ui';
import { drawStackScene, stackExplode, stackLayout, type LayerId } from './stackScene';

/**
 * The stack: frontend, backend, database, security — one system, four layers,
 * centred on the page.
 *
 * The section is a tall track with a pinned stage, exactly like the hero. The
 * diagram sits in the middle of the stage, the chapter that is being read sits
 * underneath it, and the drawing separates a little further as each layer is
 * named so the words and the plate always point at the same thing.
 *
 * Scroll never touches React state: one rAF-batched pass reads the position and
 * writes to the canvas and the overlays directly.
 */

interface Chapter {
  at: number;
  half: number;
  tag: string;
  title: string;
  body: string;
  notes: Array<[string, string]>;
}

const CHAPTERS: Chapter[] = [
  {
    at: 0.16,
    half: 0.11,
    tag: '01 / Frontend',
    title: 'Interfaces people can use.',
    body: 'Fast, responsive screens built around the way your customers actually work — designed in the browser, not bolted on afterwards.',
    notes: [
      ['React', 'interfaces'],
      ['accessibility', 'keyboard, contrast, semantics'],
      ['responsive', 'phone to desktop'],
    ],
  },
  {
    at: 0.4,
    half: 0.11,
    tag: '02 / Backend',
    title: 'Logic that holds up.',
    body: 'The rules of your business live in one place: an API your website, dashboard and mobile app all talk to, so nothing has to be re-implemented twice.',
    notes: [
      ['Node / Spring', 'services'],
      ['REST', 'integrations'],
      ['jobs', 'reports, exports, sync'],
    ],
  },
  {
    at: 0.64,
    half: 0.11,
    tag: '03 / Database',
    title: 'One source of truth.',
    body: 'A real schema instead of spreadsheets: related data, migrations that are safe to run, and queries fast enough for the dashboard to stay open all day.',
    notes: [
      ['PostgreSQL', 'relational data'],
      ['migrations', 'versioned, reversible'],
      ['backups', 'restore-tested'],
    ],
  },
  {
    at: 0.87,
    half: 0.12,
    tag: '04 / Security',
    title: 'Safe by default.',
    body: 'Roles decide who sees what, sessions expire, secrets stay on the server, and every sensitive action leaves a record you can read back.',
    notes: [
      ['roles', 'permissions per screen'],
      ['sessions', 'server-side, expiring'],
      ['audit', 'who changed what, when'],
    ],
  },
];

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

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

/** The layer a chapter belongs to. */
const CHAPTER_LAYER = [0, 1, 2, 3];

/** Names beside the drawing, always legible whatever the canvas scale. */
interface LayerLabel {
  part: LayerId;
  name: string;
  detail: string;
}

const LAYER_LABELS: LayerLabel[] = [
  { part: 'frontend', name: 'Frontend', detail: 'react · responsive ui' },
  { part: 'backend', name: 'Backend', detail: 'api · jobs · integrations' },
  { part: 'database', name: 'Database', detail: 'postgres · migrations' },
  { part: 'security', name: 'Security', detail: 'roles · sessions · audit' },
];

/** Width reserved for a label, in CSS pixels. */
const LABEL_W = 148;

export function StackStory() {
  const { content } = useContent();
  const reduced = usePrefersReducedMotion();

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const railRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const progressRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);

  const state = useRef({
    progress: 0,
    explode: 0,
    active: 0,
    time: 0,
    cw: 0,
    ch: 0,
    dpr: 1,
    visible: true,
    raf: 0,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const current = state.current;
    if (!canvas || current.cw < 2 || current.ch < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawStackScene(ctx, {
      width: current.cw,
      height: current.ch,
      dpr: current.dpr,
      explode: current.explode,
      active: current.active,
      time: current.time,
    });
    canvas.classList.add('is-ready');
  }, []);

  const sync = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const current = state.current;
    if (!track || !stage) return;

    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, rect.height - stage.getBoundingClientRect().height);
    const progress = clamp01(-rect.top / travel);
    const previous = current.progress;
    const explode = stackExplode(progress);

    // The chapter that is being read decides which plate lights up.
    let active = 0;
    let best = -1;
    CHAPTERS.forEach((chapter, index) => {
      const strength = 1 - Math.abs(progress - chapter.at) / chapter.half;
      if (strength > best) {
        best = strength;
        active = index;
      }
    });

    current.progress = progress;
    current.explode = explode;
    current.active = CHAPTER_LAYER[active];
    const activeLayer = CHAPTER_LAYER[active];

    CHAPTERS.forEach((chapter, index) => {
      const node = chapterRefs.current[index];
      if (!node) return;
      const o = clamp01(1 - Math.abs(progress - chapter.at) / chapter.half);
      node.style.opacity = o.toFixed(3);
      node.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      node.style.transform = `translate3d(0, ${(1 - o) * 12}px, 0)`;
      const rail = railRefs.current[index];
      if (rail) rail.classList.toggle('is-on', o > 0.55);
    });

    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    }
    if (counterRef.current) {
      const label = `${String(active + 1).padStart(2, '0')} / ${String(CHAPTERS.length).padStart(2, '0')}`;
      if (counterRef.current.textContent !== label) counterRef.current.textContent = label;
    }

    // Labels ride with their plate, so a name never points at the wrong layer.
    if (figureRef.current && current.cw > 0) {
      const layout = stackLayout(current.cw, current.ch, explode);
      LAYER_LABELS.forEach((label, index) => {
        const node = labelRefs.current[index];
        const part = layout.parts.find(item => item.id === label.part);
        if (!node || !part) return;
        const right = layout.ox + (part.x + part.w + 6) * layout.s;
        const y = layout.oy + (part.y + part.h * 0.5) * layout.s;
        const flip = right + LABEL_W > current.cw - 4;
        const x = flip ? layout.ox + (part.x - 6) * layout.s - LABEL_W : right;
        node.classList.toggle('is-flipped', flip);
        node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        node.style.opacity = index === activeLayer ? '1' : '0.55';
      });
    }

    if (Math.abs(progress - previous) > 0.0004) paint();
  }, [paint]);

  const requestSync = useCallback(() => {
    const current = state.current;
    if (current.raf) return;
    current.raf = window.requestAnimationFrame(() => {
      current.raf = 0;
      sync();
    });
  }, [sync]);

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

  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onScroll = () => requestSync();
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

    const idle = window.setInterval(() => {
      const current = state.current;
      if (document.hidden || !current.visible) return;
      current.time += 90;
      paint();
    }, 90);

    requestSync();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      window.clearInterval(idle);
      const current = state.current;
      if (current.raf) window.cancelAnimationFrame(current.raf);
      current.raf = 0;
    };
  }, [paint, reduced, requestSync, sync]);

  /** Rail buttons scroll the page to their chapter. */
  const goToChapter = (index: number) => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    const travel = Math.max(1, track.offsetHeight - stage.offsetHeight);
    const top = track.offsetTop + travel * CHAPTERS[index].at;
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const chapter = (item: Chapter, index: number) => (
    <>
      <p className="stack-tag">{item.tag}</p>
      <h2>{item.title}</h2>
      <p className="stack-body">{item.body}</p>
      <ul className="stack-notes">
        {item.notes.map(([name, detail]) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>{detail}</span>
          </li>
        ))}
      </ul>
      {index === CHAPTERS.length - 1 && (
        <div className="stack-actions">
          <SiteLink href="/#services" className="button button-primary">
            {content.homepage.heroCta}
            <Icon name="arrow" size={16} />
          </SiteLink>
          <SiteLink href="/#process" className="button button-quiet">
            How we work
            <Icon name="arrow-down" size={15} />
          </SiteLink>
        </div>
      )}
    </>
  );

  if (reduced) {
    return (
      <section id="story" className="stack-hero stack-hero--static" aria-labelledby="stack-heading">
        <div className="stack-stage stack-stage--static">
          <div className="stack-grid" aria-hidden="true" />
          <div className="stack-glow" aria-hidden="true" />
          <h2 className="stack-heading" id="stack-heading">How it is built</h2>
          <p className="stack-intro">
            Frontend, backend, database and security. One system, designed and built by the same
            team that keeps it running.
          </p>
          <div className="stack-figure">
            <StaticStack />
          </div>
        </div>
        <div className="stack-chapters container">
          {CHAPTERS.map((item, index) => (
            <article key={item.tag}>{chapter(item, index)}</article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="story" className="stack-hero" ref={trackRef} aria-labelledby="stack-heading">
      <div className="stack-stage" ref={stageRef}>
        <div className="stack-grid" aria-hidden="true" />
        <div className="stack-glow" aria-hidden="true" />

        <div className="stack-hud" aria-hidden="true">
          <span className="stack-hud-left">
            <span className="stack-hud-mark" />
            DEVZARD / SYSTEM STACK
          </span>
          <span className="stack-hud-count" ref={counterRef}>01 / 04</span>
        </div>

        <h2 className="stack-heading" id="stack-heading">
          How it is built
          <span className="sr-only"> — frontend, backend, database and security</span>
        </h2>

        <div className="stack-figure" ref={figureRef}>
          <canvas ref={canvasRef} className="stack-canvas" aria-hidden="true" />
          <div className="stack-labels" aria-hidden="true">
            {LAYER_LABELS.map((label, index) => (
              <div
                className="stack-label"
                key={label.part}
                ref={node => { labelRefs.current[index] = node; }}
              >
                <span className="stack-label-name">{label.name}</span>
                <span className="stack-label-detail">{label.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack-chapters">
          {CHAPTERS.map((item, index) => (
            <div
              className="stack-chapter"
              key={item.tag}
              ref={node => { chapterRefs.current[index] = node; }}
            >
              {chapter(item, index)}
            </div>
          ))}
        </div>

        <div className="stack-rail" aria-label="Stack chapters">
          {CHAPTERS.map((item, index) => (
            <button
              key={item.tag}
              type="button"
              ref={node => { railRefs.current[index] = node; }}
              onClick={() => goToChapter(index)}
              aria-label={`${item.tag}: ${item.title}`}
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </div>

        <div className="stack-progress" aria-hidden="true">
          <span className="stack-progress-fill" ref={progressRef} />
        </div>
      </div>
    </section>
  );
}

/** One closed stack, for the reduced-motion variant. */
function StaticStack() {
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
      drawStackScene(ctx, {
        width: rect.width,
        height: rect.height,
        dpr,
        explode: 1,
        active: -1,
        time: 0,
        still: true,
      });
      canvas.classList.add('is-ready');
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="stack-canvas" aria-hidden="true" />;
}
