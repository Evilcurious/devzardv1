import { useEffect, useState, type AnchorHTMLAttributes } from 'react';

const navigationEvent = 'devzard:navigate';

export function navigate(to: string) {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== to) window.history.pushState({}, '', to);
  window.dispatchEvent(new Event(navigationEvent));
}

export function useLocation() {
  const getLocation = () => ({ pathname: window.location.pathname, hash: window.location.hash, key: performance.now() });
  const [location, setLocation] = useState(getLocation);

  useEffect(() => {
    const update = () => setLocation(getLocation());
    window.addEventListener('popstate', update);
    window.addEventListener(navigationEvent, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(navigationEvent, update);
    };
  }, []);

  return location;
}

export function SiteLink({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return;
        if (href.startsWith('/')) {
          event.preventDefault();
          navigate(href);
        }
      }}
    />
  );
}

export function downloadFile(filename: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}