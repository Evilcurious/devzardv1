import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsTechnology } from '../../cms/types';
import { TECH_ICONS } from '../../cms/types';
import type { IconName } from '../../components/ui';
import { Icon } from '../../components/ui';
import { Badge, Confirm, Empty, Field, IconSelect, TextArea, TextInput, Toast, Toggle } from '../ui';

export default function TechnologyPage() {
  const { content, patch } = useContent();
  const [editing, setEditing] = useState<CmsTechnology | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const list = content.technologies.slice().sort((a, b) => a.order - b.order);

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    await patch(current => {
      const exists = current.technologies.some(item => item.id === editing.id);
      return { ...current, technologies: exists ? current.technologies.map(item => item.id === editing.id ? editing : item) : [...current.technologies, { ...editing, order: current.technologies.length }] };
    });
    setEditing(null);
    setToast('Technology saved.');
  };

  const move = async (id: string, direction: -1 | 1) => {
    await patch(current => {
      const ordered = current.technologies.slice().sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(item => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= ordered.length) return current;
      [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
      return { ...current, technologies: ordered.map((item, order) => ({ ...item, order })) };
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head"><div><p className="admin-kicker">Stack</p><h1>Technology</h1></div><button type="button" className="admin-btn primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', category: 'Frontend', icon: 'code', description: '', published: true, order: list.length })}><Icon name="plus" size={14} />Add technology</button></header>
      <p className="admin-note">Only list technologies Devzard actually uses.</p>
      {list.length === 0 ? <Empty title="No technologies" text="Add the stack shown on the public site." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Category</th><th>Public</th><th /></tr></thead><tbody>{list.map(item => (
          <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.category}</td><td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="admin-row-actions">
              <button type="button" aria-label="Move up" onClick={() => move(item.id, -1)}><Icon name="arrow-up" size={14} /></button>
              <button type="button" aria-label="Move down" onClick={() => move(item.id, 1)}><Icon name="arrow-down" size={14} /></button>
              <button type="button" aria-label="Edit" onClick={() => setEditing({ ...item })}><Icon name="pencil" size={14} /></button>
              <button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button>
            </td></tr>
        ))}</tbody></table></div>
      )}
      {editing && <div className="admin-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}><div className="admin-dialog" role="dialog"><h3>{editing.name || 'Technology'}</h3>
        <Field label="Name"><TextInput value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field>
        <Field label="Category"><TextInput value={editing.category} onChange={event => setEditing({ ...editing, category: event.target.value })} /></Field>
        <Field label="Description"><TextArea rows={3} value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></Field>
        <IconSelect value={editing.icon} options={TECH_ICONS} onChange={icon => setEditing({ ...editing, icon: icon as IconName })} />
        <Toggle checked={editing.published} onChange={published => setEditing({ ...editing, published })} label="Published" />
        <div className="admin-dialog-actions"><button type="button" className="admin-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="admin-btn primary" onClick={save}>Save</button></div>
      </div></div>}
      {pending && <Confirm title="Remove this technology?" text="It will no longer appear in the public technology section." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, technologies: current.technologies.filter(item => item.id !== pending) })); setPending(null); setToast('Removed.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
