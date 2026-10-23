import { useState } from 'react';
import { useContent } from '../../cms/context';
import { api } from '../../cms/client';
import { downloadFile } from '../../lib/navigation';
import type { CmsSettings } from '../../cms/types';
import { Confirm, Field, Guard, ImagePicker, SaveBar, TextArea, TextInput, Toast } from '../ui';

export default function SettingsPage() {
  const { content, patch, restoreDefaults, uploadImage, imageUrl, removeImage } = useContent();
  const [draft, setDraft] = useState<CmsSettings>(content.settings);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(content.settings);

  const save = async () => {
    setSaving(true);
    await patch(current => ({ ...current, settings: draft }));
    setSaving(false);
    setToast('Settings saved.');
  };

  const exportJson = () => {
    downloadFile('devzard-content.json', JSON.stringify(content, null, 2), 'application/json');
  };

  const importJson = async (file: File) => {
    const parsed = JSON.parse(await file.text()) as typeof content;
    if (parsed.version !== 1 || !Array.isArray(parsed.projects)) throw new Error('That file is not a Devzard content export.');
    await patch(() => parsed);
    setDraft(parsed.settings);
    setToast('Content imported.');
  };

  return (
    <Guard dirty={dirty}>
      <div className="admin-page">
        <header className="admin-page-head"><div><p className="admin-kicker">Global</p><h1>Settings</h1></div></header>
        <section className="admin-panel">
          <h2>Site</h2>
          <Field label="Site name"><TextInput value={draft.siteName} onChange={event => setDraft({ ...draft, siteName: event.target.value })} /></Field>
          <Field label="Footer text"><TextArea rows={2} value={draft.footerText} onChange={event => setDraft({ ...draft, footerText: event.target.value })} /></Field>
          <ImagePicker label="Logo override" url={imageUrl(draft.logoImageId)} onUpload={async file => setDraft({ ...draft, logoImageId: await uploadImage(file) })} onRemove={async () => { if (draft.logoImageId) await removeImage(draft.logoImageId); setDraft({ ...draft, logoImageId: '' }); }} />
          <ImagePicker label="Favicon override" url={imageUrl(draft.faviconImageId)} onUpload={async file => setDraft({ ...draft, faviconImageId: await uploadImage(file) })} onRemove={async () => { if (draft.faviconImageId) await removeImage(draft.faviconImageId); setDraft({ ...draft, faviconImageId: '' }); }} />
        </section>
        <section className="admin-panel">
          <h2>SEO</h2>
          <Field label="Default title"><TextInput value={draft.seoTitle} onChange={event => setDraft({ ...draft, seoTitle: event.target.value })} /></Field>
          <Field label="Meta description"><TextArea rows={3} value={draft.seoDescription} onChange={event => setDraft({ ...draft, seoDescription: event.target.value })} /></Field>
          <Field label="Open Graph image path"><TextInput value={draft.ogImage} onChange={event => setDraft({ ...draft, ogImage: event.target.value })} /></Field>
        </section>
        <SaveBar dirty={dirty} saving={saving} onSave={save} />
        <section className="admin-panel">
          <h2>Backup</h2>
          <p className="admin-note">Content lives in this browser. Export a JSON backup before clearing site data.</p>
          <div className="admin-quick">
            <button type="button" className="admin-btn ghost" onClick={exportJson}>Export JSON</button>
            <label className="admin-btn ghost">Import JSON<input type="file" accept="application/json" hidden onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { await importJson(file); } catch (caught) { setToast(caught instanceof Error ? caught.message : 'Import failed.'); } }} /></label>
            <button type="button" className="admin-btn danger" onClick={() => setResetOpen(true)}>Restore shipped defaults</button>
          </div>
        </section>
        <section className="admin-panel">
          <h2>Admin password</h2>
          <Field label="Current password"><TextInput type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></Field>
          <Field label="New password"><TextInput type="password" value={nextPassword} onChange={event => setNextPassword(event.target.value)} /></Field>
          {passwordError && <p className="admin-form-error">{passwordError}</p>}
          <button type="button" className="admin-btn ghost" onClick={async () => { setPasswordError(''); try { await api.password(currentPassword, nextPassword); setCurrentPassword(''); setNextPassword(''); setToast('Password updated. Other sessions were signed out.'); } catch (caught) { setPasswordError(caught instanceof Error ? caught.message : 'Could not update password.'); } }}>Update password</button>
          <p className="admin-note">Two-factor authentication is not enabled yet. The session model is ready for TOTP later; this screen will not show a fake 2FA control until it actually verifies codes.</p>
        </section>
        {resetOpen && <Confirm title="Restore shipped defaults?" text="This replaces projects, products, services, team, and homepage copy with the original Devzard content. DeepHQ remains the featured public project. Your admin account is not removed." confirmLabel="Restore" onClose={() => setResetOpen(false)} onConfirm={async () => { await restoreDefaults(); setDraft((await import('../../cms/seed')).SEED.settings); setResetOpen(false); setToast('Defaults restored.'); }} />}
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    </Guard>
  );
}
