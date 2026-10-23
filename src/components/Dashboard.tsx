import { useId, useMemo, useState } from 'react';
import { orders, products } from '../data/site';
import { downloadFile } from '../lib/navigation';
import { BrandMark, Icon, Modal, type IconName } from './ui';

type Panel = 'Overview' | 'Products' | 'Orders' | 'Customers' | 'Analytics';
const panels: { label: Panel; icon: IconName }[] = [
  { label: 'Overview', icon: 'grid' },
  { label: 'Products', icon: 'box' },
  { label: 'Orders', icon: 'bag' },
  { label: 'Customers', icon: 'users' },
  { label: 'Analytics', icon: 'chart' },
];

function RevenueChart({ range }: { range: string }) {
  const id = useId().replace(/:/g, '');
  const path = range === '7' ? 'M0 133 C25 135 28 108 55 113 S85 144 110 104 S145 102 166 79 S200 100 221 57 S260 80 290 39 S330 70 354 32 S401 45 426 12 S466 31 500 6' : range === '90' ? 'M0 144 C32 145 32 125 55 129 S88 138 110 115 S145 135 166 108 S201 115 221 77 S260 111 290 68 S330 72 354 41 S402 65 426 33 S467 41 500 5' : 'M0 145 C20 145 20 130 40 133 S60 149 80 137 S95 103 117 115 S140 134 158 102 S180 94 199 108 S220 90 236 84 S258 101 277 67 S302 77 324 55 S347 73 367 43 S390 57 409 36 S430 50 453 18 S480 30 500 8';
  return (
    <div className="revenue-chart" role="img" aria-label={`Illustrative sales revenue trend for the last ${range} days, trending upward. Sample data.`}>
      <div className="chart-y"><span>$25k</span><span>$20k</span><span>$15k</span><span>$10k</span></div>
      <div className="chart-plot">
        <div className="chart-grid"><i /><i /><i /><i /></div>
        <svg viewBox="0 0 500 160" preserveAspectRatio="none">
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#57d7e1" stopOpacity=".22" /><stop offset="100%" stopColor="#57d7e1" stopOpacity="0" /></linearGradient></defs>
          <path d={`${path} L500 160 L0 160Z`} fill={`url(#${id})`} />
          <path key={range} className="chart-line" d={path} fill="none" stroke="#67dce7" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength="1" />
        </svg>
        <div className="chart-x">{(range === '7' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : range === '90' ? ['Apr 1', 'Apr 15', 'May 1', 'May 15', 'Jun 1', 'Jun 15', 'Jun 30'] : ['Jun 1', 'Jun 5', 'Jun 10', 'Jun 15', 'Jun 20', 'Jun 25', 'Jun 30']).map(label => <span key={label}>{label}</span>)}</div>
      </div>
    </div>
  );
}

