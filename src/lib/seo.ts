import { useEffect } from 'react';
import { useContent } from '../cms/context';
import { SITE_URL } from '../data/site';

const defaultDescription = 'Devzard builds modern websites, ecommerce platforms, business software, custom applications, and AI-powered solutions.';

const pages: Record<string, { title: string; description: string }> = {
  '/': { title: 'Devzard \u2014 Software Built for Businesses', description: defaultDescription },
  '/work/alwazir': { title: 'Alwazir Case Study | Devzard', description: 'A connected wholesale ecommerce platform. Explore the Alwazir storefront, administration workspace, and the development approach behind it.' },
  '/work/deephq': { title: 'DeepHQ Case Study | Devzard', description: 'How Devzard designed and built the website for an AI-powered digital marketing agency. Live at deephq.online.' },
  '/products': { title: 'Products | Devzard', description: "Devzard's own business software products are in development — a suite of systems designed to help organizations run smarter." },
  '/resources/documentation': { title: 'Working with Devzard | Project Documentation', description: 'A practical guide to briefing a software project, collaborating during development, and preparing for a useful handover.' },
  '/resources/blog': { title: 'Notes from the Build | Devzard', description: 'Practical notes on custom software, focused first releases, and looking after the products your business relies on.' },
  '/resources/faq': { title: 'Frequently Asked Questions | Devzard', description: 'Straight answers about Devzard projects, pricing, development timelines, ownership, and ongoing support.' },
  '/privacy': { title: 'Privacy Policy | Devzard', description: 'How the Devzard website handles project inquiries, external resources, and your privacy.' },
  '/terms': { title: 'Website Terms | Devzard', description: 'Terms for using the Devzard website and its interactive product demonstrations.' },
};

export function useSEO(path: string) {
  const { content } = useContent();
  useEffect(() => {
    if (path.startsWith('/admin')) {
      document.title = 'Admin | Devzard';
      let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.content = 'noindex, nofollow';
      return;
    }
    const fallback = pages[path] || { title: 'Page Not Found | Devzard', description: content.settings.seoDescription || defaultDescription };
    const page = path === '/'
      ? { title: content.settings.seoTitle || fallback.title, description: content.settings.seoDescription || fallback.description }
      : fallback;
    document.title = page.title;
    const setMeta = (attribute: 'name' | 'property', key: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = value;
    };
    setMeta('name', 'description', page.description);
    setMeta('name', 'robots', pages[path] ? 'index, follow' : 'noindex, follow');
    setMeta('property', 'og:title', page.title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:url', `${SITE_URL}${path === '/' ? '/' : path}`);
    if (content.settings.ogImage) setMeta('property', 'og:image', content.settings.ogImage.startsWith('http') ? content.settings.ogImage : `${SITE_URL}${content.settings.ogImage}`);
    setMeta('name', 'twitter:title', page.title);
    setMeta('name', 'twitter:description', page.description);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `${SITE_URL}${path === '/' ? '/' : path}`;
  }, [path, content.settings.seoTitle, content.settings.seoDescription, content.settings.ogImage]);
}