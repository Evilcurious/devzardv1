import { useEffect, useRef } from 'react';
import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Dashboard } from './Dashboard';
import { Icon, Reveal } from './ui';

/**
 * Gentle scroll parallax for the hero product. Deliberately small (max 46px),
 * rAF-batched, desktop-only and disabled for reduced motion, so it reads as
 * depth rather than movement.
 */
function useHeroParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia('(min-width: 900px)');
    let frame = 0;
    let offset = -1;

    const apply = () => {
      frame = 0;
      if (motion.matches || !wide.matches) {
        if (offset !== 0) { element.style.transform = ''; offset = 0; }
        return;
      }
      const distance = Math.min(1, Math.max(0, window.scrollY / 620));
      const next = Math.round(-distance * 46 * 10) / 10;
      if (next === offset) return;
      offset = next;
      element.style.transform = `translate3d(0, ${next}px, 0)`;
    };

    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(apply); };

    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', schedule);
    wide.addEventListener('change', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', schedule);
      wide.removeEventListener('change', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

export function Hero() {
  const { content } = useContent();
  const home = content.homepage;
  const parallaxRef = useHeroParallax();
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-copy container">
        <h1 id="hero-heading"><span className="hero-brand hero-enter">{home.heroBrand}<span>.</span></span><span className="hero-headline hero-enter">{home.heroHeadline}<br /><span>{home.heroHeadlineAccent}</span></span></h1>
        <p className="hero-description hero-enter">{home.heroSubtitle}</p>
        <div className="hero-ctas hero-enter"><SiteLink href={home.heroCtaLink} className="button button-primary">{home.heroCta}<Icon name="arrow" size={17} /></SiteLink><SiteLink href={home.heroSecondaryLink} className="button button-quiet">{home.heroSecondary}<Icon name="arrow-down" size={16} /></SiteLink></div>
      </div>
      <div className="hero-product-stage">
        <div className="stage-grid" aria-hidden="true" />
        <div className="hero-parallax" ref={parallaxRef}><div className="hero-product-wrap hero-enter"><Dashboard /></div></div>
        <div className="product-caption"><span><Icon name="code" size={13} />Not just a website. A working system.</span><span>DESIGNED & BUILT BY DEVZARD</span></div>
        <SiteLink href="/#story" className="hero-scroll-cue"><span className="hero-cue-line" aria-hidden="true" />Scroll inside the build<Icon name="arrow-down" size={13} /></SiteLink>
      </div>
    </section>
  );
}

export function TrustStrip() {
  return <section className="trust-strip container" aria-label="One connected workflow"><Reveal><p className="workflow">From idea<Icon name="arrow" /><span>design</span><Icon name="arrow" /><span>development</span><Icon name="arrow" /><span>deployment</span><span className="workflow-period">.</span></p><p>One team. One workflow. A product that actually ships.</p></Reveal></section>;
}

export function Principles() {
  const { content } = useContent();
  return <section className="principles container" aria-label="Our principles">{content.homepage.principles.map((principle, index) => <Reveal className="principle" key={principle.id} delay={index * 90}><div className="principle-top"><span className="mono">0{index + 1}</span><Icon name={principle.icon} size={25} /></div><h2>{principle.title}</h2><p>{principle.description}</p></Reveal>)}</section>;
}
