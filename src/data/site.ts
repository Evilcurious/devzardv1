import type { IconName } from '../components/ui';

// Verify the domain before publishing. Contact details are the official Devzard contacts.
export const SITE_URL = 'https://devzard.com';
export const CONTACT_EMAIL = 'devzardpk@gmail.com';
export const CONTACT_PHONE = '+92 317 4541414';
export const CONTACT_PHONE_HREF = 'tel:+923174541414';

export const SOCIAL_PROFILES: Record<'GitHub' | 'LinkedIn' | 'X', string | null> = {
  GitHub: null,
  LinkedIn: null,
  X: null,
};

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  visual: { type: 'storefront' } | { type: 'deephq' } | { type: 'image'; src: string; alt: string };
  externalUrl?: string;
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: 'PROJECT_001',
    slug: 'alwazir',
    name: 'Alwazir',
    category: 'Ecommerce Platform',
    description: 'A modern wholesale ecommerce platform. Products, customers, orders, and a customizable storefront, all working together.',
    tags: ['Ecommerce', 'Node.js', 'Web App', 'Admin Dashboard'],
    visual: { type: 'storefront' },
    featured: false,
  },
  {
    id: 'PROJECT_002',
    slug: 'deephq',
    name: 'DeepHQ',
    category: 'Marketing Website',
    description: 'A digital marketing website presenting social media management and Meta Ads services, with a reviews page and a WhatsApp order enquiry form.',
    tags: ['Marketing Website', 'Service Pages', 'Reviews', 'WhatsApp Enquiries'],
    visual: { type: 'deephq' },
    externalUrl: 'https://www.deephq.online',
    featured: true,
  },
];

export type ServiceId = 'websites' | 'ecommerce' | 'business' | 'custom' | 'ai';
export interface Service {
  id: ServiceId;
  number: string;
  title: string;
  description: string;
  features: string[];
  cta: string;
  icon: IconName;
  detail: string;
  deliverables: string;
}

export const services: Service[] = [
  { id: 'websites', number: '01', title: 'Websites', description: 'Fast, modern websites designed around your brand and your customers.', features: ['Business websites', 'Landing pages', 'Portfolio websites', 'Corporate websites'], cta: 'Explore Websites', icon: 'globe', detail: 'A website should make your business easier to understand and easier to choose. We start with your audience, design a clear experience, and build a fast, accessible site you can actually maintain.', deliverables: 'Custom design, responsive development, a content management setup when needed, technical SEO, and production deployment.', },
  { id: 'ecommerce', number: '02', title: 'Ecommerce', description: 'Complete online stores built for real products, customers, and orders.', features: ['Product management', 'Orders and customers', 'Admin dashboards', 'Payments', 'Inventory'], cta: 'Explore Ecommerce', icon: 'bag', detail: 'From the first product to the final order, every part of your store should work together. We connect the storefront, payments, stock, and back-office workflows around the way you sell.', deliverables: 'A custom storefront, product catalog, secure checkout integration, order management, and an administration workspace.', },
  { id: 'business', number: '03', title: 'Business Software', description: 'Custom systems that replace spreadsheets, disconnected tools, and manual workflows.', features: ['ERP systems', 'CRM', 'School management', 'Inventory systems', 'Dashboards'], cta: 'Explore Business Software', icon: 'grid', detail: 'Good internal software gets out of the way. We map your existing operations and build one reliable system with the right permissions, reporting, and workflows for your team.', deliverables: 'Workflow discovery, data modeling, role-based access, custom modules, reporting, and a practical migration plan.', },
  { id: 'custom', number: '04', title: 'Custom Applications', description: "If your business needs software that doesn't exist yet, we build it.", features: ['SaaS platforms', 'Internal tools', 'Web applications', 'Client portals', 'Custom dashboards'], cta: 'Build Something Custom', icon: 'code', detail: 'A specific problem deserves a considered solution. We turn requirements into a focused product, build the important things first, and leave room for the product to grow.', deliverables: 'Product architecture, interface design, frontend and backend development, integrations, testing, and deployment.', },
  { id: 'ai', number: '05', title: 'AI & Automation', description: "Use AI where it creates real leverage, not just because it's trendy.", features: ['AI assistants', 'Workflow automation', 'API integrations', 'Intelligent search', 'Business automation'], cta: 'Explore AI', icon: 'spark', detail: 'We look for repetitive work, disconnected data, and slow handoffs. Then we build focused automations with clear boundaries, human oversight, and results you can evaluate.', deliverables: 'An opportunity assessment, a working proof of concept, integrated workflows, monitoring, and clear documentation.', },
];

