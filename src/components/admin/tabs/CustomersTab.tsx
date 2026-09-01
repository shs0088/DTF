import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  UserCheck,
  Crown,
  Building2,
  X,
  Check,
} from 'lucide-react';
import { CustomerRecord } from '../../../types';

export const CustomersTab: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | 'retail' | 'wholesale' | 'vip'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Amman');
  const [address, setAddress] = useState('');
  const [customerGroup, setCustomerGroup] = useState<'retail' | 'wholesale' | 'vip'>('retail');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openCreate = () => {
    setIsCreating(true);
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setCity('Amman');
    setAddress('');
    setCustomerGroup('retail');
    setStatus('active');
  };

  const openEdit = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setIsCreating(false);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setCity(c.city || 'Amman');
    setAddress(c.address || '');
    setCustomerGroup(c.customerGroup);
    setStatus(c.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        name,
        email,
        phone,
        city,
        address,
        customerGroup,
        status,
      });
    } else {
      const newCust: CustomerRecord = {
        id: `cust_${Date.now()}`,
        name,
        email,
        phone,
        city,
        address,
        customerGroup,
        ordersCount: 0,
        totalSpent: 0,
        dateAdded: new Date().toISOString(),
        status,
      };
      addCustomer(newCust);
    }

    setIsCreating(false);
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (groupFilter !== 'all' && c.customerGroup !== groupFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Customer Directory (OpenCart Structure)</h2>
              <p className="text-[11px] text-blue-300/80">
                Manage retail customers, B2B wholesale accounts, and VIP loyalty groups
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* 2. Add / Edit Customer Form */}
      {(isCreating || editingCustomer) && (
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-900 border border-blue-500/40 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span>{editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}</span>
            </h3>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmad Al-Khalil"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. client@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+962 7 9XXX XXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Amman"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Customer Group</label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="retail">Retail Buyer</option>
                <option value="wholesale">Wholesale / Agency (B2B)</option>
                <option value="vip">VIP Loyalty Club</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Delivery / Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Abdoun, Building 14, 2nd Floor"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingCustomer ? 'Update Customer' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Customer Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, phone or city..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Customers' },
            { id: 'retail', label: 'Retail' },
            { id: 'wholesale', label: 'Wholesale B2B' },
            { id: 'vip', label: 'VIP' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setGroupFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                groupFilter === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Customer Directory List */}
      <div className="space-y-2.5">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-900/30 flex-shrink-0">
                {cust.name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">{cust.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                    cust.customerGroup === 'vip'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      : cust.customerGroup === 'wholesale'
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {cust.customerGroup === 'vip' && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                    {cust.customerGroup === 'wholesale' && <Building2 className="w-2.5 h-2.5 text-purple-400" />}
                    {cust.customerGroup.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1 font-mono">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Mail className="w-3 h-3 text-slate-500" />
                    {cust.email}
                  </span>
                  {cust.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {cust.phone}
                    </span>
                  )}
                  {cust.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {cust.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs font-black text-emerald-400 font-mono">
                  ${(cust.totalSpent || 0).toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {cust.ordersCount || 0} orders
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(cust)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-all"
                  title="Edit Customer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete customer record for "${cust.name}"?`)) {
                      deleteCustomer(cust.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                  title="Delete Customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
