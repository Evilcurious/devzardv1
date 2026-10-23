import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsSettings } from '../../cms/types';
import { Field, Guard, SaveBar, TextInput, Toast } from '../ui';

export default function ContactPage() {
  const { content, patch } = useContent();
  const [draft, setDraft] = useState<CmsSettings>(content.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(content.settings);

  const save = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) { setError('Enter a valid email address.'); return; }
    if (!draft.phone.trim()) { setError('Phone is required.'); return; }
    setSaving(true); setError('');
    await patch(current => ({ ...current, settings: { ...current.settings, email: draft.email.trim(), phone: draft.phone.trim(), address: draft.address.trim(), github: draft.github.trim(), linkedin: draft.linkedin.trim(), x: draft.x.trim() } }));
    setSaving(false);
    setToast('Contact details saved.');
  };

  return (
    <Guard dirty={dirty}>
      <div className="admin-page">
        <header className="admin-page-head"><div><p className="admin-kicker">Public contact</p><h1>Contact</h1></div></header>
        <section className="admin-panel">
          <Field label="Email"><TextInput type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></Field>
          <Field label="Phone"><TextInput value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></Field>
          <Field label="Address" hint="Optional"><TextInput value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></Field>
        </section>
        <section className="admin-panel">
          <h2>Social</h2>
          <p className="admin-note">Leave a profile blank if it should not be linked yet.</p>
          <Field label="GitHub"><TextInput value={draft.github} onChange={event => setDraft({ ...draft, github: event.target.value })} placeholder="https://" /></Field>
          <Field label="LinkedIn"><TextInput value={draft.linkedin} onChange={event => setDraft({ ...draft, linkedin: event.target.value })} placeholder="https://" /></Field>
          <Field label="X"><TextInput value={draft.x} onChange={event => setDraft({ ...draft, x: event.target.value })} placeholder="https://" /></Field>
        </section>
        <SaveBar dirty={dirty} saving={saving} onSave={save} error={error} />
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    </Guard>
  );
}
