import { useEffect, useMemo, useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsProject, ProjectStatus, VisualType } from '../../cms/types';
import { slugify } from '../../cms/types';
import { navigate, SiteLink } from '../../lib/navigation';
import { Badge, Confirm, Empty, Field, Guard, ImagePicker, SaveBar, SearchBox, Select, TextArea, TextInput, Toast, Toggle } from '../ui';
import { Icon } from '../../components/ui';

function blank(): CmsProject {
  return { id: crypto.randomUUID(), slug: '', name: '', shortDescription: '', fullDescription: '', client: '', projectUrl: '', githubUrl: '', technologies: [], category: '', coverImageId: '', visualType: 'image', status: 'draft', featured: false, published: false, order: 0 };
}

export default function WorkPage({ path }: { path: string }) {
  const { content, patch, uploadImage, imageUrl, removeImage } = useContent();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const editingId = path === '/admin/work/new' ? 'new' : path.startsWith('/admin/work/') ? path.slice('/admin/work/'.length) : '';
  const source = editingId && editingId !== 'new' ? content.projects.find(item => item.id === editingId) : undefined;
  const [draft, setDraft] = useState<CmsProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingId === 'new') setDraft(blank());
    else setDraft(source ? { ...source, technologies: [...source.technologies] } : null);
  }, [editingId, source]);

  const list = useMemo(() => content.projects
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter(item => `${item.name} ${item.category} ${item.shortDescription}`.toLowerCase().includes(query.toLowerCase())), [content.projects, query]);

  const dirty = Boolean(draft && source && JSON.stringify(draft) !== JSON.stringify(source)) || (editingId === 'new' && Boolean(draft?.name));

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const slug = draft.slug.trim() || slugify(draft.name);
    const record = { ...draft, slug, technologies: draft.technologies.map(item => item.trim()).filter(Boolean) };
    await patch(current => {
      const exists = current.projects.some(item => item.id === record.id);
      const projects = exists ? current.projects.map(item => item.id === record.id ? record : item) : [...current.projects, { ...record, order: current.projects.length }];
      return { ...current, projects };
    });
    setSaving(false);
    setToast('Project saved.');
    if (editingId === 'new') navigate(`/admin/work/${record.id}`);
  };

  const move = async (id: string, direction: -1 | 1) => {
    await patch(current => {
      const ordered = current.projects.slice().sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(item => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= ordered.length) return current;
      [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
      return { ...current, projects: ordered.map((item, order) => ({ ...item, order })) };
    });
  };

  if (editingId) {
    if (!draft) return <div className="admin-page"><Empty title="Project not found" text="It may have been deleted." action={<SiteLink href="/admin/work" className="admin-btn ghost">Back to work</SiteLink>} /></div>;
    return (
      <Guard dirty={dirty}>
        <div className="admin-page">
          <header className="admin-page-head">
            <div><SiteLink href="/admin/work" className="admin-kicker">Work</SiteLink><h1>{editingId === 'new' ? 'New project' : draft.name || 'Edit project'}</h1></div>
          </header>
          <div className="admin-form-grid">
            <Field label="Name"><TextInput value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Slug"><TextInput value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value })} /></Field>
            <Field label="Category"><TextInput value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} /></Field>
            <Field label="Client"><TextInput value={draft.client} onChange={event => setDraft({ ...draft, client: event.target.value })} /></Field>
            <Field label="Project URL"><TextInput value={draft.projectUrl} onChange={event => setDraft({ ...draft, projectUrl: event.target.value })} placeholder="https://" /></Field>
            <Field label="GitHub URL"><TextInput value={draft.githubUrl} onChange={event => setDraft({ ...draft, githubUrl: event.target.value })} /></Field>
            <Field label="Status"><Select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ProjectStatus })}><option value="draft">Draft</option><option value="live">Live</option><option value="archived">Archived</option></Select></Field>
            <Field label="Preview type"><Select value={draft.visualType} onChange={event => setDraft({ ...draft, visualType: event.target.value as VisualType })}><option value="image">Image</option><option value="deephq">DeepHQ mockup</option><option value="storefront">Storefront mockup</option></Select></Field>
          </div>
          <Field label="Short description"><TextArea rows={3} value={draft.shortDescription} onChange={event => setDraft({ ...draft, shortDescription: event.target.value })} /></Field>
          <Field label="Full description"><TextArea rows={6} value={draft.fullDescription} onChange={event => setDraft({ ...draft, fullDescription: event.target.value })} /></Field>
          <Field label="Technologies" hint="Comma separated"><TextInput value={draft.technologies.join(', ')} onChange={event => setDraft({ ...draft, technologies: event.target.value.split(',') })} /></Field>
          <div className="admin-inline">
            <Toggle checked={draft.published} onChange={published => setDraft({ ...draft, published })} label="Published" />
            <Toggle checked={draft.featured} onChange={featured => setDraft({ ...draft, featured })} label="Featured" />
          </div>
          <ImagePicker label="Cover image" url={imageUrl(draft.coverImageId)} onUpload={async file => { const id = await uploadImage(file); if (draft.coverImageId) await removeImage(draft.coverImageId); setDraft({ ...draft, coverImageId: id }); }} onRemove={async () => { if (draft.coverImageId) await removeImage(draft.coverImageId); setDraft({ ...draft, coverImageId: '' }); }} />
          <SaveBar dirty={dirty} saving={saving} onSave={save} error={error} />
          {toast && <Toast message={toast} onDone={() => setToast('')} />}
        </div>
      </Guard>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div><p className="admin-kicker">Portfolio</p><h1>Work</h1></div>
        <SiteLink href="/admin/work/new" className="admin-btn primary"><Icon name="plus" size={14} />Add project</SiteLink>
      </header>
      <SearchBox value={query} onChange={setQuery} placeholder="Search projects" />
      {list.length === 0 ? <Empty title="No projects" text="Add a project to show it on the public Work section once it is published." /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Project</th><th>Status</th><th>Public</th><th /></tr></thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><span>{item.category}</span></td>
                  <td><Badge tone={item.status === 'live' ? 'live' : item.status === 'archived' ? 'warn' : 'muted'}>{item.status}</Badge></td>
                  <td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}{item.featured && <Badge tone="accent">Featured</Badge>}</td>
                  <td className="admin-row-actions">
                    <button type="button" aria-label="Move up" onClick={() => move(item.id, -1)}><Icon name="arrow-up" size={14} /></button>
                    <button type="button" aria-label="Move down" onClick={() => move(item.id, 1)}><Icon name="arrow-down" size={14} /></button>
                    <SiteLink href={`/admin/work/${item.id}`} aria-label="Edit"><Icon name="pencil" size={14} /></SiteLink>
                    <button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pending && <Confirm title="Delete this project?" text="This removes it from the public Work section if it was published." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, projects: current.projects.filter(item => item.id !== pending).map((item, order) => ({ ...item, order })) })); setPending(null); setToast('Project deleted.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
