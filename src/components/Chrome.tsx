import { useEffect, useState } from 'react';
import { useContent } from '../cms/context';
import { telHref } from '../cms/types';
import { SiteLink } from '../lib/navigation';
import { Icon, Modal, Wordmark } from './ui';

const navItems = ['Services', 'Work', 'Products', 'Process', 'About', 'Contact'];
const navHref = (item: string) => (item === 'Products' ? '/products' : `/#${item.toLowerCase()}`);

export function Navbar({ pathname }: { pathname: string }) {
  const { content, imageUrl } = useContent();
  const email = content.settings.email;
  const phone = content.settings.phone;
  const [scrolled, setScrolled] = useState(window.scrollY > 20);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState('');
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (window.scrollY < 180) setActive('');
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-15% 0px -65% 0px' });
    const timer = window.setTimeout(() => document.querySelectorAll('section[id]').forEach(section => observer.observe(section)), 100);
    return () => { window.removeEventListener('scroll', handleScroll); observer.disconnect(); window.clearTimeout(timer); };
  }, [pathname]);
  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="nav-container">
        <SiteLink className="brand-link" href="/" aria-label={`${content.settings.siteName} home`} onClick={() => setActive('')}>{imageUrl(content.settings.logoImageId) ? <img className="nav-logo-image" src={imageUrl(content.settings.logoImageId)} alt="" /> : <Wordmark />}</SiteLink>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map(item => {
            const isActive = (pathname === '/' && active === item.toLowerCase()) || (pathname.startsWith('/work') && item === 'Work') || (pathname === '/products' && item === 'Products');
            return <SiteLink key={item} href={navHref(item)} className={isActive ? 'active' : ''} aria-current={isActive ? 'location' : undefined}>{item}</SiteLink>;
          })}
        </nav>
        <div className="nav-right"><SiteLink className="button nav-cta" href="/#contact">Start a Project<Icon name="arrow-up" size={15} /></SiteLink><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileOpen}><Icon name="menu" size={23} /></button></div>
      </div>
      {mobileOpen && <Modal title="Navigation menu" onClose={() => setMobileOpen(false)} className="mobile-menu"><Wordmark /><nav aria-label="Mobile navigation">{navItems.map((item, index) => <SiteLink key={item} href={navHref(item)} onClick={() => setMobileOpen(false)}><span className="mono">0{index + 1}</span>{item}<Icon name="arrow-up" size={23} /></SiteLink>)}</nav><a className="mobile-email" href={`mailto:${email}`}>{email}<Icon name="arrow" size={18} /></a><a className="mobile-email" href={telHref(phone)}>{phone}<Icon name="phone" size={18} /></a></Modal>}
    </header>
  );
}

export function Footer({ onService }: { onService: (id: string) => void }) {
  const { content } = useContent();
  const [social, setSocial] = useState<string | null>(null);
  const email = content.settings.email;
  const phone = content.settings.phone;
  const profiles = { GitHub: content.settings.github || null, LinkedIn: content.settings.linkedin || null, X: content.settings.x || null };
  const services = content.services.filter(item => item.published).sort((a, b) => a.order - b.order);
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand"><SiteLink href="/" aria-label={`${content.settings.siteName} home`}><Wordmark /></SiteLink><p>{content.settings.footerText}</p><a href={`mailto:${email}`} className="footer-email"><span>{email}</span><Icon name="arrow-up" size={14} /></a><a href={telHref(phone)} className="footer-email"><span>{phone}</span><Icon name="phone" size={14} /></a></div>
        <div className="footer-column"><h3>Services</h3>{services.map(service => <button key={service.id} onClick={() => onService(service.id)}>{service.name}</button>)}</div>
        <div className="footer-column"><h3>Company</h3>{['About', 'Work', 'Process', 'Contact'].map(item => <SiteLink href={`/#${item.toLowerCase()}`} key={item}>{item}</SiteLink>)}</div>
        <div className="footer-column"><h3>Resources</h3><SiteLink href="/resources/documentation">Documentation</SiteLink><SiteLink href="/resources/blog">Blog</SiteLink><SiteLink href="/resources/faq">FAQ</SiteLink></div>
        <div className="footer-column"><h3>Social</h3>{Object.entries(profiles).map(([name, url]) => url ? <a className="social-link" key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Devzard on ${name}, opens in a new tab`}>{name}<Icon name="arrow-up" size={11} /></a> : <button className="social-link" key={name} onClick={() => setSocial(name)}>{name}<Icon name="arrow-up" size={11} /></button>)}</div>
      </div>
      <div className="container footer-bottom"><p>&copy; 2026 {content.settings.siteName}. All rights reserved.</p><span className="footer-note"><i className="status-dot" />Designed. Developed. Deployed.</span><div><SiteLink href="/privacy">Privacy Policy</SiteLink><SiteLink href="/terms">Terms</SiteLink><button onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })} aria-label="Back to top"><Icon name="arrow-up" size={15} /></button></div></div>
      {social && <Modal title={`Connect on ${social}`} onClose={() => setSocial(null)}><p className="section-label">DIRECT CONNECTIONS</p><h2>Find the right connection.</h2><p className="modal-description">Our official {social} profile hasn't been linked here yet. Email Devzard for the current profile{social === 'GitHub' ? ', code samples, or a technical walkthrough' : ' and a direct introduction'}.</p><a className="button button-primary" href={`mailto:${email}?subject=${encodeURIComponent(`Connect with Devzard on ${social}`)}`}>Email Devzard<Icon name="arrow-up" size={16} /></a></Modal>}
    </footer>
  );
}
