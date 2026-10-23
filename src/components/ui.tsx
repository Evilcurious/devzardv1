import { useEffect, useRef, type ReactNode, type SVGProps } from 'react';

export type IconName = 'arrow' | 'arrow-up' | 'arrow-down' | 'chevron' | 'code' | 'grid' | 'box' | 'bag' | 'users' | 'chart' | 'search' | 'bell' | 'settings' | 'external' | 'check' | 'close' | 'menu' | 'globe' | 'layers' | 'spark' | 'terminal' | 'database' | 'git' | 'download' | 'plus' | 'mail' | 'phone' | 'copy' | 'clock' | 'shield' | 'bolt' | 'target' | 'arrow-left' | 'lock' | 'logout' | 'trash' | 'pencil' | 'upload' | 'eye';

const paths: Record<IconName, ReactNode> = {
  arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  'arrow-up': <><path d="M6 18 18 6M6 6h12v12" /></>,
  'arrow-down': <><path d="M12 4v15m-6-6 6 6 6-6" /></>,
  'arrow-left': <><path d="M20 12H5m6-6-6 6 6 6" /></>,
  chevron: <path d="m8 5 7 7-7 7" />,
  code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" /></>,
  grid: <><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><rect x="14.5" y="14.5" width="6" height="6" rx="1" /></>,
  box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z" /><path d="m3 8 9 5 9-5m-9 5v9M7.5 5.5l9 5v4" /></>,
  bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m2 11v-3a6 6 0 0 0-2-4" /></>,
  chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9h12m-8 4h4" /></>,
  settings: <><path d="m10 3-1 3-3 1-3-1-1 4 3 2v3l-2 2 3 3 3-1 3 2 3-2 3 1 3-3-2-2v-3l3-2-1-4-3 1-3-1-1-3h-4Z" /><circle cx="12" cy="12" r="3" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M4 8h16M4 16h16" />,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  layers: <><path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5" /></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-2v4m-2-2h4" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" /></>,
  git: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 7v10m12-10v3c0 4-12 1-12 5" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z" /><path d="m8 12 3 3 5-6" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  logout: <><path d="M10 17 5 12l5-5M5 12h14M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14" /></>,
  pencil: <path d="M13 5 19 11 9 21H3v-6L13 5Z" />,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 20h16" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
};

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-icon={name} {...props}>{paths[name]}</svg>;
}

export function BrandMark({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 78" fill="none" aria-hidden="true" className={`brand-mark ${className}`} {...props}>
      <path d="M8 2 35 26c5 5 8 11 9 16L34 54c0-11-5-17-10-22l-6-6v39h20L27 77H0l8-10V2Z" fill="currentColor" />
      <path d="M31 13h64L52 65h42L83 77H30l43-53H43L31 13Z" fill="currentColor" />
      <path d="m31 65 22-28 12-8-29 36h-5Z" fill="#23C7D9" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`wordmark ${className}`}><BrandMark /><span>DEVZARD</span></span>;
}

export function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`section-label${light ? ' on-light' : ''}`}><span className="label-cross">+</span>{children}</p>;
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.08, rootMargin: '0px 0px 30px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-content">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog" autoFocus><Icon name="close" /></button>
        {children}
      </div>
    </dialog>
  );
}