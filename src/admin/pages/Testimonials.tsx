import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsTestimonial } from '../../cms/types';
import { Icon } from '../../components/ui';
import { Badge, Confirm, Empty, Field, ImagePicker, TextArea, TextInput, Toast, Toggle } from '../ui';

export default function TestimonialsPage() {
  const { content, patch, uploadImage, imageUrl, removeImage } = useContent();
  const [editing, setEditing] = useState<CmsTestimonial | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const list = content.testimonials.slice().sort((a, b) => a.order - b.order);

  const save = async () => {
    if (!editing || !editing.quote.trim() || !editing.clientName.trim()) return;
    await patch(current => {
      const exists = current.testimonials.some(item => item.id === editing.id);
      return { ...current, testimonials: exists ? current.testimonials.map(item => item.id === editing.id ? editing : item) : [...current.testimonials, { ...editing, order: current.testimonials.length }] };
    });
    setEditing(null);
    setToast('Testimonial saved.');
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head"><div><p className="admin-kicker">Social proof</p><h1>Testimonials</h1></div><button type="button" className="admin-btn primary" onClick={() => setEditing({ id: crypto.randomUUID(), clientName: '', company: '', role: '', quote: '', imageId: '', logoId: '', published: false, order: list.length })}><Icon name="plus" size={14} />Add testimonial</button></header>
      <p className="admin-note">Do not invent testimonials. Unpublished quotes stay off the public website. The homepage only shows this section when at least one published testimonial exists.</p>
      {list.length === 0 ? <Empty title="No testimonials yet" text="The public site currently has none. Add only quotes you have permission to use." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Client</th><th>Company</th><th>Public</th><th /></tr></thead><tbody>{list.map(item => (
          <tr key={item.id}><td><strong>{item.clientName}</strong><span>{item.quote.slice(0, 72)}</span></td><td>{item.company}</td><td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="admin-row-actions"><button type="button" aria-label="Edit" onClick={() => setEditing({ ...item })}><Icon name="pencil" size={14} /></button><button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button></td></tr>
        ))}</tbody></table></div>
      )}
      {editing && <div className="admin-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}><div className="admin-dialog wide" role="dialog"><h3>{editing.clientName || 'Testimonial'}</h3>
        <Field label="Client name"><TextInput value={editing.clientName} onChange={event => setEditing({ ...editing, clientName: event.target.value })} /></Field>
        <Field label="Role"><TextInput value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value })} /></Field>
        <Field label="Company"><TextInput value={editing.company} onChange={event => setEditing({ ...editing, company: event.target.value })} /></Field>
        <Field label="Quote"><TextArea rows={5} value={editing.quote} onChange={event => setEditing({ ...editing, quote: event.target.value })} /></Field>
        <ImagePicker label="Profile image" url={imageUrl(editing.imageId)} onUpload={async file => { const id = await uploadImage(file); if (editing.imageId) await removeImage(editing.imageId); setEditing({ ...editing, imageId: id }); }} onRemove={async () => { if (editing.imageId) await removeImage(editing.imageId); setEditing({ ...editing, imageId: '' }); }} />
        <ImagePicker label="Company logo" url={imageUrl(editing.logoId)} onUpload={async file => { const id = await uploadImage(file); if (editing.logoId) await removeImage(editing.logoId); setEditing({ ...editing, logoId: id }); }} onRemove={async () => { if (editing.logoId) await removeImage(editing.logoId); setEditing({ ...editing, logoId: '' }); }} />
        <Toggle checked={editing.published} onChange={published => setEditing({ ...editing, published })} label="Published" />
        <div className="admin-dialog-actions"><button type="button" className="admin-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="admin-btn primary" onClick={save}>Save</button></div>
      </div></div>}
      {pending && <Confirm title="Delete this testimonial?" text="It will be removed from the public website if it was published." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, testimonials: current.testimonials.filter(item => item.id !== pending) })); setPending(null); setToast('Deleted.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
