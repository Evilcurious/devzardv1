import { useEffect, useRef, useState } from 'react';
import { useContent } from '../cms/context';
import { cn } from '../utils/cn';
import { SiteLink } from '../lib/navigation';
import { BrandMark, Icon, Reveal, SectionLabel } from './ui';

export function Process() {
  const { content } = useContent();
  const processFlow = content.homepage.processSteps;
  const ref = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      const r = el.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const p = (mid - r.top) / r.height;
      setProgress(Math.max(0, Math.min(1, p)));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const percent = Math.round(progress * 100);

  return (
    <section id="process" className="process-section section-space" aria-labelledby="process-heading">
      <div className="container process-layout">
        <div className="process-intro">
          <Reveal>
            <SectionLabel>03 / How we work</SectionLabel>
            <h2 id="process-heading" className="section-heading process-title">{content.homepage.processTitle}</h2>
            <p className="process-subtitle">{content.homepage.processSubtitle}</p>
          </Reveal>
          <Reveal delay={200}>
            <div className="process-progress">
              <span className="mono">PROGRESS</span>
              <span className="progress-track" aria-hidden="true"><span className="progress-fill" style={{ width: `${progress * 100}%` }} /></span>
              <span className="progress-value mono">{percent}%</span>
            </div>
          </Reveal>
        </div>
        <ol ref={ref} className="process-steps">
          <span className="process-line" aria-hidden="true" />
          <span className="process-line-progress" aria-hidden="true" style={{ height: `calc(${progress * 100}% - 8px)` }} />
          {processFlow.map((step, index) => {
            const reached = progress >= (index + 0.5) / processFlow.length;
            return (
              <li key={step.n} className="process-step">
                <span className={cn('step-node', reached && 'reached')}>{step.n}</span>
                <Reveal>
                  <div className={cn('step-card', reached && 'reached')}>
                    <div className="step-card-top">
                      <h3>{step.title}</h3>
                      <span className={cn('step-meta mono', reached && 'reached')}>{step.meta}</span>
                    </div>
                    <p>{step.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function Technology() {
  const { content } = useContent();
  const stack = content.technologies.filter(item => item.published).sort((a, b) => a.order - b.order);
  return <section className="technology-section"><div className="container technology-grid"><Reveal><SectionLabel>Engineering with intent</SectionLabel><h2>We build custom systems across a wide range of technologies and platforms.</h2><p>We choose the stack based on the product,<br />not the trend.</p></Reveal><Reveal className="stack-editor" delay={100}><div className="stack-editor-top"><span><Icon name="code" size={14} />stack.config</span><span className="mono">DEVZARD / ENGINEERING</span></div><div className="stack-code"><div className="code-comment"><span>01</span><code>// The right tool for the job.</code></div><div className="code-brace"><span>02</span><code>{'{'}</code></div>{stack.map((item, index) => <div className="stack-row" key={item.id}><span className="code-line-number">{String(index + 3).padStart(2, '0')}</span><span className="stack-category"><Icon name={item.icon} size={14} />{item.category}</span><span className="stack-value">{item.name}</span></div>)}<div className="code-brace"><span>{String(stack.length + 3).padStart(2, '0')}</span><code>{'}'}</code></div></div><div className="stack-editor-footer"><span><i className="status-dot" />Purpose-built. Production-ready.</span><Icon name="check" size={13} /></div></Reveal></div></section>;
}

export function WhyDevzard() {
  const reasons = [
    { title: 'Direct communication', text: 'Work directly with the people building your product.', icon: 'users' as const },
    { title: 'Built around your requirements', text: 'No unnecessary templates. No bloated packages.', icon: 'target' as const },
    { title: 'Fast iteration', text: 'Build, test, improve. Working software over endless meetings.', icon: 'bolt' as const },
    { title: 'A long-term mindset', text: "We don't disappear after deployment. We build for what comes next.", icon: 'layers' as const },
  ];
  const { content, imageUrl } = useContent();
  const team = content.team.filter(item => item.published).sort((a, b) => a.order - b.order);
  return (
    <section id="about" className="about-section section-space">
      <div className="container">
        <div className="about-grid">
          <Reveal className="about-copy"><SectionLabel>04 / A different kind of team</SectionLabel><h2 className="section-heading">Why Devzard?</h2><p className="about-statement">Small by design.<br />Serious by default.</p><p className="about-description">We're a small team of developers who care about what we put into the world. Less passing things around. More getting things built.</p><BrandMark className="about-mark" /><span className="about-footnote mono">YOUR TEAM. NOT A TICKET NUMBER.</span></Reveal>
          <div className="reasons-list">{reasons.map((reason, index) => <Reveal className="reason" key={reason.title} delay={index * 70}><Icon name={reason.icon} size={22} /><div><h3>{reason.title}</h3><p>{reason.text}</p></div><span className="mono">0{index + 1}</span></Reveal>)}</div>
        </div>
        <div id="team" className="team-block">
          <Reveal className="team-heading"><SectionLabel>The people</SectionLabel><h2 className="section-heading team-title">The team.</h2><p className="team-intro">No account managers. No layers. Your project is scoped, built, and supported by these three.</p></Reveal>
          <div className="team-grid">
            {team.map((member, index) => (
              <Reveal className="team-card" key={member.id} delay={index * 80}>
                {imageUrl(member.imageId) ? <img className="team-avatar-image" src={imageUrl(member.imageId)} alt="" /> : <span className="team-avatar" aria-hidden="true">{member.initials}</span>}
                <div><h3>{member.name}</h3><span className="team-role mono">{member.role}</span>{member.biography && <p className="team-bio">{member.biography}</p>}</div>
                <span className="team-index mono" aria-hidden="true">0{index + 1}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const { content } = useContent();
  const home = content.homepage;
  return <section className="final-cta"><div className="cta-grid" aria-hidden="true" /><Reveal className="container final-cta-inner"><SectionLabel>{home.finalCtaLabel}</SectionLabel><h2>{home.finalCtaTitle}<br /><span>{home.finalCtaAccent}</span></h2><p>{home.finalCtaText}</p><div className="hero-ctas"><SiteLink href="/#contact" className="button button-primary">{home.finalCtaButton}<Icon name="arrow" size={17} /></SiteLink><a href="#contact" className="button button-quiet">{home.finalCtaSecondary}<Icon name="arrow-up" size={16} /></a></div></Reveal></section>;
}

export function Testimonials() {
  const { content, imageUrl } = useContent();
  const quotes = content.testimonials.filter(item => item.published).sort((a, b) => a.order - b.order);
  if (quotes.length === 0) return null;
  return <section className="quotes-section container" aria-labelledby="quotes-heading"><Reveal><SectionLabel>From people we work with</SectionLabel><h2 id="quotes-heading" className="section-heading">What they said.</h2></Reveal><div className="quotes-grid">{quotes.map(item => <Reveal className="quote-card" key={item.id}><p>“{item.quote}”</p><footer>{imageUrl(item.imageId) && <img src={imageUrl(item.imageId)} alt="" />}<strong>{item.clientName}</strong>{[item.role, item.company].filter(Boolean).join(' / ')}</footer></Reveal>)}</div></section>;
}
