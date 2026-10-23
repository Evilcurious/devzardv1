import { useContent } from '../cms/context';
import { SiteLink } from '../lib/navigation';
import { Icon, Reveal, SectionLabel } from '../components/ui';

const labels: Record<string, string> = {
  coming_soon: 'COMING SOON',
  available: 'AVAILABLE',
  maintenance: 'MAINTENANCE',
  archived: 'ARCHIVED',
};

export default function ProductsPage() {
  const { content, imageUrl } = useContent();
  const products = content.products.filter(item => item.published && item.status !== 'archived').sort((a, b) => a.order - b.order);
  const available = products.some(item => item.status === 'available');
  return (
    <div className="products-page">
      <div className="cta-grid" aria-hidden="true" />
      <div className="container products-inner">
        <SiteLink className="back-link" href="/"><Icon name="arrow-left" size={15} />Back to Devzard</SiteLink>
        <header className="products-hero">
          <SectionLabel>DEVZARD / PRODUCTS</SectionLabel>
          <h1>Products{!available && <span className="products-soon"> Coming soon.</span>}</h1>
          <p className="products-lede">We're building a suite of business systems designed to help organizations run smarter. {available ? 'A first product is now listed below.' : 'Our products are currently in development.'}</p>
          <p className="products-note mono">{available ? 'PUBLISHED PRODUCTS' : 'STATUS: IN DEVELOPMENT / LAUNCH DATE TBD'}</p>
        </header>
        <div className="products-grid">
          {products.map((product, index) => (
            <Reveal className="product-card" key={product.id} delay={index * 90}>
              {imageUrl(product.imageId) && <img className="product-card-image" src={imageUrl(product.imageId)} alt="" />}
              <div className="product-card-top">
                <span className="mono">{product.category || product.id}</span>
                <span className="product-status"><i className="status-dot" />{labels[product.status] || product.status}</span>
              </div>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              {product.pricing && <p className="product-price">{product.pricing}</p>}
              {product.status === 'available' && product.productUrl && <a className="text-link" href={product.productUrl} target="_blank" rel="noopener noreferrer">Visit product<Icon name="external" size={14} /></a>}
              <span className="product-card-meta mono">{product.status === 'available' ? 'AVAILABLE' : 'NO PUBLIC BETA / DETAILS ON REQUEST'}</span>
            </Reveal>
          ))}
        </div>
        <Reveal className="products-next">
          <div>
            <h2>Need business software now?</h2>
            <p>Our own products are still in development. In the meantime, we build the same kind of systems custom — around your exact workflows.</p>
          </div>
          <div className="products-actions">
            <SiteLink href="/#contact" className="button button-primary">Start a Project<Icon name="arrow" size={17} /></SiteLink>
            <SiteLink href="/#services" className="text-link">Explore our services<Icon name="arrow" size={15} /></SiteLink>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
