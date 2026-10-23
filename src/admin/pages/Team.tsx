import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsTeamMember } from '../../cms/types';
import { initialsOf } from '../../cms/types';
import { Icon } from '../../components/ui';
import { Badge, Confirm, Empty, Field, ImagePicker, TextArea, TextInput, Toast, Toggle } from '../ui';

export default function TeamPage() {
  const { content, patch, uploadImage, imageUrl, removeImage } = useContent();
  const [editing, setEditing] = useState<CmsTeamMember | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const list = content.team.slice().sort((a, b) => a.order - b.order);

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    const record = { ...editing, initials: editing.initials.trim() || initialsOf(editing.name) };
    await patch(current => {
      const exists = current.team.some(item => item.id === record.id);
      return { ...current, team: exists ? current.team.map(item => item.id === record.id ? record : item) : [...current.team, { ...record, order: current.team.length }] };
    });
    setEditing(null);
    setToast('Team member saved.');
  };

  const move = async (id: string, direction: -1 | 1) => {
    await patch(current => {
      const ordered = current.team.slice().sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(item => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= ordered.length) return current;
      [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
      return { ...current, team: ordered.map((item, order) => ({ ...item, order })) };
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head"><div><p className="admin-kicker">About</p><h1>Team</h1></div><button type="button" className="admin-btn primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', role: '', biography: '', imageId: '', initials: '', github: '', linkedin: '', x: '', published: true, order: list.length })}><Icon name="plus" size={14} />Add member</button></header>
      <p className="admin-note">Team appears inside About. It is not a navbar item.</p>
      {list.length === 0 ? <Empty title="No team members" text="Add the people who should appear in About." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Role</th><th>Public</th><th /></tr></thead><tbody>{list.map(item => (
          <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.role}</td><td>{item.published ? <Badge tone="live">Published</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="admin-row-actions">
              <button type="button" aria-label="Move up" onClick={() => move(item.id, -1)}><Icon name="arrow-up" size={14} /></button>
              <button type="button" aria-label="Move down" onClick={() => move(item.id, 1)}><Icon name="arrow-down" size={14} /></button>
              <button type="button" aria-label="Edit" onClick={() => setEditing({ ...item })}><Icon name="pencil" size={14} /></button>
              <button type="button" aria-label="Delete" onClick={() => setPending(item.id)}><Icon name="trash" size={14} /></button>
            </td></tr>
        ))}</tbody></table></div>
      )}
      {editing && <div className="admin-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}><div className="admin-dialog wide" role="dialog"><h3>{editing.name || 'Team member'}</h3>
        <Field label="Name"><TextInput value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field>
        <Field label="Role"><TextInput value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value })} /></Field>
        <Field label="Biography" hint="Leave blank if you do not want a bio on the site."><TextArea rows={4} value={editing.biography} onChange={event => setEditing({ ...editing, biography: event.target.value })} /></Field>
        <Field label="Initials"><TextInput value={editing.initials} onChange={event => setEditing({ ...editing, initials: event.target.value })} /></Field>
        <Field label="GitHub URL"><TextInput value={editing.github} onChange={event => setEditing({ ...editing, github: event.target.value })} /></Field>
        <Field label="LinkedIn URL"><TextInput value={editing.linkedin} onChange={event => setEditing({ ...editing, linkedin: event.target.value })} /></Field>
        <Field label="X URL"><TextInput value={editing.x} onChange={event => setEditing({ ...editing, x: event.target.value })} /></Field>
        <ImagePicker label="Profile image" url={imageUrl(editing.imageId)} onUpload={async file => { const id = await uploadImage(file); if (editing.imageId) await removeImage(editing.imageId); setEditing({ ...editing, imageId: id }); }} onRemove={async () => { if (editing.imageId) await removeImage(editing.imageId); setEditing({ ...editing, imageId: '' }); }} />
        <Toggle checked={editing.published} onChange={published => setEditing({ ...editing, published })} label="Published" />
        <div className="admin-dialog-actions"><button type="button" className="admin-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="admin-btn primary" onClick={save}>Save</button></div>
      </div></div>}
      {pending && <Confirm title="Remove this person?" text="They will no longer appear in About." onClose={() => setPending(null)} onConfirm={async () => { await patch(current => ({ ...current, team: current.team.filter(item => item.id !== pending) })); setPending(null); setToast('Removed.'); }} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