export const processSteps = [
  { title: 'Discover', text: 'Understand the business, the people, and the problem worth solving.', detail: 'We define the goals, requirements, constraints, and what a successful first release looks like.' },
  { title: 'Design', text: 'Turn the requirements into a clear, considered product.', detail: 'We map user flows, choose the architecture, and make the interface tangible before we build.' },
  { title: 'Build', text: 'Write clean, reliable code. Share progress as we go.', detail: 'Short development cycles, direct communication, and working previews keep everyone aligned.' },
  { title: 'Test', text: 'Check the details. Then check the edge cases.', detail: 'We test functionality, accessibility, responsiveness, performance, and the paths that are easy to miss.' },
  { title: 'Launch', text: 'From a development environment to the real world.', detail: 'We configure production, connect services, verify the release, and document how everything runs.' },
  { title: 'Grow', text: "Keep improving. Your product doesn't stand still.", detail: 'Maintenance, analytics, new features, and ongoing support are scoped around what your business needs next.' },
];

export const products = [
  { id: 'PRD-001', name: 'Sora ceramic vase', category: 'Home accessories', price: 48, stock: 124, image: 'https://images.pexels.com/photos/29904622/pexels-photo-29904622.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', position: 'center' },
  { id: 'PRD-002', name: 'Form lounge chair', category: 'Furniture', price: 295, stock: 32, image: '/images/alwazir-living.jpg', position: '77% 66%' },
  { id: 'PRD-003', name: 'Sculpture No. 02', category: 'Home accessories', price: 64, stock: 86, image: 'https://images.pexels.com/photos/32541183/pexels-photo-32541183.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', position: 'center' },
  { id: 'PRD-004', name: 'Arc side table', category: 'Furniture', price: 165, stock: 18, image: '/images/alwazir-living.jpg', position: '94% 85%' },
];

export const orders = [
  { id: '#AL-2048', name: 'Amira Khan', email: 'amira@example.com', initials: 'AK', date: 'Jun 18, 2026', amount: 342, status: 'Fulfilled', items: 'Sora ceramic vase, Form lounge chair' },
  { id: '#AL-2047', name: 'Oliver James', email: 'oliver@example.com', initials: 'OJ', date: 'Jun 18, 2026', amount: 128, status: 'Processing', items: 'Sculpture No. 02 (x2)' },
  { id: '#AL-2046', name: 'Noor Studio', email: 'hello@example.com', initials: 'NS', date: 'Jun 17, 2026', amount: 590, status: 'Fulfilled', items: 'Form lounge chair (x2)' },
  { id: '#AL-2045', name: 'Daniel Lee', email: 'daniel@example.com', initials: 'DL', date: 'Jun 17, 2026', amount: 165, status: 'Pending', items: 'Arc side table' },
];

export const faqItems = [
  { question: 'What kinds of projects do you take on?', answer: 'We build business websites, ecommerce platforms, custom applications, internal systems, and focused AI integrations. The best fit is a business with a clear problem and a willingness to work directly with the team building the solution.' },
  { question: 'How much does a project cost?', answer: 'The scope determines the cost. After an initial conversation, we break down the requirements and provide a proposal with the deliverables, timeline, and price. We do not use one-size-fits-all packages.' },
  { question: 'How long will it take?', answer: 'A focused website and a custom business platform have very different timelines. We estimate after discovery, agree on milestones, and give you regular working previews rather than disappearing until launch.' },
  { question: 'Can you improve our existing software?', answer: 'Yes. We start with a technical review to understand the code, infrastructure, and current problems. Then we recommend a practical path: improve what works, replace what does not, and avoid a rewrite unless it is justified.' },
  { question: 'Who owns the code and the design?', answer: 'Ownership, licensing, access, and handover are agreed in your project contract. Our approach is to give you a maintainable product, clear documentation, and access to the systems your business depends on.' },
  { question: 'What happens after launch?', answer: 'We offer ongoing maintenance, monitoring, improvements, and new feature development. Support arrangements are agreed separately so you know what is covered and how to reach us.' },
  { question: 'Do I need a detailed specification?', answer: 'No. A rough idea, a frustrating workflow, or an example of what you need is enough to start. Discovery is where we turn that into clear requirements together.' },
];