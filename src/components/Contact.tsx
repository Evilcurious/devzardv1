import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Service } from '../data/site';
import { useContent } from '../cms/context';
import { telHref } from '../cms/types';
import { downloadFile, SiteLink } from '../lib/navigation';
import { Icon, Reveal, SectionLabel } from './ui';

type Inquiry = { name: string; email: string; company: string; message: string; budget: string; timeline: string };
const initialInquiry: Inquiry = { name: '', email: '', company: '', message: '', budget: '', timeline: '' };

export function ContactForm({ preset }: { preset: Service | null }) {
  const { content } = useContent();
  const email = content.settings.email;
  const phone = content.settings.phone;
  const [form, setForm] = useState<Inquiry>(initialInquiry);
  const [errors, setErrors] = useState<Partial<Inquiry>>({});
  const [ready, setReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (preset) {
      setForm(previous => ({ ...previous, message: previous.message || `I'm interested in ${preset.title.toLowerCase()}. Here's what I have in mind: ` }));
      setReady(false);
    }
  }, [preset]);

  useEffect(() => { if (ready) confirmationRef.current?.focus({ preventScroll: true }); }, [ready]);

  const update = (field: keyof Inquiry, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Inquiry> = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address.';
    if (form.message.trim().length < 20) nextErrors.message = 'Please tell us a little more, at least 20 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`inquiry-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setReady(true);
  };

  const brief = `DEVZARD / PROJECT INQUIRY\n\nName: ${form.name.trim()}\nEmail: ${form.email.trim()}\nCompany: ${form.company.trim() || 'Not specified'}\nBudget: ${form.budget || 'To discuss'}\nTimeline: ${form.timeline || 'Flexible'}\n\nWhat I want to build:\n${form.message.trim()}\n`;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`Project inquiry from ${form.name.trim()}${form.company.trim() ? ` at ${form.company.trim()}` : ''}`)}&body=${encodeURIComponent(brief)}`;

  const copyBrief = async () => {
    try { await navigator.clipboard.writeText(brief); setCopyStatus('Project brief copied to your clipboard.'); }
    catch { setCopyStatus('Clipboard access is unavailable. You can download your brief instead.'); }
  };

  return <section id="contact" className="contact-section section-space"><div className="container contact-grid">
    <Reveal className="contact-copy">
      <SectionLabel light>05 / Start a conversation</SectionLabel>
      <h2>Tell us what<br />you're building.</h2>
      <p>A rough idea is enough.<br />Let's talk through the rest.</p>
      <a href={`mailto:${email}`} className="contact-email"><Icon name="mail" size={19} /><span><small>Prefer a direct conversation?</small>{email}</span><Icon name="arrow-up" size={17} /></a>
      <a href={telHref(phone)} className="contact-email"><Icon name="phone" size={19} /><span><small>Call Devzard</small>{phone}</span><Icon name="arrow-up" size={17} /></a>
      <p className="contact-note"><Icon name="users" size={15} />Straight to the team. Not a sales pipeline.</p>
    </Reveal>
    <Reveal className="contact-form-wrap" delay={100}>{ready ? <div className="inquiry-ready"><span className="inquiry-check"><Icon name="check" size={26} /></span><p className="section-label on-light">PROJECT BRIEF / READY</p><h3 ref={confirmationRef} tabIndex={-1}>Let's make it happen, {form.name.trim().split(' ')[0]}.</h3><p>Your project request is ready. Open the email draft, review it, and hit send in your email app.</p><div className="inquiry-summary"><span>{form.company || form.name}</span><span>{form.budget || 'Budget to discuss'}</span><span>{form.timeline || 'Flexible timeline'}</span></div><a className="button button-dark" href={mailto}>Open email draft<Icon name="arrow-up" size={17} /></a><p className="inquiry-notice">Nothing has been sent yet. Your email app handles delivery to {email}.</p><div className="inquiry-alternatives"><button onClick={copyBrief}><Icon name="copy" size={14} />Copy brief</button><button onClick={() => downloadFile('devzard-project-brief.txt', brief)}><Icon name="download" size={14} />Download brief</button><button onClick={() => { setReady(false); setCopyStatus(''); }}>Edit request<Icon name="arrow-left" size={14} /></button></div><p className="copy-status" role="status">{copyStatus}</p></div> : <form noValidate onSubmit={submit} className="inquiry-form"><div className="form-row"><div className="form-field"><label htmlFor="inquiry-name">Name <span>*</span></label><input id="inquiry-name" autoComplete="name" name="name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <span className="form-error" id="name-error">{errors.name}</span>}</div><div className="form-field"><label htmlFor="inquiry-email">Email <span>*</span></label><input id="inquiry-email" type="email" autoComplete="email" name="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@company.com" maxLength={254} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <span className="form-error" id="email-error">{errors.email}</span>}</div></div><div className="form-field"><label htmlFor="inquiry-company">Company <span className="optional">Optional</span></label><input id="inquiry-company" autoComplete="organization" name="company" value={form.company} onChange={e => update('company', e.target.value)} placeholder="Your company or organization" maxLength={150} /></div><div className="form-field"><label htmlFor="inquiry-message">What do you want to build? <span>*</span></label><textarea id="inquiry-message" name="message" value={form.message} onChange={e => update('message', e.target.value)} placeholder="Tell us about your idea, the problem you're solving, or what you have in mind..." rows={4} maxLength={3000} required aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error' : undefined} />{errors.message && <span className="form-error" id="message-error">{errors.message}</span>}</div><div className="form-row"><div className="form-field"><label htmlFor="inquiry-budget">Estimated budget</label><select id="inquiry-budget" name="budget" value={form.budget} onChange={e => update('budget', e.target.value)}><option value="">Select a range</option><option>$1,000 - $5,000</option><option>$5,000 - $10,000</option><option>$10,000 - $25,000</option><option>$25,000+</option><option>Let's discuss</option></select></div><div className="form-field"><label htmlFor="inquiry-timeline">Timeline</label><select id="inquiry-timeline" name="timeline" value={form.timeline} onChange={e => update('timeline', e.target.value)}><option value="">When do you need it?</option><option>As soon as possible</option><option>1 - 2 months</option><option>3 - 6 months</option><option>Flexible</option></select></div></div><button type="submit" className="button button-dark form-submit">Send Project Request<Icon name="arrow" size={17} /></button><p className="form-privacy">Prepares an email draft. Nothing is sent without your confirmation.<br />By getting in touch, you agree to our <SiteLink href="/privacy">Privacy Policy</SiteLink>.</p></form>}</Reveal>
  </div></section>;
}