import { useEffect, useState } from 'react';
import { useContent } from '../../cms/context';
import { api } from '../../cms/client';
import { SiteLink } from '../../lib/navigation';
import { Icon } from '../../components/ui';

export default function DashboardPage() {
  const { content } = useContent();
  const publishedProjects = content.projects.filter(item => item.published).length;
  const products = content.products.length;
  const team = content.team.filter(item => item.published).length;
  const services = content.services.filter(item => item.published).length;
  const testimonials = content.testimonials.filter(item => item.published).length;
  const [audit, setAudit] = useState<{ time: string; action: string; resource: string; ok: boolean }[]>([]);
  useEffect(() => { api.audit().then(rows => setAudit(rows as typeof audit)).catch(() => setAudit([])); }, []);
  const cards = [
    { label: 'Published projects', value: publishedProjects, href: '/admin/work' },
    { label: 'Products', value: products, href: '/admin/products' },
    { label: 'Team members', value: team, href: '/admin/team' },
    { label: 'Services', value: services, href: '/admin/services' },
    { label: 'Testimonials', value: testimonials, href: '/admin/testimonials' },
  ];
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      <div className="admin-stat-grid">
        {cards.map(card => <SiteLink key={card.label} href={card.href} className="admin-stat"><span>{card.label}</span><strong>{card.value}</strong></SiteLink>)}
      </div>
      <section className="admin-panel">
        <h2>Contact inquiries</h2>
        <p>The public form prepares an email draft. This website does not store inquiries, so there is no inquiry count to show.</p>
      </section>
      <section className="admin-panel">
        <h2>Quick actions</h2>
        <div className="admin-quick">
          <SiteLink href="/admin/work/new" className="admin-btn primary"><Icon name="plus" size={14} />Add project</SiteLink>
          <SiteLink href="/admin/products/new" className="admin-btn ghost"><Icon name="plus" size={14} />Add product</SiteLink>
          <SiteLink href="/admin/team" className="admin-btn ghost"><Icon name="users" size={14} />Add team member</SiteLink>
          <SiteLink href="/admin/contact" className="admin-btn ghost"><Icon name="mail" size={14} />Edit contact</SiteLink>
        </div>
      </section>
      {audit.length > 0 && <section className="admin-panel"><h2>Recent admin activity</h2><ul className="admin-audit">{audit.slice(0, 8).map((item, index) => <li key={`${item.time}-${index}`}><span>{new Date(item.time).toLocaleString()}</span> {item.action} {item.ok ? '' : '(failed)'}</li>)}</ul></section>}
      <p className="admin-note">Content is stored on the server. Unauthenticated clients cannot change it.</p>
    </div>
  );
}
