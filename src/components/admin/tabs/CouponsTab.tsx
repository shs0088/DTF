import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Percent,
  DollarSign,
  Calendar,
  Gift,
  Search,
} from 'lucide-react';
import { CouponCode } from '../../../types';

export const CouponsTab: React.FC = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useApp();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [discount, setDiscount] = useState(10);
  const [minSpend, setMinSpend] = useState(20);
  const [maxUses, setMaxUses] = useState(100);
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');

  const openCreate = () => {
    setIsCreating(true);
    setEditingCoupon(null);
    setCode('');
    setType('percentage');
    setDiscount(10);
    setMinSpend(20);
    setMaxUses(100);
    setExpiryDate('2026-12-31');
    setStatus('enabled');
  };

  const openEdit = (c: CouponCode) => {
    setEditingCoupon(c);
    setIsCreating(false);
    setCode(c.code);
    setType(c.type);
    setDiscount(c.discount);
    setMinSpend(c.minSpend || 0);
    setMaxUses(c.maxUses || 100);
    setExpiryDate(c.expiryDate || '2026-12-31');
    setStatus(c.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    if (editingCoupon) {
      updateCoupon({
        ...editingCoupon,
        code: code.trim().toUpperCase(),
        type,
        discount,
        minSpend,
        maxUses,
        expiryDate,
        status,
      });
    } else {
      const newCpn: CouponCode = {
        id: `cpn_${Date.now()}`,
        code: code.trim().toUpperCase(),
        type,
        discount,
        minSpend,
        maxUses,
        usedCount: 0,
        expiryDate,
        status,
      };
      addCoupon(newCpn);
    }

    setIsCreating(false);
    setEditingCoupon(null);
  };

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/40 via-slate-900 to-slate-950 border border-pink-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Coupons & Marketing Discounts</h2>
              <p className="text-[11px] text-pink-300/80">
                Create promotional discount vouchers, campaign codes, and minimum order requirements
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* 2. Add / Edit Coupon Form */}
      {(isCreating || editingCoupon) && (
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-900 border border-pink-500/40 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-pink-400" />
              <span>{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Discount Voucher'}</span>
            </h3>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCoupon(null); }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FLASH20"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white font-mono uppercase outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Discount Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">
                Discount Value ({type === 'percentage' ? '%' : '$'}) *
              </label>
              <input
                type="number"
                required
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Minimum Order Spend ($)</label>
              <input
                type="number"
                value={minSpend}
                onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Max Usages Limit</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCoupon(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingCoupon ? 'Update Coupon' : 'Save Coupon'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Search & Coupons List */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupons by code..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-pink-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredCoupons.map((cpn) => (
          <div
            key={cpn.id}
            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-pink-900/30 flex-shrink-0">
                <Tag className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 tracking-wider">
                    {cpn.code}
                  </span>
                  <span className="text-xs font-bold text-pink-400">
                    {cpn.type === 'percentage' ? `${cpn.discount}% OFF` : `$${cpn.discount} OFF`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Min Spend: ${cpn.minSpend || 0}</span>
                  <span>•</span>
                  <span>Used: {cpn.usedCount || 0} / {cpn.maxUses || '∞'}</span>
                  {cpn.expiryDate && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Expires: {cpn.expiryDate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                cpn.status === 'enabled'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
              }`}>
                {cpn.status === 'enabled' ? 'Active' : 'Disabled'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(cpn)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white transition-all"
                  title="Edit Coupon"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete coupon "${cpn.code}"?`)) {
                      deleteCoupon(cpn.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                  title="Delete Coupon"
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