export function Dashboard({ compact = false }: { compact?: boolean }) {
  const [panel, setPanel] = useState<Panel>('Overview');
  const [range, setRange] = useState('30');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState('All orders');
  const [selectedOrder, setSelectedOrder] = useState<(typeof orders)[number] | null>(null);
  const [notice, setNotice] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const filteredProducts = useMemo(() => products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const filteredOrders = useMemo(() => orders.filter(order => `${order.id} ${order.name} ${order.email}`.toLowerCase().includes(search.toLowerCase()) && (orderFilter === 'All orders' || order.status === orderFilter)), [search, orderFilter]);
  const multiplier = range === '7' ? 0.28 : range === '90' ? 2.7 : 1;

  const exportReport = () => {
    const header = panel === 'Products' ? 'ID,Product,Category,Price,Stock' : 'Order,Customer,Date,Amount,Status';
    const rows = panel === 'Products' ? filteredProducts.map(p => `${p.id},${p.name},${p.category},${p.price},${p.stock}`) : filteredOrders.map(o => `${o.id},${o.name},"${o.date}",${o.amount},${o.status}`);
    downloadFile(`alwazir-${panel.toLowerCase()}-demo.csv`, [header, ...rows].join('\n'), 'text/csv');
    setNotice('Sample report downloaded.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const openPanel = (next: Panel) => { setPanel(next); setSearch(''); setOrderFilter('All orders'); };

  return (
    <div className={`product-dashboard${compact ? ' dashboard-compact' : ''}`}>
      <div className="browser-bar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="browser-address"><Icon name="shield" size={11} /><span>alwazir / workspace</span></div>
        <span className="browser-demo"><i className="status-dot" />Interactive demo</span>
      </div>
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar" aria-label="Demo application navigation">
          <div className="workspace-brand"><span className="alwazir-symbol">a.</span><div>Alwazir<span>Business workspace</span></div><Icon name="chevron" size={12} /></div>
          <span className="sidebar-label">WORKSPACE</span>
          <nav className="dashboard-nav" aria-label="Alwazir demo sections">
            {panels.map(item => <button key={item.label} onClick={() => openPanel(item.label)} className={panel === item.label ? 'active' : ''} aria-pressed={panel === item.label}><Icon name={item.icon} size={15} /><span>{item.label}</span>{item.label === 'Orders' && <small>4</small>}</button>)}
          </nav>
          <div className="sidebar-bottom">
            <span><span className="status-dot" />All systems operational</span>
            <div className="built-by"><BrandMark /><span>Built by <strong>Devzard</strong></span></div>
          </div>
        </aside>
        <div className="dashboard-main">
          <div className="dashboard-topbar"><span>Workspace <span className="breadcrumb-slash">/</span> <strong>{panel}</strong></span><div className="dashboard-actions"><button className="icon-button" onClick={() => setSearchOpen(!searchOpen)} aria-label={searchOpen ? 'Close dashboard search' : 'Search dashboard'} aria-expanded={searchOpen}><Icon name="search" size={15} /></button><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="View demo notifications" aria-expanded={notificationsOpen}><Icon name="bell" size={15} /><i /></button><span className="dashboard-avatar">DZ</span></div></div>
          {notificationsOpen && <div className="dashboard-notifications"><Icon name="check" size={15} /><span>You're up to date. The latest demo build is deployed.</span><button className="icon-button" aria-label="Dismiss notifications" onClick={() => setNotificationsOpen(false)}><Icon name="close" size={13} /></button></div>}
          <div className="dashboard-content">
            <div className="dashboard-heading"><div><h3>{panel}</h3><p>{panel === 'Overview' ? "Here's what's happening with your store today." : panel === 'Products' ? 'Your catalog, connected to your business.' : panel === 'Orders' ? 'Every order. One clear workflow.' : panel === 'Customers' ? 'The people behind your business.' : 'A clearer picture of how your store performs.'}</p></div><div className="dashboard-controls"><label className="sr-only" htmlFor={compact ? 'range-compact' : 'range-hero'}>Reporting period</label><select id={compact ? 'range-compact' : 'range-hero'} value={range} onChange={e => setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button className="mini-button" onClick={exportReport}><Icon name="download" size={12} /><span>Export</span></button></div></div>
            {searchOpen && <div className="dashboard-search"><Icon name="search" size={15} /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, customers, or order IDs..." aria-label="Search sample products and orders" /><button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><Icon name="close" size={13} /></button></div>}
            <div className="dashboard-panel" key={panel}>
              {(panel === 'Overview' || panel === 'Analytics') && <>
                <div className="dashboard-metrics">
                  {[{ label: 'Total revenue', value: `$${Math.round(24580 * multiplier).toLocaleString('en-US')}.00`, change: '+12.8%', icon: 'chart' }, { label: 'Orders', value: Math.round(148 * multiplier).toLocaleString('en-US'), change: '+8.2%', icon: 'bag' }, { label: 'Active products', value: '64', change: '+4 new', icon: 'box' }, { label: 'Customers', value: Math.round(1268 * multiplier).toLocaleString('en-US'), change: '+16.4%', icon: 'users' }].map(metric => <div className="dashboard-metric" key={metric.label}><div><span>{metric.label}</span><Icon name={metric.icon as IconName} size={13} /></div><strong>{metric.value}</strong><span className="metric-change"><Icon name="arrow-up" size={10} />{metric.change}<small>vs. previous period</small></span></div>)}
                </div>
                <div className="dashboard-charts">
                  <div className="revenue-panel"><div className="panel-heading"><h4>Revenue overview</h4><span><i className="status-dot" />Revenue</span></div><RevenueChart range={range} /></div>
                  <div className="recent-panel"><div className="panel-heading"><h4>{panel === 'Analytics' ? 'Sales by category' : 'Recent orders'}</h4><button onClick={() => openPanel(panel === 'Analytics' ? 'Products' : 'Orders')} aria-label={panel === 'Analytics' ? 'View all products' : 'View all orders'}><Icon name="arrow-up" size={13} /></button></div>{panel === 'Analytics' ? <div className="category-breakdown">{[{ name: 'Furniture', value: 62 }, { name: 'Home accessories', value: 28 }, { name: 'Textiles', value: 10 }].map(item => <div key={item.name}><p>{item.name}<span>{item.value}%</span></p><div><i style={{ width: `${item.value}%` }} /></div></div>)}</div> : <div className="recent-orders">{filteredOrders.slice(0, 3).map(order => <button key={order.id} className="recent-order" onClick={() => setSelectedOrder(order)}><span className="customer-avatar">{order.initials}</span><span>{order.name}<small>{order.id}</small></span><span className="recent-amount">${order.amount.toFixed(2)}<small className={order.status === 'Fulfilled' ? 'text-cyan' : ''}>{order.status}</small></span></button>)}{filteredOrders.length === 0 && <p className="demo-empty">No matching orders.</p>}</div>}</div>
                </div>
              </>}
              {(panel === 'Overview' || panel === 'Products') && <div className="products-panel"><div className="panel-heading"><h4>{panel === 'Overview' ? 'Top products' : 'Product catalog'}<span className="table-count">{filteredProducts.length}</span></h4>{panel === 'Overview' && <button className="view-all" onClick={() => openPanel('Products')}>View all products <Icon name="arrow" size={12} /></button>}</div><div className="table-scroll"><table className="demo-table"><thead><tr><th>Product</th><th>Category</th><th>Inventory</th><th>Price</th></tr></thead><tbody>{filteredProducts.slice(0, panel === 'Overview' ? 2 : 4).map(product => <tr key={product.id}><td><span className="product-cell"><img src={product.image} alt="" loading="lazy" width="30" height="30" style={{ objectPosition: product.position }} /><span>{product.name}<small>{product.id}</small></span></span></td><td>{product.category}</td><td><span className="inventory-dot" />{product.stock} in stock</td><td>${product.price.toFixed(2)}</td></tr>)}</tbody></table>{filteredProducts.length === 0 && <p className="demo-empty">No products match "{search}". Try a different search.</p>}</div></div>}
              {panel === 'Orders' && <div className="orders-panel"><div className="order-filters" aria-label="Filter orders">{['All orders', 'Fulfilled', 'Processing', 'Pending'].map(filter => <button key={filter} onClick={() => setOrderFilter(filter)} className={orderFilter === filter ? 'active' : ''} aria-pressed={orderFilter === filter}>{filter}</button>)}</div><div className="table-scroll"><table className="demo-table order-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{filteredOrders.map(order => <tr key={order.id}><td><button className="order-link" onClick={() => setSelectedOrder(order)}>{order.id}<Icon name="arrow-up" size={11} /></button></td><td>{order.name}</td><td>{order.date}</td><td><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span></td><td>${order.amount.toFixed(2)}</td></tr>)}</tbody></table>{filteredOrders.length === 0 && <p className="demo-empty">No orders match these filters.</p>}</div></div>}
              {panel === 'Customers' && <div className="customers-panel"><div className="panel-heading"><h4>Customer directory</h4><span className="mono">SAMPLE RECORDS</span></div><div className="table-scroll"><table className="demo-table"><thead><tr><th>Customer</th><th>Email</th><th>Latest order</th><th>Total spent</th></tr></thead><tbody>{filteredOrders.map(order => <tr key={order.id}><td><span className="product-cell"><span className="customer-avatar">{order.initials}</span>{order.name}</span></td><td>{order.email}</td><td><button className="order-link" onClick={() => setSelectedOrder(order)}>{order.id}</button></td><td>${order.amount.toFixed(2)}</td></tr>)}</tbody></table>{filteredOrders.length === 0 && <p className="demo-empty">No matching customers.</p>}</div></div>}
              {panel === 'Analytics' && <div className="analytics-note"><Icon name="chart" size={16} /><div><strong>One connected view.</strong><p>Revenue, orders, and customer activity, without another spreadsheet. Change the date range to explore the demo.</p></div></div>}
            </div>
            <div className="dashboard-feedback" role="status">{notice}</div>
          </div>
          <div className="dashboard-status"><span><Icon name="terminal" size={11} />BUILD_SUCCESSFUL</span><span><i className="status-dot" />API ONLINE</span><span><Icon name="database" size={11} />DATABASE CONNECTED</span><span className="sample-data">SAMPLE DATA</span></div>
        </div>
      </div>
      {selectedOrder && <Modal title={`Order ${selectedOrder.id}`} onClose={() => setSelectedOrder(null)} className="order-modal"><p className="section-label">ALWAZIR / DEMO ORDER</p><h2>{selectedOrder.id}</h2><p className="modal-description">An example of a connected order workflow.</p><dl className="order-details"><div><dt>Customer</dt><dd>{selectedOrder.name}</dd></div><div><dt>Email</dt><dd>{selectedOrder.email}</dd></div><div><dt>Items</dt><dd>{selectedOrder.items}</dd></div><div><dt>Status</dt><dd>{selectedOrder.status}</dd></div><div><dt>Total</dt><dd>${selectedOrder.amount.toFixed(2)}</dd></div></dl><p className="fine-print">This is an interactive product demonstration. All customer and transaction data is illustrative.</p><button className="button button-primary" onClick={() => setSelectedOrder(null)}>Back to workspace<Icon name="arrow" size={16} /></button></Modal>}
    </div>
  );
}