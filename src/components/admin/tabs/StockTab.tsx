import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Package,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Check,
  Filter,
  BarChart2,
  Box,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Product } from '../../../types';

export const StockTab: React.FC = () => {
  const { products, updateProductStock, updateProduct } = useApp();
  const [stockSearch, setStockSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out_of_stock' | 'healthy'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleAdjust = (product: Product, delta: number) => {
    const current = product.stock || 0;
    const next = Math.max(0, current + delta);
    updateProductStock(product.id, next);
    showToast(`Updated "${product.name}" stock to ${next} units`);
  };

  const handleSetStockDirect = (productId: string, valStr: string) => {
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 0) {
      updateProductStock(productId, val);
    }
  };

  const filteredProducts = products.filter((p) => {
    const stock = p.stock || 0;
    const matchesSearch = p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(stockSearch.toLowerCase())) ||
      p.category.toLowerCase().includes(stockSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'low') return stock > 0 && stock <= 15;
    if (filterMode === 'out_of_stock') return stock === 0;
    if (filterMode === 'healthy') return stock > 15;
    return true;
  });

  const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 15).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Inventory Statistics */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Stock & Inventory Command</h2>
              <p className="text-[11px] text-amber-300/80">
                OpenCart-standard real-time inventory control, threshold warnings & rapid batch restocking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[9px] text-slate-400 block uppercase">Total Units</span>
              <span className="text-xs font-black text-white">{totalUnits}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-center">
              <span className="text-[9px] text-amber-400 block uppercase">Low Stock</span>
              <span className="text-xs font-black text-amber-300">{lowStockCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-center">
              <span className="text-[9px] text-rose-400 block uppercase">Out of Stock</span>
              <span className="text-xs font-black text-rose-300">{outOfStockCount}</span>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Search & Stock Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder="Search items by name, category or SKU..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All Items (${products.length})` },
            { id: 'low', label: `Low Stock ≤15 (${lowStockCount})` },
            { id: 'out_of_stock', label: `Out of Stock (${outOfStockCount})` },
            { id: 'healthy', label: `Healthy (>15)` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === f.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Interactive Inventory Matrix Table */}
      <div className="space-y-2.5">
        {filteredProducts.map((product) => {
          const stock = product.stock || 0;
          const isOut = stock === 0;
          const isLow = stock > 0 && stock <= 15;

          return (
            <div
              key={product.id}
              className={`p-3.5 rounded-2xl bg-slate-900/90 border transition-all ${
                isOut
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : isLow
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Product Thumbnail & SKU Info */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0 overflow-hidden">
                    <img
                      src={product.images.primary}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-950/90 text-[8px] text-center font-mono font-bold text-slate-400 py-0.5">
                      {product.type === 'blank' ? 'BLANK' : 'PRINTED'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">{product.name}</h3>
                      {product.nameAr && (
                        <span className="text-[10px] text-slate-400 font-normal">({product.nameAr})</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Category: <span className="text-purple-300">{product.category}</span> • Base Price: <span className="text-emerald-400">${product.basePrice.toFixed(2)}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {product.sizes?.join(', ') || 'Standard Size'}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {product.colors?.length || 1} Colors
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Real-time Stock Controls & Batch Restock Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  {/* Status Badge */}
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isOut
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : isLow
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  {/* Increment / Decrement Stepper */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleAdjust(product, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center active:scale-95 transition-all"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => handleSetStockDirect(product.id, e.target.value)}
                      className="w-14 text-center bg-transparent text-xs font-black font-mono text-white outline-none"
                    />

                    <button
                      onClick={() => handleAdjust(product, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center active:scale-95 transition-all"
                      title="Increase by 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Batch Restock Quick Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjust(product, 10)}
                      className="px-2 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-all"
                      title="Add 10 units"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => handleAdjust(product, 50)}
                      className="px-2 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 text-[10px] font-bold transition-all"
                      title="Add 50 units"
                    >
                      +50
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
