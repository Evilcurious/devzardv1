import { SiteLink } from '../lib/navigation';
import { Icon, SectionLabel } from '../components/ui';

export default function NotFound() {
  return <section className="not-found container"><SectionLabel>404 / ROUTE NOT FOUND</SectionLabel><h1>This route<br />hasn't shipped.</h1><p>The page you're looking for isn't here.<br />The rest of Devzard is ready to explore.</p><SiteLink className="button button-primary" href="/">Back to Devzard<Icon name="arrow" size={17} /></SiteLink></section>;
}