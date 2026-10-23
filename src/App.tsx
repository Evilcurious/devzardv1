import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navbar, Footer } from './components/Chrome';
import { Hero, TrustStrip, Principles } from './components/Hero';
import { Services, ServiceDialog } from './components/Services';
import { FeaturedWork } from './components/Work';
import { Process, Technology, WhyDevzard, FinalCTA, Testimonials } from './components/Agency';
import { ContactForm } from './components/Contact';
import type { Service } from './data/site';
import { useContent } from './cms/context';
import { toService } from './cms/public';
import { navigate, useLocation } from './lib/navigation';
import { useSEO } from './lib/seo';
import NotFound from './pages/NotFound';

const CaseStudy = lazy(() => import('./pages/CaseStudy'));
const DeepHQCaseStudy = lazy(() => import('./pages/DeepHQCaseStudy'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ResourcePage = lazy(() => import('./pages/ResourcePage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Home({ onService, preset }: { onService: (service: Service) => void; preset: Service | null }) {
  return <><Hero /><TrustStrip /><Principles /><Services onSelect={onService} /><FeaturedWork /><Process /><Technology /><WhyDevzard /><Testimonials /><FinalCTA /><ContactForm preset={preset} /></>;
}

export default function App() {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [inquiryPreset, setInquiryPreset] = useState<Service | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(path);
  const { content, imageUrl } = useContent();
  useSEO(path);

  useEffect(() => {
    const favicon = imageUrl(content.settings.faviconImageId);
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link && favicon) link.href = favicon;
  }, [content.settings.faviconImageId, imageUrl]);

  useEffect(() => {
    const pathChanged = previousPath.current !== path;
    previousPath.current = path;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (pathChanged) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      mainRef.current?.focus({ preventScroll: true });
    }
    const timer = window.setTimeout(() => {
      if (location.hash) {
        let id = location.hash.slice(1);
        try { id = decodeURIComponent(id); } catch { /* Invalid URL fragments are treated as plain IDs. */ }
        document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion || pathChanged ? 'instant' : 'smooth', block: 'start' });
      } else if (path === '/') {
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [path, location.hash, location.key]);

  const startServiceInquiry = (service: Service) => {
    setInquiryPreset(service);
    setSelectedService(null);
    navigate('/#contact');
  };

  if (path.startsWith('/admin')) {
    return <Suspense fallback={<div className="admin-boot" role="status">Loading admin…</div>}><AdminApp /></Suspense>;
  }

  const resourceKind = path.startsWith('/resources/') ? path.split('/')[2] : path.slice(1);
  const workSlug = path.startsWith('/work/') ? path.split('/')[2] : null;
  const isResource = ['/resources/documentation', '/resources/blog', '/resources/faq', '/privacy', '/terms'].includes(path);
  return <><a href="#main-content" className="skip-link">Skip to content</a><Navbar pathname={path} /><main id="main-content" ref={mainRef} tabIndex={-1} className="main-content"><Suspense fallback={<div className="page-loading" role="status"><span className="loading-line" />Loading Devzard...</div>}>{path === '/' ? <Home onService={setSelectedService} preset={inquiryPreset} /> : workSlug === 'alwazir' ? <CaseStudy /> : workSlug === 'deephq' ? <DeepHQCaseStudy /> : path === '/products' ? <ProductsPage /> : isResource ? <ResourcePage key={resourceKind} kind={resourceKind} /> : <NotFound />}</Suspense></main><Footer onService={id => { const item = content.services.find(service => service.id === id); setSelectedService(item ? toService(item) : null); }} />{selectedService && <ServiceDialog service={selectedService} onClose={() => setSelectedService(null)} onEnquire={startServiceInquiry} />}</>;
}
