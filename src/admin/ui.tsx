import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/ui';
import { cn } from '../utils/cn';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}{hint && <small>{hint}</small>}</span>{children}{error && <em>{error}</em>}</label>;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('admin-input', className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('admin-input admin-textarea', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('admin-input', props.className)} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" className={cn('admin-toggle', checked && 'on')} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><i /><span>{label}</span></button>;
}

export function Badge({ tone = 'muted', children }: { tone?: 'muted' | 'live' | 'warn' | 'accent'; children: ReactNode }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="admin-empty"><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(timer);
  }, [onDone, message]);
  return <div className="admin-toast" role="status">{message}</div>;
}

export function Confirm({ title, text, confirmLabel = 'Delete', onConfirm, onClose }: { title: string; text: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="admin-overlay" role="presentation" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="admin-dialog" role="dialog" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{title}</h3>
        <p>{text}</p>
        <div className="admin-dialog-actions">
          <button type="button" className="admin-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="admin-btn danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function ImagePicker({ label, url, onUpload, onRemove }: { label: string; url: string; onUpload: (file: File) => Promise<void>; onRemove: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="admin-image-picker">
      <span>{label}</span>
      {url ? <img src={url} alt="" /> : <div className="admin-image-empty">No image</div>}
      <div className="admin-image-actions">
        <label className="admin-btn ghost small"><Icon name="upload" size={14} />{busy ? 'Uploading…' : 'Upload'}<input type="file" accept="image/*" hidden disabled={busy} onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setBusy(true); setError('');
          try { await onUpload(file); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Upload failed.'); }
          setBusy(false);
        }} /></label>
        {url && <button type="button" className="admin-btn ghost small" onClick={onRemove}><Icon name="trash" size={14} />Remove</button>}
      </div>
      {error && <em>{error}</em>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="admin-search"><Icon name="search" size={15} /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></div>;
}

export function SaveBar({ dirty, saving, onSave, error }: { dirty: boolean; saving: boolean; onSave: () => void; error?: string }) {
  if (!dirty && !error) return null;
  return <div className="admin-savebar">{error ? <span className="error">{error}</span> : <span>Unsaved changes</span>}<button type="button" className="admin-btn primary" disabled={saving || !dirty} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button></div>;
}

export function Guard({ dirty, children }: { dirty: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);
  return <>{children}</>;
}

export function IconSelect({ value, options, onChange }: { value: IconName; options: IconName[]; onChange: (value: IconName) => void }) {
  return <div className="admin-icon-select">{options.map(name => <button type="button" key={name} className={value === name ? 'on' : ''} onClick={() => onChange(name)} aria-label={name}><Icon name={name} size={16} /></button>)}</div>;
}

export function LoginForm({ mode, onSubmit, error }: { mode: 'setup' | 'login'; onSubmit: (email: string, password: string) => Promise<void>; error: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setLocalError('');
    try { await onSubmit(email, password); } catch (caught) { setLocalError(caught instanceof Error ? caught.message : 'Something went wrong.'); }
    setBusy(false);
  };
  return (
    <form className="admin-login-form" onSubmit={submit}>
      <Field label="Email"><TextInput type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required autoFocus /></Field>
      <Field label="Password" hint={mode === 'setup' ? 'At least 12 characters. Stored only as a hash on this device.' : undefined}>
        <TextInput type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={mode === 'setup' ? 12 : 1} />
      </Field>
      {(localError || error) && <p className="admin-form-error">{localError || error}</p>}
      <button className="admin-btn primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'setup' ? 'Create admin account' : 'Sign in'}</button>
    </form>
  );
}
