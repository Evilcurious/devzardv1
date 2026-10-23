import { products, type Project } from '../data/site';
import { useContent } from '../cms/context';
import { publicProjects } from '../cms/public';
import { SiteLink } from '../lib/navigation';
import { Icon, Reveal, SectionLabel } from './ui';

export function StorefrontMockup({ showProducts = false }: { showProducts?: boolean }) {
  return <div className={`storefront-mockup${showProducts ? ' with-products' : ''}`} role="img" aria-label="Alwazir storefront concept: a warm, minimal home goods shop, with an editorial product hero and connected product catalog."><div className="storefront-browser"><div className="window-dots"><i /><i /><i /></div><span><Icon name="shield" size={9} />alwazir / storefront</span><Icon name="external" size={9} /></div><div className="storefront-header"><span className="storefront-wordmark">alwazir<span>.</span></span><div className="storefront-nav"><span>Shop all</span><span>Furniture</span><span>Objects</span><span>Our story</span></div><div><Icon name="search" size={14} /><Icon name="bag" size={14} /><small>0</small></div></div><div className="storefront-scene"><img src="/images/alwazir-living.jpg" alt="" loading="lazy" width="1536" height="1024" /><div className="storefront-copy"><span>CONSIDERED OBJECTS. EVERYDAY LIVING.</span><h3>Good things.<br />Made for living.</h3><p>Thoughtful pieces for the spaces<br />you call your own.</p><span className="storefront-cta">Explore the collection<Icon name="arrow" size={11} /></span></div><span className="storefront-image-caption">THE EVERYDAY COLLECTION / 2026</span></div><div className="storefront-collection"><span>Objects with purpose.</span><span>Discover what's new<Icon name="arrow" size={12} /></span></div>{showProducts && <div className="storefront-product-grid">{products.map(product => <div key={product.id}><img src={product.image} alt="" loading="lazy" style={{ objectPosition: product.position }} /><div><span>{product.name}</span><span>${product.price}</span></div><small>{product.category}</small></div>)}</div>}</div>;
}

const deephqMetrics = [
  { label: 'Return on Ad Spend', value: '4.8x', delta: '▲ 32%' },
  { label: 'Followers Growth', value: '+12.4k', delta: '▲ 18%' },
  { label: 'Cost per Lead', value: '$2.10', delta: '▼ 41%' },
];
const deephqStats = [
  { value: '5+', label: 'Brands Managed' },
  { value: '$100+', label: 'Ad Spend Optimized' },
  { value: '4.6x', label: 'Average ROAS' },
  { value: '24/7', label: 'AI Monitoring' },
];

// Presentation of the live deephq.online site, using the content and palette shown there.
export function DeepHQMockup() {
  return <div className="deephq-mockup" role="img" aria-label="DeepHQ website presentation: a blue hero for AI-driven social media and Meta Ads management, with a live campaign snapshot card and performance statistics."><div className="deephq-browser"><div className="window-dots"><i /><i /><i /></div><span><Icon name="shield" size={9} />deephq.online</span><Icon name="external" size={9} /></div><div className="deephq-header"><span className="deephq-wordmark">DEEP<span>.</span>HQ</span><div className="deephq-nav"><span>Home</span><span>Services</span><span>Reviews</span><i className="deephq-nav-cta">Order Now</i></div></div><div className="deephq-hero"><div className="deephq-hero-copy"><span className="deephq-eyebrow">AI-Powered Digital Marketing</span><h3>Grow Your Brand with <span>AI-Driven</span> Social Media &amp; Meta Ads</h3><p>We manage your social media accounts and run high-converting Meta Ads campaigns.</p><div className="deephq-hero-actions"><i className="deephq-btn deephq-btn-light">Get Started</i><i className="deephq-btn deephq-btn-outline">View Services</i></div></div><div className="deephq-card"><span>Live Campaign Snapshot</span><div className="deephq-metrics">{deephqMetrics.map(metric => <p key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.delta}</em></p>)}</div><div className="deephq-bars" aria-hidden="true">{[35, 50, 42, 65, 58, 80, 72, 95].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div></div><div className="deephq-stats">{deephqStats.map(stat => <p key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></p>)}</div></div>;
}

export function ProjectCard({ project }: { project: Project }) {
  const stage = (
    <div className="project-stage">
      <span className="project-stage-label">{project.id}</span>
      {project.visual.type === 'storefront' ? <StorefrontMockup /> : project.visual.type === 'deephq' ? <DeepHQMockup /> : project.visual.src ? <img className="project-custom-preview" src={project.visual.src} alt={project.visual.alt} loading="lazy" /> : <div className="project-custom-preview project-fallback">{project.name}</div>}
      <div className="project-preview-caption"><span>{project.category.toUpperCase()}</span><span>DESIGNED & BUILT BY DEVZARD</span></div>
      <span className="project-hover-arrow"><Icon name="arrow-up" size={23} /></span>
    </div>
  );
  const title = <div><p className="project-category">{project.category.toUpperCase()}</p><h3>{project.name}<span>.</span></h3></div>;
  const summary = <div className="project-summary"><p>{project.description}</p><div className="project-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>{project.visual.type === 'deephq' && <p className="project-source-note">Preview figures are reproduced from DeepHQ's website, not independently verified.</p>}</div>;

  if (project.externalUrl) {
    const host = project.externalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return (
      <Reveal>
        <a className="project-display project-split" href={project.externalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${project.name} at ${host}, opens in a new tab`}>
          {stage}
          <div className="project-information">
            {title}
            {summary}
            <span className="project-actions">
              <span className="project-case-link">Visit Website<Icon name="arrow-up" size={17} /></span>
              <span className="project-case-link project-visit">{host}<Icon name="external" size={14} /></span>
            </span>
          </div>
        </a>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <SiteLink className="project-display" href={`/work/${project.slug}`} aria-label={`View the ${project.name} case study`}>
        {stage}
        <div className="project-information">{title}{summary}<span className="project-case-link">View Case Study<Icon name="arrow-up" size={17} /></span></div>
      </SiteLink>
    </Reveal>
  );
}

export function FeaturedWork() {
  const { content, imageUrl } = useContent();
  const list: Project[] = publicProjects(content.projects).map(item => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category,
    description: item.shortDescription,
    tags: item.technologies,
    visual: item.visualType === 'deephq' ? { type: 'deephq' } : item.visualType === 'storefront' ? { type: 'storefront' } : { type: 'image', src: imageUrl(item.coverImageId), alt: item.name },
    externalUrl: item.projectUrl || undefined,
    featured: item.featured,
  }));
  return (
    <section id="work" className="work-section section-space">
      <div className="container">
        <Reveal><SectionLabel light>02 / Selected work</SectionLabel><div className="section-intro"><h2 className="section-heading">Built, not promised.</h2><p>Real projects. Real systems.<br />Real businesses.</p></div></Reveal>
        <div className="project-list">{list.map(project => <ProjectCard key={project.id} project={project} />)}</div>
        <Reveal className="work-closing"><p>The work speaks for itself.</p><SiteLink href="/#contact" className="text-link">Your project could be next<Icon name="arrow" size={15} /></SiteLink></Reveal>
      </div>
    </section>
  );
}
