import { useEffect, useMemo, useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsProduct, ProductStatus } from '../../cms/types';
import { navigate, SiteLink } from '../../lib/navigation';
import { Badge, Confirm, Empty, Field, Guard, ImagePicker, SaveBar, SearchBox, Select, TextArea, TextInput, Toast, Toggle } from '../ui';
import { Icon } from '../../components/ui';

function blank(): CmsProduct {
  return { id: crypto.randomUUID(), name: '', description: '', imageId: '', category: '', status: 'coming_soon', pricing: '', demoUrl: '', productUrl: '', featured: false, published: false, order: 0 };
}

export default function ProductsAdmin({ path }: { path: string }) {
  const { content, patch, uploadImage, imageUrl, removeImage } = useContent();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const editingId = path === '/admin/products/new' ? 'new' : path.startsWith('/admin/products/') ? path.slice('/admin/products/'.length) : '';
  const source = editingId && editingId !== 'new' ? content.products.find(item => item.id === editingId) : undefined;
  const [draft, setDraft] = useState<CmsProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (editingId === 'new') setDraft(blank());
    else setDraft(source ? { ...source } : null);
  }, [editingId, source]);
  const list = useMemo(() => content.products.slice().sort((a, b) => a.order - b.order).filter(item => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [content.products, query]);
  const dirty = Boolean(draft && source && JSON.stringify(draft) !== JSON.stringify(source)) || (editingId === 'new' && Boolean(draft?.name));

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    await patch(current => {
      const exists = current.products.some(item => item.id === draft.id);
      return { ...current, products: exists ? current.products.map(item => item.id === draft.id ? draft : item) : [...current.products, { ...draft, order: current.products.length }] };
    });
    setSaving(false);
    setToast('Product saved.');
    if (editingId === 'new') navigate(`/admin/products/${draft.id}`);
  };

  if (editingId) {
    if (!draft) return <Empty title="Product not found" text="It may have been deleted." action={<SiteLink href="/admin/products" className="admin-btn ghost">Back</SiteLink>} />;
    return (
      <Guard dirty={dirty}>
        <div className="admin-page">
          <header className="admin-page-head"><div><SiteLink href="/admin/products" className="admin-kicker">Products</SiteLink><h1>{editingId === 'new' ? 'New product' : draft.name || 'Edit product'}</h1></div></header>
          <div className="admin-form-grid">
            <Field label="Name"><TextInput value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Category"><TextInput value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} /></Field>
            <Field label="Status"><Select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ProductStatus })}><option value="coming_soon">Coming Soon</option><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="archived">Archived</option></Select></Field>
            <Field label="Pricing"><TextInput value={draft.pricing} onChange={event => setDraft({ ...draft, pricing: event.target.value })} /></Field>
            <Field label="Demo URL"><TextInput value={draft.demoUrl} onChange={event => setDraft({ ...draft, demoUrl: event.target.value })} /></Field>
            <Field label="Product URL"><TextInput value={draft.productUrl} onChange={event => setDraft({ ...draft, productUrl: event.target.value })} /></Field>
          </div>
          <Field label="Description"><TextArea rows={5} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></Field>
          <div className="admin-inline"><Toggle checked={draft.published} onChange={published => setDraft({ ...draft, published })} label="Published" /><Toggle checked={draft.featured} onChange={featured => setDraft({ ...draft, featured })} label="Featured" /></div>
          <ImagePicker label="Product image" url={imageUrl(draft.imageId)} onUpload={async file => { const id = await uploadImage(file); if (draft.imageId) await removeImage(draft.imageId); setDraft({ ...draft, imageId: id }); }} onRemove={async () => { if (draft.imageId) await removeImage(draft.imageId); setDraft({ ...draft, imageId: '' }); }} />
          <SaveBar dirty={dirty} saving={saving} onSave={save} error={error} />
          {toast && <Toast message={toast} onDone={() => setToast('')} />}
        </div>
      </Guard>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head"><div><p className="admin-kicker">ERP / software</p><h1>Products</h1></div><SiteLink href="/admin/products/new" className="admin-btn primary"><Icon name="plus" size={14} />Add product</SiteLink></header>
      <p className="admin-note">Until a product is marked Available and published, the public Products page stays on Coming Soon.</p>
      <SearchBox value={query} onChange={setQuery} placeholder="Search products" />
      {list.length === 0 ? <Empty title="No products" text="Add a product when you have something to describe. Keep the status as Coming Soon until it is ready." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Status</th><th>Public</th><th /></tr></thead><tbody>{list.map(item => (
          <tr key={item.id}>
            <td><strong>{item.name}</strong><span>{item.category}</span></td>
            <td><Badge tone={item.status === 'available' ? 'live' : 'warn'}>{item.status.replace('_', ' ')}</Badge></td>
            <td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="admin-row-actions"><SiteLink href={`/admin/products/${item.id}`}><Icon name="pencil" size={14} /></SiteLink><button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button></td>
          </tr>
        ))}</tbody></table></div>
      )}
      {pending && <Confirm title="Delete this product?" text="It will no longer appear on the public Products page." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, products: current.products.filter(item => item.id !== pending) })); setPending(null); setToast('Product deleted.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
