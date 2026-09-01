import React from 'react';
import { useApp } from '../../../context/AppContext';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Printer,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Layers,
  Palette,
} from 'lucide-react';

interface OverviewTabProps {
  onNavigateTab: (tab: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigateTab }) => {
  const { orders, products, customers, designs, designerProfile, t } = useApp();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.totalAmount ?? o.total ?? 0) : 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'payment_pending');
  const inProduction = orders.filter(o => o.status === 'under_preparation' || o.status === 'payment_confirmed');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const lowStockProducts = products.filter(p => (p.stock || 0) < 15);
  const totalStockItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  // Sparkline data calculation for realistic graph
  const salesHistory = [
    { day: 'Sat', amount: 145 },
    { day: 'Sun', amount: 210 },
    { day: 'Mon', amount: 180 },
    { day: 'Tue', amount: 320 },
    { day: 'Wed', amount: 290 },
    { day: 'Thu', amount: 410 },
    { day: 'Fri', amount: 480 },
  ];
  const maxDaySale = Math.max(...salesHistory.map(s => s.amount));

  return (
    <div className="space-y-4">
      {/* 1. OpenCart-Style Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Total Sales</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">${totalRevenue.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+18.4% this month</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Total Orders</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{orders.length}</div>
            <div className="flex items-center gap-1 text-[10px] text-purple-300 font-semibold mt-0.5">
              <span>{pendingOrders.length} pending • {completedOrders.length} done</span>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Customers</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{customers.length}</div>
            <div className="text-[10px] text-blue-300 font-semibold mt-0.5">
              Active Buyers & B2B
            </div>
          </div>
        </div>

        {/* Stock & RIP Status */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Inventory Units</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-mono">{totalStockItems}</div>
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold mt-0.5">
              {lowStockProducts.length > 0 ? (
                <span className="text-rose-400 font-bold">{lowStockProducts.length} low-stock alerts</span>
              ) : (
                <span>All items stocked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sales Analytics Chart & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Sales Chart Widget */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Sales & Revenue Analytics</span>
              </h3>
              <p className="text-[10px] text-slate-400">Weekly revenue flow & DTF order volume</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono font-bold">
              7-Day Performance
            </span>
          </div>

          {/* Dynamic SVG Bar Chart */}
          <div className="pt-3">
            <div className="flex items-end justify-between gap-2 h-28 border-b border-slate-800 pb-2">
              {salesHistory.map((item, idx) => {
                const heightPercent = Math.max(15, Math.round((item.amount / maxDaySale) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ${item.amount}
                    </span>
                    <div className="w-full bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-20">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-lg group-hover:from-purple-500 group-hover:to-indigo-400 transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Hub Shortcuts */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Quick Action Hub</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Jump directly to store operations</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('products')}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Add / Edit Products</div>
                  <div className="text-[9px] text-slate-400">{products.length} products in catalog</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigateTab('stock')}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Stock & Inventory Area</div>
                  <div className="text-[9px] text-amber-400">{lowStockProducts.length} low stock warnings</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigateTab('production')}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Printer className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">DTF RIP Print Queue</div>
                  <div className="text-[9px] text-blue-300">{inProduction.length} orders awaiting press</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Recent 5 Orders & Stock Warning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Orders List */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              <span>Latest Customer Orders</span>
            </h3>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">{order.orderNumber}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      order.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : order.status === 'payment_pending'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-950 text-blue-300 border border-blue-500/30'
                    }`}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {order.customerInfo?.name || 'Customer'} • {order.items?.length || 1} item(s)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-purple-400 font-mono">
                    ${(order.totalAmount ?? order.total ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts & Inventory Health */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Inventory & Low Stock Alerts</span>
            </h3>
            <button
              onClick={() => onNavigateTab('stock')}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
            >
              <span>Restock Manager</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {products.slice(0, 4).map((p) => {
              const isLow = (p.stock || 0) < 20;
              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.images.primary}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover bg-slate-900 border border-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">${p.basePrice.toFixed(2)} • {p.category}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-black font-mono ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {p.stock || 0} in stock
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                      isLow ? 'bg-amber-950/60 text-amber-300' : 'bg-emerald-950/60 text-emerald-300'
                    }`}>
                      {isLow ? 'Low Stock' : 'Good Level'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
