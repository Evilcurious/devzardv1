import type { Service, ServiceId } from '../data/site';
import type { CmsProject, CmsService } from './types';

const known = new Set<ServiceId>(['websites', 'ecommerce', 'business', 'custom', 'ai']);

export function toService(item: CmsService): Service {
  const id = (known.has(item.id as ServiceId) ? item.id : 'custom') as ServiceId;
  return {
    id,
    number: String(item.order + 1).padStart(2, '0'),
    title: item.name,
    description: item.shortDescription,
    features: item.features.map(feature => feature.trim()).filter(Boolean),
    cta: item.cta || 'Learn more',
    icon: item.icon,
    detail: item.fullDescription,
    deliverables: item.deliverables,
  };
}

export function visualFor(item: CmsService) {
  return item.visual && item.visual !== 'none' ? item.visual : item.id;
}

export function publicProjects(projects: CmsProject[]) {
  return projects.filter(item => item.published).sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
}
