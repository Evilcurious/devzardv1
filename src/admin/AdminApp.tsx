import { useEffect, useState } from 'react';
import { BrandMark, Icon, type IconName } from '../components/ui';
import { api } from '../cms/client';
import { useContent } from '../cms/context';
import { navigate, SiteLink, useLocation } from '../lib/navigation';
import { LoginForm } from './ui';
import DashboardPage from './pages/Dashboard';
import WebsitePage from './pages/Website';
import WorkPage from './pages/Work';
import ProductsAdmin from './pages/Products';
import ServicesPage from './pages/Services';
import TechnologyPage from './pages/Technology';
import TeamPage from './pages/Team';
import TestimonialsPage from './pages/Testimonials';
import ContactPage from './pages/Contact';
import SettingsPage from './pages/Settings';

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'grid' },
  { href: '/admin/website', label: 'Website', icon: 'globe' },
  { href: '/admin/work', label: 'Work', icon: 'box' },
  { href: '/admin/products', label: 'Products', icon: 'bag' },
  { href: '/admin/services', label: 'Services', icon: 'layers' },
  { href: '/admin/technology', label: 'Technology', icon: 'code' },
  { href: '/admin/team', label: 'Team', icon: 'users' },
  { href: '/admin/testimonials', label: 'Testimonials', icon: 'spark' },
  { href: '/admin/contact', label: 'Contact', icon: 'mail' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export default function AdminApp() {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '') || '/admin';
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const { content, reload } = useContent();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const setup = await api.setupNeeded() as { needed: boolean };
        if (!active) return;
        if (setup.needed) {
          setNeedsSetup(true);
          setAuthed(false);
          setReady(true);
          return;
        }
        const session = await api.session() as { email: string };
        if (!active) return;
        setNeedsSetup(false);
        setAuthed(true);
        setEmail(session.email);
      } catch {
        if (!active) return;
        setAuthed(false);
        setNeedsSetup(false);
      }
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { setNavOpen(false); }, [path]);

  if (!ready) return <div className="admin-boot" role="status">Loading admin…</div>;

  if (!authed) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <BrandMark />
          <p className="admin-kicker">DEVZARD / ADMIN</p>
          <h1>{needsSetup ? 'Create the admin account.' : 'Sign in.'}</h1>
          <p className="admin-gate-copy">{needsSetup
            ? 'This is stored on the server as a bcrypt hash. Use at least 12 characters. Two-factor authentication can be added later without changing this login flow.'
            : 'Admin access is checked on the server. Unauthenticated requests cannot change the public website.'}</p>
          <LoginForm
            mode={needsSetup ? 'setup' : 'login'}
            error=""
            onSubmit={async (nextEmail, password) => {
              const result = needsSetup
                ? await api.setup(nextEmail, password) as { email: string }
                : await api.login(nextEmail, password) as { email: string };
              setEmail(result.email);
              setNeedsSetup(false);
              setAuthed(true);
              await reload();
            }}
          />
          <SiteLink href="/" className="admin-back">Back to website</SiteLink>
        </div>
      </div>
    );
  }

  const page = path === '/admin' ? <DashboardPage />
    : path === '/admin/website' ? <WebsitePage />
    : path.startsWith('/admin/work') ? <WorkPage path={path} />
    : path.startsWith('/admin/products') ? <ProductsAdmin path={path} />
    : path === '/admin/services' ? <ServicesPage />
    : path === '/admin/technology' ? <TechnologyPage />
    : path === '/admin/team' ? <TeamPage />
    : path === '/admin/testimonials' ? <TestimonialsPage />
    : path === '/admin/contact' ? <ContactPage />
    : path === '/admin/settings' ? <SettingsPage />
    : <DashboardPage />;

  return (
    <div className="admin-shell">
      {navOpen && <button className="admin-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <aside className={navOpen ? 'open' : ''}>
        <SiteLink href="/admin" className="admin-brand" aria-label="Admin home"><BrandMark /><span>Devzard</span></SiteLink>
        <nav aria-label="Admin">
          {nav.map(item => {
            const active = item.href === '/admin' ? path === '/admin' : path === item.href || path.startsWith(`${item.href}/`);
            return <SiteLink key={item.href} href={item.href} className={active ? 'active' : ''}><Icon name={item.icon} size={16} />{item.label}</SiteLink>;
          })}
        </nav>
        <div className="admin-aside-foot">
          <span>{email || 'Admin'}</span>
          <button type="button" onClick={async () => { await api.logout(); setAuthed(false); navigate('/admin'); }}><Icon name="logout" size={14} />Sign out</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <button type="button" className="admin-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" size={20} /></button>
          <p>{content.settings.siteName} content</p>
          <SiteLink href="/" className="admin-view"><Icon name="eye" size={14} />View site</SiteLink>
        </header>
        <div className="admin-body">{page}</div>
      </div>
    </div>
  );
}
