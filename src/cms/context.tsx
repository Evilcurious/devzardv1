import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, mediaUrl } from './client';
import { compressImage } from './images';
import { SEED } from './seed';
import type { CmsContent } from './types';

// Build an image-id -> resolved-url map from the fields the server attaches.
// This lets the browser use Blob URLs without ever seeing the Blob token.
function buildMediaMap(content: CmsContent): Record<string, string> {
  const map: Record<string, string> = {};
  const add = (id: string | undefined, url: string | undefined) => { if (id && url) map[id] = url; };
  content.projects.forEach(item => add(item.coverImageId, item.coverImageUrl));
  content.products.forEach(item => add(item.imageId, item.imageUrl));
  content.team.forEach(item => add(item.imageId, item.imageUrl));
  content.testimonials.forEach(item => { add(item.imageId, item.imageUrl); add(item.logoId, item.logoUrl); });
  add(content.settings.logoImageId, content.settings.logoImageUrl);
  add(content.settings.faviconImageId, content.settings.faviconImageUrl);
  return map;
}

interface ContentApi {
  content: CmsContent;
  ready: boolean;
  save: (next: CmsContent) => Promise<void>;
  patch: (updater: (current: CmsContent) => CmsContent) => Promise<void>;
  restoreDefaults: () => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  imageUrl: (id: string) => string;
  removeImage: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentApi | null>(null);

async function loadForLocation(): Promise<CmsContent> {
  if (window.location.pathname.startsWith('/admin')) {
    try { return await api.content(); }
    catch { return { ...SEED, updatedAt: '' }; }
  }
  try { return await api.publicContent(); }
  catch { return { ...SEED, updatedAt: '' }; }
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<CmsContent | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setContent(await loadForLocation());
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const save = useCallback(async (next: CmsContent) => {
    const stored = await api.saveContent(next) as CmsContent;
    setContent(stored);
  }, []);

  const patch = useCallback(async (updater: (current: CmsContent) => CmsContent) => {
    const current = content;
    if (!current) return;
    const next = updater(current);
    const stored = await api.saveContent(next) as CmsContent;
    setContent(stored);
  }, [content]);

  const restoreDefaults = useCallback(async () => {
    const stored = await api.saveContent({ ...SEED, updatedAt: new Date().toISOString() }) as CmsContent;
    setContent(stored);
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const blob = await compressImage(file);
    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, blob.type === 'image/png' ? '.png' : '.jpg'), { type: blob.type });
    const result = await api.upload(compressed) as { id: string; url: string };
    setUploaded(current => ({ ...current, [result.id]: result.url }));
    return result.id;
  }, []);

  const removeImage = useCallback(async (id: string) => {
    if (!id) return;
    await api.removeMedia(id);
  }, []);

  const mediaMap = useMemo(() => content ? { ...buildMediaMap(content), ...uploaded } : uploaded, [content, uploaded]);

  const apiValue = useMemo<ContentApi | null>(() => content ? {
    content,
    ready: true,
    save,
    patch,
    restoreDefaults,
    uploadImage,
    imageUrl: (id: string) => mediaMap[id] || mediaUrl(id),
    removeImage,
    reload,
  } : null, [content, mediaMap, patch, reload, removeImage, restoreDefaults, save, uploadImage]);

  if (!apiValue) return <div className="page-loading" role="status"><span className="loading-line" />Loading Devzard...</div>;
  return <ContentContext.Provider value={apiValue}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error('ContentProvider is missing.');
  return value;
}
