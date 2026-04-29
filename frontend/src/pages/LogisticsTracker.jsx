import React, { useState, useEffect } from 'react';
import { Truck, PackageSearch, RefreshCw, Plus, ArrowRight, ShieldCheck, Box, Route, ShoppingCart, Search, Check, AlertCircle, MapPin, Map } from 'lucide-react';
import { trackerService } from '../services/api';

const LogisticsTracker = () => {
  // Global Data State
  const [shipments, setShipments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState('Checking...');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, shipments, inventory, orders, routes
  const [sessionOrdersCount, setSessionOrdersCount] = useState(0);

  // Form States
  const [shipmentForm, setShipmentForm] = useState({ shipment_id: '', origin: '', destination: '', estimated_delivery: '' });
  const [trackShipmentId, setTrackShipmentId] = useState('');
  const [trackShipmentResult, setTrackShipmentResult] = useState(null);

  const [inventoryForm, setInventoryForm] = useState({ item_id: '', name: '', quantity: '', location: '', category: '' });
  const [lookupItemId, setLookupItemId] = useState('');
  const [lookupItemResult, setLookupItemResult] = useState(null);

  const [orderForm, setOrderForm] = useState({ order_id: '', customer: '', items: '' });
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackOrderResult, setTrackOrderResult] = useState(null);

  const [routeForm, setRouteForm] = useState({ start: '', waypoints: '', end: '' });
  const [routeResult, setRouteResult] = useState(null);

  // Messaging States
  const [msg, setMsg] = useState({ type: '', text: '', source: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const hStatus = await trackerService.getHealth();
      setHealth(hStatus.status || 'UP');

      const sData = await trackerService.getShipments();
      setShipments(sData.shipments || []);

      const iData = await trackerService.getInventory();
      setInventory(iData.inventory || []);
    } catch (err) {
      console.error(err);
      setHealth('DOWN');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayMsg = (type, text, source) => {
    setMsg({ type, text, source });
    setTimeout(() => setMsg({ type: '', text: '', source: '' }), 5000);
  };

  // --- Handlers ---
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      await trackerService.createShipment(shipmentForm);
      displayMsg('success', 'Shipment created successfully!', 'createShipment');
      setShipmentForm({ shipment_id: '', origin: '', destination: '', estimated_delivery: '' });
      fetchData();
    } catch (err) {
      displayMsg('error', err.response?.data?.error || 'Failed to create shipment', 'createShipment');
    }
  };

  const handleTrackShipment = async (e) => {
    e.preventDefault();
    try {
      const data = await trackerService.trackShipment(trackShipmentId);
      setTrackShipmentResult(data);
    } catch (err) {
      setTrackShipmentResult({ error: err.response?.data?.error || 'Shipment not found' });
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    try {
      await trackerService.createInventory({
        ...inventoryForm,
        quantity: parseInt(inventoryForm.quantity)
      });
      displayMsg('success', 'Inventory item added successfully!', 'addInventory');
      setInventoryForm({ item_id: '', name: '', quantity: '', location: '', category: '' });
      fetchData();
    } catch (err) {
      displayMsg('error', err.response?.data?.error || 'Failed to add item', 'addInventory');
    }
  };

  const handleLookupInventory = async (e) => {
    e.preventDefault();
    try {
      const data = await trackerService.lookupInventoryItem(lookupItemId);
      setLookupItemResult(data);
    } catch (err) {
      setLookupItemResult({ error: err.response?.data?.error || 'Item not found' });
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const itemsList = orderForm.items ? orderForm.items.split(',').map(s => s.trim()) : [];
      await trackerService.createOrder({
        ...orderForm,
        items: itemsList
      });
      displayMsg('success', 'Order created successfully!', 'createOrder');
      setOrderForm({ order_id: '', customer: '', items: '' });
      setSessionOrdersCount(prev => prev + 1);
    } catch (err) {
      displayMsg('error', err.response?.data?.error || 'Failed to create order', 'createOrder');
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    try {
      const data = await trackerService.trackOrder(trackOrderId);
      setTrackOrderResult(data);
    } catch (err) {
      setTrackOrderResult({ error: err.response?.data?.error || 'Order not found' });
    }
  };

  const handleOptimizeRoute = async (e) => {
    e.preventDefault();
    setRouteResult({ loading: true });
    try {
      const wpList = routeForm.waypoints ? routeForm.waypoints.split(',').map(s => s.trim()) : [];
      const data = await trackerService.optimizeRoute({
        start: routeForm.start,
        end: routeForm.end,
        waypoints: wpList
      });
      setRouteResult(data.route);
    } catch (err) {
      setRouteResult({ error: err.response?.data?.error || 'Optimization failed' });
    }
  };

  // --- Components ---
  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      in_transit: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      delivered: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      created: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    };
    const c = colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md border ${c}`}>
        {status}
      </span>
    );
  };

  const FormMsg = ({ source }) => {
    if (msg.source !== source) return null;
    return (
      <div className={`mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
        {msg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        {msg.text}
      </div>
    );
  };

  const Card = ({ title, children, icon: Icon }) => (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-violet-400" />}
        <h3 className="font-semibold text-zinc-200">{title}</h3>
      </div>
      <div className="p-5 flex-1">
        {children}
      </div>
    </div>
  );

  const Input = (props) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">{props.label}</label>
      <input
        {...props}
        className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Logistics Dashboard</h1>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md border ${
              health === 'UP' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
              {health === 'UP' ? '● LIVE' : '● DOWN'}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">Real-time CI/CD operations interface.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-zinc-800/80 gap-6 hide-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
          { id: 'shipments', label: 'Shipments', icon: Truck },
          { id: 'inventory', label: 'Inventory', icon: Box },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'routes', label: 'Route Optimizer', icon: Map }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 flex items-start gap-4">
              <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20"><Truck className="w-6 h-6 text-blue-400" /></div>
              <div><div className="text-2xl font-bold text-zinc-100">{shipments.length}</div><div className="text-sm font-medium text-zinc-500">Total Shipments</div></div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 flex items-start gap-4">
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"><Box className="w-6 h-6 text-emerald-400" /></div>
              <div><div className="text-2xl font-bold text-zinc-100">{inventory.length}</div><div className="text-sm font-medium text-zinc-500">Inventory Items</div></div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 flex items-start gap-4">
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20"><ShoppingCart className="w-6 h-6 text-amber-400" /></div>
              <div><div className="text-2xl font-bold text-zinc-100">{sessionOrdersCount}</div><div className="text-sm font-medium text-zinc-500">Orders (Session)</div></div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 flex items-start gap-4">
              <div className="bg-violet-500/10 p-3 rounded-xl border border-violet-500/20"><ShieldCheck className="w-6 h-6 text-violet-400" /></div>
              <div><div className="text-2xl font-bold text-zinc-100">CI/CD</div><div className="text-sm font-medium text-zinc-500">Pipeline Active</div></div>
            </div>
          </div>

          <Card title="⚡ Quick Actions" icon={Plus}>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActiveTab('shipments')} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">📦 New Shipment</button>
              <button onClick={() => setActiveTab('inventory')} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">🏭 Add Item</button>
              <button onClick={() => setActiveTab('orders')} className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">🛒 New Order</button>
              <button onClick={() => setActiveTab('routes')} className="bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">🗺️ Optimize Route</button>
            </div>
          </Card>
        </div>
      )}

      {/* CONTENT: SHIPMENTS */}
      {activeTab === 'shipments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Create Shipment" icon={Plus}>
              <form onSubmit={handleCreateShipment}>
                <Input label="Shipment ID" required value={shipmentForm.shipment_id} onChange={e => setShipmentForm({...shipmentForm, shipment_id: e.target.value})} placeholder="e.g. SHP-001" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Origin" required value={shipmentForm.origin} onChange={e => setShipmentForm({...shipmentForm, origin: e.target.value})} placeholder="e.g. Mumbai" />
                  <Input label="Destination" required value={shipmentForm.destination} onChange={e => setShipmentForm({...shipmentForm, destination: e.target.value})} placeholder="e.g. Delhi" />
                </div>
                <Input label="Est. Delivery (YYYY-MM-DD)" value={shipmentForm.estimated_delivery} onChange={e => setShipmentForm({...shipmentForm, estimated_delivery: e.target.value})} type="date" />
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all">Create Shipment</button>
              </form>
              <FormMsg source="createShipment" />
            </Card>

            <Card title="Track Shipment" icon={Search}>
              <form onSubmit={handleTrackShipment} className="flex gap-3">
                <div className="flex-1">
                  <input required value={trackShipmentId} onChange={e => setTrackShipmentId(e.target.value)} placeholder="Enter Shipment ID" className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                </div>
                <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-white font-medium px-6 py-2.5 rounded-xl transition-all">Track</button>
              </form>
              
              {trackShipmentResult && (
                <div className="mt-6">
                  {trackShipmentResult.error ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{trackShipmentResult.error}</div>
                  ) : (
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-xl text-sm">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">ID</span><span className="text-zinc-200 font-medium">{trackShipmentResult.shipment_id}</span></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Status</span><StatusBadge status={trackShipmentResult.status} /></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Origin</span><span className="text-zinc-200">{trackShipmentResult.origin}</span></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Destination</span><span className="text-zinc-200">{trackShipmentResult.destination}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Current Location</span><span className="text-zinc-200">{trackShipmentResult.current_location}</span></div>
                      </div>
                      
                      <div className="mt-5 pt-5 border-t border-zinc-800/80">
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-3">Tracking History</span>
                        <div className="space-y-3">
                          {trackShipmentResult.tracking_history.map((h, i) => (
                            <div key={i} className="flex gap-3 text-xs">
                              <div className="flex flex-col items-center mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-violet-500 ring-4 ring-violet-500/20"></div>
                                {i < trackShipmentResult.tracking_history.length - 1 && <div className="w-px h-full bg-zinc-800 my-1"></div>}
                              </div>
                              <div className="pb-2">
                                <div className="font-medium text-zinc-300">{h.location} <span className="text-zinc-500 font-normal ml-2">— {h.status}</span></div>
                                <div className="text-zinc-600 mt-0.5">{new Date(h.timestamp).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title={`All Shipments (${shipments.length})`} icon={Truck}>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-sm text-zinc-400 min-w-[600px]">
                <thead className="text-zinc-500 uppercase text-[10px] tracking-wider font-semibold border-b border-zinc-800/80">
                  <tr><th className="pb-3">Shipment ID</th><th className="pb-3">Route</th><th className="pb-3">Status</th><th className="pb-3">Location</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {shipments.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-zinc-600">No shipments found.</td></tr>
                  ) : shipments.map((s, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 font-medium text-zinc-300">{s.shipment_id}</td>
                      <td className="py-3"><div className="flex items-center gap-2"><span>{s.origin}</span><ArrowRight className="w-3 h-3 text-zinc-600" /><span>{s.destination}</span></div></td>
                      <td className="py-3"><StatusBadge status={s.status} /></td>
                      <td className="py-3 text-zinc-300">{s.current_location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CONTENT: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Add Inventory Item" icon={Plus}>
              <form onSubmit={handleAddInventory}>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Item ID" required value={inventoryForm.item_id} onChange={e => setInventoryForm({...inventoryForm, item_id: e.target.value})} placeholder="e.g. ITM-001" />
                  <Input label="Quantity" required type="number" min="0" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} placeholder="e.g. 50" />
                </div>
                <Input label="Name" required value={inventoryForm.name} onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} placeholder="e.g. Logistics Server" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Location" value={inventoryForm.location} onChange={e => setInventoryForm({...inventoryForm, location: e.target.value})} placeholder="e.g. Warehouse A" />
                  <Input label="Category" value={inventoryForm.category} onChange={e => setInventoryForm({...inventoryForm, category: e.target.value})} placeholder="e.g. Hardware" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all">Add Inventory</button>
              </form>
              <FormMsg source="addInventory" />
            </Card>

            <Card title="Lookup Item" icon={Search}>
              <form onSubmit={handleLookupInventory} className="flex gap-3">
                <div className="flex-1">
                  <input required value={lookupItemId} onChange={e => setLookupItemId(e.target.value)} placeholder="Enter Item ID" className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-white font-medium px-6 py-2.5 rounded-xl transition-all">Lookup</button>
              </form>
              
              {lookupItemResult && (
                <div className="mt-6">
                  {lookupItemResult.error ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{lookupItemResult.error}</div>
                  ) : (
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-xl text-sm">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">ID</span><span className="text-zinc-200 font-medium">{lookupItemResult.item_id}</span></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Name</span><span className="text-zinc-200">{lookupItemResult.name}</span></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Quantity</span><span className={`font-bold ${lookupItemResult.quantity < 10 ? 'text-red-400' : 'text-emerald-400'}`}>{lookupItemResult.quantity}</span></div>
                        <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Category</span><span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{lookupItemResult.category}</span></div>
                        <div className="col-span-2"><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Location</span><span className="text-zinc-200">{lookupItemResult.location}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title={`All Inventory Items (${inventory.length})`} icon={Box}>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-sm text-zinc-400 min-w-[600px]">
                <thead className="text-zinc-500 uppercase text-[10px] tracking-wider font-semibold border-b border-zinc-800/80">
                  <tr><th className="pb-3">Item ID</th><th className="pb-3">Name</th><th className="pb-3">Category</th><th className="pb-3">Quantity</th><th className="pb-3">Location</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {inventory.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-zinc-600">No inventory items found.</td></tr>
                  ) : inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 font-medium text-zinc-300">{item.item_id}</td>
                      <td className="py-3 text-zinc-300">{item.name}</td>
                      <td className="py-3"><span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700/50 text-xs">{item.category}</span></td>
                      <td className="py-3"><span className={`font-bold ${item.quantity < 10 ? 'text-red-400' : 'text-emerald-400'}`}>{item.quantity}</span></td>
                      <td className="py-3 text-zinc-300">{item.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Create Order" icon={Plus}>
            <form onSubmit={handleCreateOrder}>
              <Input label="Order ID" required value={orderForm.order_id} onChange={e => setOrderForm({...orderForm, order_id: e.target.value})} placeholder="e.g. ORD-001" />
              <Input label="Customer Name" required value={orderForm.customer} onChange={e => setOrderForm({...orderForm, customer: e.target.value})} placeholder="e.g. Acme Corp" />
              <Input label="Items (Comma-separated)" value={orderForm.items} onChange={e => setOrderForm({...orderForm, items: e.target.value})} placeholder="e.g. Laptop, Mouse" />
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all">Create Order</button>
            </form>
            <FormMsg source="createOrder" />
          </Card>

          <Card title="Track Order" icon={Search}>
            <form onSubmit={handleTrackOrder} className="flex gap-3">
              <div className="flex-1">
                <input required value={trackOrderId} onChange={e => setTrackOrderId(e.target.value)} placeholder="Enter Order ID" className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>
              <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-white font-medium px-6 py-2.5 rounded-xl transition-all">Track</button>
            </form>
            
            {trackOrderResult && (
              <div className="mt-6">
                {trackOrderResult.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{trackOrderResult.error}</div>
                ) : (
                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-xl text-sm">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Order ID</span><span className="text-zinc-200 font-medium">{trackOrderResult.order_id}</span></div>
                      <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Status</span><StatusBadge status={trackOrderResult.status} /></div>
                      <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Customer</span><span className="text-zinc-200">{trackOrderResult.customer}</span></div>
                      <div><span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Created At</span><span className="text-zinc-400">{new Date(trackOrderResult.created_at).toLocaleString()}</span></div>
                      <div className="col-span-2">
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">Items</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {trackOrderResult.items.length === 0 ? <span className="text-zinc-600 italic">No items</span> : trackOrderResult.items.map((item, i) => <span key={i} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs">{item}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CONTENT: ROUTE OPTIMIZER */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Route Optimizer" icon={Route}>
            <form onSubmit={handleOptimizeRoute}>
              <Input label="Start Location" required value={routeForm.start} onChange={e => setRouteForm({...routeForm, start: e.target.value})} placeholder="e.g. Mumbai" />
              <Input label="Waypoints (Comma-separated)" value={routeForm.waypoints} onChange={e => setRouteForm({...routeForm, waypoints: e.target.value})} placeholder="e.g. Pune, Nagpur" />
              <Input label="End Location" required value={routeForm.end} onChange={e => setRouteForm({...routeForm, end: e.target.value})} placeholder="e.g. Delhi" />
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all">⚡ Optimize Route</button>
            </form>
          </Card>

          {routeResult && (
            <Card title="Optimization Result" icon={MapPin}>
              {routeResult.loading ? (
                <div className="flex items-center gap-3 text-zinc-400 p-4"><RefreshCw className="w-5 h-5 animate-spin text-violet-400" /> Optimizing path...</div>
              ) : routeResult.error ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{routeResult.error}</div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Path */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-xl flex items-center flex-wrap gap-2 text-sm text-zinc-300 font-medium">
                    {[routeResult.start, ...routeResult.waypoints, routeResult.end].map((loc, i, arr) => (
                      <React.Fragment key={i}>
                        <span className="bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700/50">{loc}</span>
                        {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-violet-400" />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-zinc-100">{routeResult.total_stops}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">Total Stops</div>
                    </div>
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-zinc-100">{routeResult.estimated_time_minutes}<span className="text-sm font-normal text-zinc-500 ml-1">min</span></div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">Est. Time</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Yes</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80 mt-1">Optimized</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// Dummy icon for LayoutDashboard since it wasn't imported from lucide-react in the top imports
const LayoutDashboardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;

export default LogisticsTracker;
