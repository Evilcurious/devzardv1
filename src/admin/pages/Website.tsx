import { useState } from 'react';
import { useContent } from '../../cms/context';
import type { CmsHomepage, CmsPrinciple, CmsProcessStep } from '../../cms/types';
import { SERVICE_ICONS } from '../../cms/types';
import { Field, Guard, IconSelect, SaveBar, TextArea, TextInput, Toast } from '../ui';
import { Icon } from '../../components/ui';

export default function WebsitePage() {
  const { content, patch } = useContent();
  const [draft, setDraft] = useState<CmsHomepage>(content.homepage);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(content.homepage);
  const save = async () => { setSaving(true); await patch(current => ({ ...current, homepage: draft })); setSaving(false); setToast('Homepage content saved.'); };

  const setPrinciple = (index: number, next: CmsPrinciple) => setDraft({ ...draft, principles: draft.principles.map((item, i) => i === index ? next : item) });
  const setStep = (index: number, next: CmsProcessStep) => setDraft({ ...draft, processSteps: draft.processSteps.map((item, i) => i === index ? next : item) });

  return (
    <Guard dirty={dirty}>
      <div className="admin-page">
        <header className="admin-page-head"><div><p className="admin-kicker">Homepage</p><h1>Website</h1></div></header>
        <section className="admin-panel"><h2>Hero</h2>
          <div className="admin-form-grid">
            <Field label="Brand word"><TextInput value={draft.heroBrand} onChange={event => setDraft({ ...draft, heroBrand: event.target.value })} /></Field>
            <Field label="Headline"><TextInput value={draft.heroHeadline} onChange={event => setDraft({ ...draft, heroHeadline: event.target.value })} /></Field>
            <Field label="Headline accent"><TextInput value={draft.heroHeadlineAccent} onChange={event => setDraft({ ...draft, heroHeadlineAccent: event.target.value })} /></Field>
            <Field label="Primary CTA"><TextInput value={draft.heroCta} onChange={event => setDraft({ ...draft, heroCta: event.target.value })} /></Field>
            <Field label="Primary CTA link"><TextInput value={draft.heroCtaLink} onChange={event => setDraft({ ...draft, heroCtaLink: event.target.value })} /></Field>
            <Field label="Secondary CTA"><TextInput value={draft.heroSecondary} onChange={event => setDraft({ ...draft, heroSecondary: event.target.value })} /></Field>
            <Field label="Secondary CTA link"><TextInput value={draft.heroSecondaryLink} onChange={event => setDraft({ ...draft, heroSecondaryLink: event.target.value })} /></Field>
          </div>
          <Field label="Subtitle"><TextArea rows={3} value={draft.heroSubtitle} onChange={event => setDraft({ ...draft, heroSubtitle: event.target.value })} /></Field>
        </section>
        <section className="admin-panel"><h2>Principles</h2>
          {draft.principles.map((item, index) => <div key={item.id} className="admin-stack">
            <Field label="Title"><TextInput value={item.title} onChange={event => setPrinciple(index, { ...item, title: event.target.value })} /></Field>
            <Field label="Description"><TextArea rows={2} value={item.description} onChange={event => setPrinciple(index, { ...item, description: event.target.value })} /></Field>
            <IconSelect value={item.icon} options={SERVICE_ICONS} onChange={icon => setPrinciple(index, { ...item, icon })} />
          </div>)}
        </section>
        <section className="admin-panel"><h2>Process</h2>
          <Field label="Title"><TextInput value={draft.processTitle} onChange={event => setDraft({ ...draft, processTitle: event.target.value })} /></Field>
          <Field label="Subtitle"><TextArea rows={2} value={draft.processSubtitle} onChange={event => setDraft({ ...draft, processSubtitle: event.target.value })} /></Field>
          {draft.processSteps.map((item, index) => <div key={item.id} className="admin-form-grid">
            <Field label="Number"><TextInput value={item.n} onChange={event => setStep(index, { ...item, n: event.target.value })} /></Field>
            <Field label="Title"><TextInput value={item.title} onChange={event => setStep(index, { ...item, title: event.target.value })} /></Field>
            <Field label="Meta"><TextInput value={item.meta} onChange={event => setStep(index, { ...item, meta: event.target.value })} /></Field>
            <Field label="Text"><TextInput value={item.text} onChange={event => setStep(index, { ...item, text: event.target.value })} /></Field>
          </div>)}
        </section>
        <section className="admin-panel"><h2>Final CTA</h2>
          <div className="admin-form-grid">
            <Field label="Label"><TextInput value={draft.finalCtaLabel} onChange={event => setDraft({ ...draft, finalCtaLabel: event.target.value })} /></Field>
            <Field label="Title"><TextInput value={draft.finalCtaTitle} onChange={event => setDraft({ ...draft, finalCtaTitle: event.target.value })} /></Field>
            <Field label="Accent"><TextInput value={draft.finalCtaAccent} onChange={event => setDraft({ ...draft, finalCtaAccent: event.target.value })} /></Field>
            <Field label="Primary button"><TextInput value={draft.finalCtaButton} onChange={event => setDraft({ ...draft, finalCtaButton: event.target.value })} /></Field>
            <Field label="Secondary button"><TextInput value={draft.finalCtaSecondary} onChange={event => setDraft({ ...draft, finalCtaSecondary: event.target.value })} /></Field>
          </div>
          <Field label="Supporting text"><TextArea rows={2} value={draft.finalCtaText} onChange={event => setDraft({ ...draft, finalCtaText: event.target.value })} /></Field>
        </section>
        <SaveBar dirty={dirty} saving={saving} onSave={save} />
        {toast && <Toast message={toast} onDone={() => setToast('')} />}
        <p className="admin-note"><Icon name="eye" size={12} /> These fields update the existing homepage. They do not change the layout.</p>
      </div>
    </Guard>
  );
}
