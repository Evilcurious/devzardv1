import type { CmsContent } from '../src/cms/types.ts';
import { getStorage } from './storage/index.ts';

// Content stores image IDs. Before sending to any client we resolve each ID to
// its Blob (or local) URL so the browser never needs the storage token.
export async function withResolvedMedia(content: CmsContent): Promise<CmsContent> {
  const ids = new Set<string>();
  const collect = (id: string) => { if (id) ids.add(id); };
  content.projects.forEach(item => collect(item.coverImageId));
  content.products.forEach(item => collect(item.imageId));
  content.team.forEach(item => collect(item.imageId));
  content.testimonials.forEach(item => { collect(item.imageId); collect(item.logoId); });
  collect(content.settings.logoImageId);
  collect(content.settings.faviconImageId);

  const storage = getStorage();
  const map = new Map<string, string>();
  await Promise.all(Array.from(ids).map(async id => {
    const record = await storage.getMedia(id);
    if (record) map.set(id, record.url);
  }));

  const url = (id: string) => (id && map.get(id)) || '';
  return {
    ...content,
    projects: content.projects.map(item => ({ ...item, coverImageUrl: url(item.coverImageId) })),
    products: content.products.map(item => ({ ...item, imageUrl: url(item.imageId) })),
    team: content.team.map(item => ({ ...item, imageUrl: url(item.imageId) })),
    testimonials: content.testimonials.map(item => ({ ...item, imageUrl: url(item.imageId), logoUrl: url(item.logoId) })),
    settings: { ...content.settings, logoImageUrl: url(content.settings.logoImageId), faviconImageUrl: url(content.settings.faviconImageId) },
  } as CmsContent;
}
