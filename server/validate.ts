import { z } from 'zod';

const httpUrl = z.string().refine(value => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'URL must use http or https');

const icon = z.string().max(40);
const id = z.string().min(1).max(80).regex(/^[\w-]+$/);
const short = z.string().max(200);
const medium = z.string().max(2000);
const long = z.string().max(12000);

export const projectSchema = z.object({
  id, slug: z.string().max(80), name: short, shortDescription: medium, fullDescription: long,
  client: short, projectUrl: httpUrl, githubUrl: httpUrl, technologies: z.array(z.string().max(60)).max(24),
  category: short, coverImageId: z.string().max(80), visualType: z.enum(['deephq', 'storefront', 'image']),
  status: z.enum(['draft', 'live', 'archived']), featured: z.boolean(), published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const productSchema = z.object({
  id, name: short, description: medium, imageId: z.string().max(80), category: short,
  status: z.enum(['coming_soon', 'available', 'maintenance', 'archived']), pricing: short,
  demoUrl: httpUrl, productUrl: httpUrl, featured: z.boolean(), published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const serviceSchema = z.object({
  id, name: short, shortDescription: medium, fullDescription: long, features: z.array(z.string().max(120)).max(20),
  cta: short, deliverables: medium, icon, visual: z.string().max(40), published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const technologySchema = z.object({
  id, name: short, category: short, icon, description: medium, published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const teamSchema = z.object({
  id, name: short, role: short, biography: medium, imageId: z.string().max(80), initials: z.string().max(4),
  github: httpUrl, linkedin: httpUrl, x: httpUrl, published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const testimonialSchema = z.object({
  id, clientName: short, company: short, role: short, quote: medium, imageId: z.string().max(80),
  logoId: z.string().max(80), published: z.boolean(), order: z.number().int().min(0).max(9999),
});

export const contentSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().max(40),
  projects: z.array(projectSchema).max(80),
  products: z.array(productSchema).max(80),
  services: z.array(serviceSchema).max(40),
  technologies: z.array(technologySchema).max(40),
  team: z.array(teamSchema).max(40),
  testimonials: z.array(testimonialSchema).max(40),
  homepage: z.object({
    heroBrand: short, heroHeadline: medium, heroHeadlineAccent: medium, heroSubtitle: medium,
    heroCta: short, heroCtaLink: z.string().max(200), heroSecondary: short, heroSecondaryLink: z.string().max(200),
    principles: z.array(z.object({ id, title: short, description: medium, icon })).max(8),
    processTitle: short, processSubtitle: medium,
    processSteps: z.array(z.object({ id, n: z.string().max(4), title: short, text: medium, meta: short })).max(12),
    finalCtaLabel: short, finalCtaTitle: short, finalCtaAccent: short, finalCtaText: medium,
    finalCtaButton: short, finalCtaSecondary: short,
  }),
  settings: z.object({
    siteName: short, email: z.string().email().max(254), phone: z.string().max(40), address: medium,
    github: httpUrl, linkedin: httpUrl, x: httpUrl, seoTitle: short, seoDescription: medium,
    ogImage: z.string().max(300), footerText: medium, logoImageId: z.string().max(80), faviconImageId: z.string().max(80),
  }),
});

export const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(200),
});

export const passwordChangeSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(12).max(200),
});
