import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Sparkles,
  Layers,
  DollarSign,
  Palette,
  Image as ImageIcon,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Product } from '../../../types';

export const ProductsTab: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'blank' | 'printed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal active subtab
  const [modalSubtab, setModalSubtab] = useState<'general' | 'data' | 'options' | 'images'>('general');

  // Form states
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [category, setCategory] = useState('t_shirts');
  const [type, setType] = useState<'blank' | 'printed'>('blank');
  const [basePrice, setBasePrice] = useState(15.99);
  const [stock, setStock] = useState(50);
  const [material, setMaterial] = useState('100% Combed Cotton');
  const [primaryImage, setPrimaryImage] = useState('');
  const [sizesInput, setSizesInput] = useState('S, M, L, XL, 2XL');
  const [colorsInput, setColorsInput] = useState('#111827:Black, #FFFFFF:White, #1E3A8A:Navy');

  const openCreate = () => {
    setIsCreating(true);
    setEditingProduct(null);
    setModalSubtab('general');
    setName('');
    setNameAr('');
    setDescription('');
    setDescriptionAr('');
    setCategory(categories[0]?.slug || 't_shirts');
    setType('blank');
    setBasePrice(15.99);
    setStock(50);
    setMaterial('100% Combed Ring-Spun Cotton');
    setPrimaryImage('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80');
    setSizesInput('S, M, L, XL, 2XL');
    setColorsInput('#111827:Black, #FFFFFF:White, #1E3A8A:Navy');
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setIsCreating(false);
    setModalSubtab('general');
    setName(p.name);
    setNameAr(p.nameAr || '');
    setDescription(p.description || '');
    setDescriptionAr(p.descriptionAr || '');
    setCategory(p.category);
    setType(p.type);
    setBasePrice(p.basePrice);
    setStock(p.stock || 0);
    setMaterial(p.material || '100% Cotton');
    setPrimaryImage(p.images?.primary || '');
    setSizesInput(p.sizes ? p.sizes.join(', ') : 'S, M, L, XL');
    setColorsInput(
      p.colors
        ? p.colors.map(c => `${c.hex}:${c.name}`).join(', ')
        : '#111827:Black, #FFFFFF:White'
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSizes = sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    const parsedColors = colorsInput.split(',').map(c => {
      const parts = c.trim().split(':');
      return {
        hex: parts[0] || '#000000',
        name: parts[1] || 'Color',
      };
    });

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name,
      nameAr,
      description,
      descriptionAr,
      category: category as any,
      type,
      basePrice: Number(basePrice),
      stock: Number(stock),
      material,
      sizes: parsedSizes,
      colors: parsedColors,
      images: {
        primary: primaryImage || (editingProduct?.images?.primary ?? ''),
        angles: editingProduct?.images?.angles || { front: primaryImage, back: primaryImage },
      },
      printableArea: editingProduct?.printableArea || {
        front: { x: 25, y: 25, width: 50, height: 50, maxPrintCm: { width: 30, height: 35 } },
        back: { x: 25, y: 25, width: 50, height: 50, maxPrintCm: { width: 30, height: 35 } },
      },
    };

    if (editingProduct) {
      updateProduct(productPayload);
    } else {
      addProduct(productPayload);
    }

    setIsCreating(false);
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(search.toLowerCase())) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Product Catalog & Merchandising (OpenCart Standard)</h2>
              <p className="text-[11px] text-purple-300/80">
                Manage blank apparel garments, DTF print specifications, variants, pricing, and stock levels
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 2. Full OpenCart-Style Add / Edit Product Modal */}
      {(isCreating || editingProduct) && (
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-4 shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}</span>
              </h3>
              <p className="text-[10px] text-slate-400">Fill in product information across OpenCart catalog attributes</p>
            </div>

            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingProduct(null); }}
              className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Subtabs (General, Data & Price, Variants, Images) */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            {[
              { id: 'general', label: 'General Info' },
              { id: 'data', label: 'Data & Price' },
              { id: 'options', label: 'Sizes & Colors' },
              { id: 'images', label: 'Media & Images' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalSubtab(tab.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  modalSubtab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subtab Content: General */}
          {modalSubtab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Product Title (English) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Heavyweight Cotton Hoodie"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Product Title (Arabic)</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: هودي قطني فاخر 380 غرام"
                  dir="rtl"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Description (English)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Detailed material and DTF compatibility notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Subtab Content: Data & Price */}
          {modalSubtab === 'data' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Product Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                >
                  <option value="blank">Blank Customizable Garment</option>
                  <option value="printed">Pre-Printed Merchandise</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Base Price ($) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Initial Stock Units *</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Fabric & Material Composition</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 100% Combed Cotton, 220 GSM"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Subtab Content: Options */}
          {modalSubtab === 'options' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Available Sizes (Comma separated)</label>
                <input
                  type="text"
                  value={sizesInput}
                  onChange={(e) => setSizesInput(e.target.value)}
                  placeholder="S, M, L, XL, 2XL"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Color Palette (HEX:Name, comma separated)</label>
                <input
                  type="text"
                  value={colorsInput}
                  onChange={(e) => setColorsInput(e.target.value)}
                  placeholder="#111827:Black, #FFFFFF:White, #1E3A8A:Navy"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
          )}

          {/* Subtab Content: Images */}
          {modalSubtab === 'images' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Primary Product Mockup Image URL</label>
                <input
                  type="text"
                  value={primaryImage}
                  onChange={(e) => setPrimaryImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                />
              </div>

              {primaryImage && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <img
                    src={primaryImage}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover bg-slate-900 border border-slate-800"
                  />
                  <div className="text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold">Image loaded</span>
                    <p className="text-[10px] text-slate-500">Live preview in customer catalog & customizer</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingProduct(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingProduct ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title, category, or fabric..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat.slug
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Products Table / Card Grid */}
      <div className="space-y-2.5">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <img
                src={p.images.primary}
                alt={p.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 flex-shrink-0"
              />

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">{p.name}</h3>
                  {p.nameAr && <span className="text-[10px] text-slate-400">({p.nameAr})</span>}
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono font-bold border border-purple-500/30 uppercase">
                    {p.type}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-mono mt-1">
                  <span className="text-emerald-400 font-black">${p.basePrice.toFixed(2)}</span>
                  <span>•</span>
                  <span>Stock: {p.stock || 0} units</span>
                  <span>•</span>
                  <span>Category: {p.category}</span>
                  {p.material && (
                    <>
                      <span>•</span>
                      <span className="text-slate-300">{p.material}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-all"
                  title="Edit Product"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete product "${p.name}"?`)) {
                      deleteProduct(p.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                  title="Delete Product"
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
