import { useContent } from '../cms/context';
import { Dashboard } from './Dashboard';
import { Icon, Reveal } from './ui';

/**
 * The workspace preview that used to sit inside the hero. It keeps its own
 * band directly below the scroll stage: the laptop hands over the pitch, then
 * this shows the kind of system the pitch is about.
 */
export function HeroProduct() {
  return (
    <section className="hero-product" aria-label="Interactive workspace preview">
      <div className="stage-grid" aria-hidden="true" />
      <div className="hero-product-wrap container">
        <Dashboard />
      </div>
      <div className="product-caption container">
        <span><Icon name="code" size={13} />Not just a website. A working system.</span>
        <span>DESIGNED &amp; BUILT BY DEVZARD</span>
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
