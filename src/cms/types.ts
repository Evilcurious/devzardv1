import type { IconName } from '../components/ui';

export type ProjectStatus = 'draft' | 'live' | 'archived';
export type ProductStatus = 'coming_soon' | 'available' | 'maintenance' | 'archived';
export type VisualType = 'deephq' | 'storefront' | 'image';

export interface CmsProject {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  client: string;
  projectUrl: string;
  githubUrl: string;
  technologies: string[];
  category: string;
  coverImageId: string;
  coverImageUrl?: string;
  visualType: VisualType;
  status: ProjectStatus;
  featured: boolean;
  published: boolean;
  order: number;
}

export interface CmsProduct {
  id: string;
  name: string;
  description: string;
  imageId: string;
  imageUrl?: string;
  category: string;
  status: ProductStatus;
  pricing: string;
  demoUrl: string;
  productUrl: string;
  featured: boolean;
  published: boolean;
  order: number;
}

export interface CmsService {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  cta: string;
  deliverables: string;
  icon: IconName;
  visual: string;
  published: boolean;
  order: number;
}

export interface CmsTechnology {
  id: string;
  name: string;
  category: string;
  icon: IconName;
  description: string;
  published: boolean;
  order: number;
}

export interface CmsTeamMember {
  id: string;
  name: string;
  role: string;
  biography: string;
  imageId: string;
  imageUrl?: string;
  initials: string;
  github: string;
  linkedin: string;
  x: string;
  published: boolean;
  order: number;
}

export interface CmsTestimonial {
  id: string;
  clientName: string;
  company: string;
  role: string;
  quote: string;
  imageId: string;
  imageUrl?: string;
  logoId: string;
  logoUrl?: string;
  published: boolean;
  order: number;
}

export interface CmsPrinciple {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface CmsProcessStep {
  id: string;
  n: string;
  title: string;
  text: string;
  meta: string;
}

export interface CmsHomepage {
  heroBrand: string;
  heroHeadline: string;
  heroHeadlineAccent: string;
  heroSubtitle: string;
  heroCta: string;
  heroCtaLink: string;
  heroSecondary: string;
  heroSecondaryLink: string;
  principles: CmsPrinciple[];
  processTitle: string;
  processSubtitle: string;
  processSteps: CmsProcessStep[];
  finalCtaLabel: string;
  finalCtaTitle: string;
  finalCtaAccent: string;
  finalCtaText: string;
  finalCtaButton: string;
  finalCtaSecondary: string;
}

export interface CmsSettings {
  siteName: string;
  email: string;
  phone: string;
  address: string;
  github: string;
  linkedin: string;
  x: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  footerText: string;
  logoImageId: string;
  logoImageUrl?: string;
  faviconImageId: string;
  faviconImageUrl?: string;
}

export interface CmsContent {
  version: 1;
  updatedAt: string;
  projects: CmsProject[];
  products: CmsProduct[];
  services: CmsService[];
  technologies: CmsTechnology[];
  team: CmsTeamMember[];
  testimonials: CmsTestimonial[];
  homepage: CmsHomepage;
  settings: CmsSettings;
}

export interface CmsImage {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DZ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'project';
}

export const SERVICE_ICONS: IconName[] = ['globe', 'bag', 'grid', 'code', 'spark', 'layers', 'terminal', 'database', 'bolt', 'target'];
export const TECH_ICONS: IconName[] = ['code', 'terminal', 'database', 'git', 'globe', 'spark', 'shield', 'layers'];
