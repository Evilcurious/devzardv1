import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsService } from '../../cms/types';
import { SERVICE_ICONS } from '../../cms/types';
import type { IconName } from '../../components/ui';
import { Icon } from '../../components/ui';
import { Badge, Confirm, Empty, Field, IconSelect, Select, TextArea, TextInput, Toast, Toggle } from '../ui';

const visuals = ['websites', 'ecommerce', 'business', 'custom', 'ai', 'none'];

export default function ServicesPage() {
  const { content, patch } = useContent();
  const [editing, setEditing] = useState<CmsService | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const list = content.services.slice().sort((a, b) => a.order - b.order);

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    await patch(current => {
      const exists = current.services.some(item => item.id === editing.id);
      return { ...current, services: exists ? current.services.map(item => item.id === editing.id ? editing : item) : [...current.services, { ...editing, order: current.services.length }] };
    });
    setEditing(null);
    setToast('Service saved.');
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head"><div><p className="admin-kicker">Offerings</p><h1>Services</h1></div><button type="button" className="admin-btn primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', shortDescription: '', fullDescription: '', features: [], cta: 'Learn more', deliverables: '', icon: 'layers', visual: 'none', published: true, order: list.length })}><Icon name="plus" size={14} />Add service</button></header>
      {list.length === 0 ? <Empty title="No services" text="Add the services that should appear on the homepage." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Service</th><th>Public</th><th /></tr></thead><tbody>{list.map(item => (
          <tr key={item.id}><td><strong>{item.name}</strong><span>{item.shortDescription}</span></td><td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="admin-row-actions"><button type="button" aria-label="Edit" onClick={() => setEditing({ ...item, features: [...item.features] })}><Icon name="pencil" size={14} /></button><button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button></td></tr>
        ))}</tbody></table></div>
      )}
      {editing && <div className="admin-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}><div className="admin-dialog wide" role="dialog"><h3>{editing.name || 'Service'}</h3>
        <Field label="Name"><TextInput value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field>
        <Field label="Short description"><TextArea rows={2} value={editing.shortDescription} onChange={event => setEditing({ ...editing, shortDescription: event.target.value })} /></Field>
        <Field label="Full description"><TextArea rows={4} value={editing.fullDescription} onChange={event => setEditing({ ...editing, fullDescription: event.target.value })} /></Field>
        <Field label="Features" hint="One per line"><TextArea rows={4} value={editing.features.join('\n')} onChange={event => setEditing({ ...editing, features: event.target.value.split('\n') })} /></Field>
        <Field label="CTA"><TextInput value={editing.cta} onChange={event => setEditing({ ...editing, cta: event.target.value })} /></Field>
        <Field label="Deliverables"><TextArea rows={2} value={editing.deliverables} onChange={event => setEditing({ ...editing, deliverables: event.target.value })} /></Field>
        <Field label="Visual"><Select value={editing.visual} onChange={event => setEditing({ ...editing, visual: event.target.value })}>{visuals.map(item => <option key={item}>{item}</option>)}</Select></Field>
        <IconSelect value={editing.icon} options={SERVICE_ICONS} onChange={icon => setEditing({ ...editing, icon: icon as IconName })} />
        <Toggle checked={editing.published} onChange={published => setEditing({ ...editing, published })} label="Published" />
        <div className="admin-dialog-actions"><button type="button" className="admin-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="admin-btn primary" onClick={save}>Save</button></div>
      </div></div>}
      {pending && <Confirm title="Delete this service?" text="It will disappear from the public Services section." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, services: current.services.filter(item => item.id !== pending) })); setPending(null); setToast('Service deleted.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
