import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Dashboard } from './Dashboard';
import { Icon, Reveal } from './ui';

export function Hero() {
  const { content } = useContent();
  const home = content.homepage;
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-copy container">
        <h1 id="hero-heading"><span className="hero-brand hero-enter">{home.heroBrand}<span>.</span></span><span className="hero-headline hero-enter">{home.heroHeadline}<br /><span>{home.heroHeadlineAccent}</span></span></h1>
        <p className="hero-description hero-enter">{home.heroSubtitle}</p>
        <div className="hero-ctas hero-enter"><SiteLink href={home.heroCtaLink} className="button button-primary">{home.heroCta}<Icon name="arrow" size={17} /></SiteLink><SiteLink href={home.heroSecondaryLink} className="button button-quiet">{home.heroSecondary}<Icon name="arrow-down" size={16} /></SiteLink></div>
      </div>
      <div className="hero-product-stage">
        <div className="stage-grid" aria-hidden="true" />
        <div className="hero-product-wrap hero-enter"><Dashboard /></div>
        <div className="product-caption"><span><Icon name="code" size={13} />Not just a website. A working system.</span><span>DESIGNED & BUILT BY DEVZARD</span></div>
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
