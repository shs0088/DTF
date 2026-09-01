import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  LayoutDashboard,
  Package,
  AlertTriangle,
  ShoppingCart,
  Layers,
  Users,
  Tag,
  Printer,
  Sparkles,
  Languages,
  Settings,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

// Modular Subtabs
import { OverviewTab } from './tabs/OverviewTab';
import { ProductsTab } from './tabs/ProductsTab';
import { StockTab } from './tabs/StockTab';
import { OrdersTab } from './tabs/OrdersTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { CustomersTab } from './tabs/CustomersTab';
import { CouponsTab } from './tabs/CouponsTab';
import { ProductionTab } from './tabs/ProductionTab';
import { DesignersTab } from './tabs/DesignersTab';
import { CmsTab } from './tabs/CmsTab';
import { SettingsTab } from './tabs/SettingsTab';

export type AdminTabType =
  | 'overview'
  | 'products'
  | 'stock'
  | 'orders'
  | 'categories'
  | 'customers'
  | 'coupons'
  | 'production'
  | 'designers'
  | 'cms'
  | 'settings';

export const AdminDashboardScreen: React.FC = () => {
  const {
    orders,
    products,
    categories,
    customers,
    coupons,
    designs,
    userRole,
    setUserRole,
    setActiveScreen,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');

  // Strict RBAC Guard: Designer / Customer must not view Owner Dashboard
  if (userRole !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-[#05070B] pb-24">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <ShieldCheck className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-base font-black text-white mb-1.5">
          {isRtl ? 'الوصول محظور — منطقة مخصصة للإدارة فقط' : 'Access Restricted — Owner Only'}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {isRtl
            ? 'حساب المصمم أو العميل لا يملك صلاحية الوصول إلى مركز التحكم المالي وإدارة المتجر. يرجى التبديل لدور المالك أو العودة لبوابة المصمم.'
            : 'Designer and Customer accounts do not have permission to view store financial controls and operations. Switch to Owner role or return to your designated portal.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
          <button
            onClick={() => {
              setUserRole('admin');
            }}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            {isRtl ? 'التبديل لحساب المالك (Owner)' : 'Switch to Owner Role'}
          </button>
          <button
            onClick={() => {
              if (userRole === 'designer') setActiveScreen('designer_dashboard');
              else setActiveScreen('home');
            }}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all"
          >
            {userRole === 'designer' ? (isRtl ? 'العودة لبوابة المصمم' : 'Return to Designer Portal') : (isRtl ? 'العودة للمتجر' : 'Return to Store')}
          </button>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'payment_pending');
  const lowStockCount = products.filter(p => (p.stock || 0) <= 15).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.totalAmount ?? o.total ?? 0) : 0), 0);

  const navTabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'products' as const, label: 'Products', icon: Package, count: products.length },
    { id: 'stock' as const, label: 'Stock Area', icon: AlertTriangle, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined, badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingCart, count: orders.length, badge: pendingOrders.length > 0 ? `${pendingOrders.length} new` : undefined, badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
    { id: 'categories' as const, label: 'Categories', icon: Layers, count: categories.length },
    { id: 'customers' as const, label: 'Customers', icon: Users, count: customers.length },
    { id: 'coupons' as const, label: 'Coupons', icon: Tag, count: coupons.length },
    { id: 'production' as const, label: 'DTF Queue', icon: Printer },
    { id: 'designers' as const, label: 'Designers', icon: Sparkles, count: designs.length },
    { id: 'cms' as const, label: 'CMS & Texts', icon: Languages },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* 1. OpenCart Top Header & Store Status */}
      <section className="px-4 pt-4 pb-3 bg-slate-950 border-b border-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">OpenCart-Standard E-Commerce Admin</h1>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Live Production
                </span>
              </div>
              <p className="text-[10px] text-purple-400 font-mono">
                DTF Studio Command Center • Complete Catalog & Operations Suite
              </p>
            </div>
          </div>

          {/* Quick Metrics Header Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold text-white">{orders.length} Orders</span>
            </div>
          </div>
        </div>

        {/* 2. OpenCart Main Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 border-t border-slate-900 pt-2.5 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                ) : tab.count !== undefined ? (
                  <span className="text-[10px] opacity-70 font-mono">
                    ({tab.count})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Render Active Tab Module */}
      <section className="px-4 py-4 max-w-7xl mx-auto">
        {activeTab === 'overview' && <OverviewTab onNavigateTab={(tab) => setActiveTab(tab)} />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'stock' && <StockTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'coupons' && <CouponsTab />}
        {activeTab === 'production' && <ProductionTab />}
        {activeTab === 'designers' && <DesignersTab />}
        {activeTab === 'cms' && <CmsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </section>
    </div>
  );
};
