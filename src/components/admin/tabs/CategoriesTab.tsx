import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { CategoryItem } from '../../../types';

export const CategoriesTab: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [sortOrder, setSortOrder] = useState(1);

  const openCreate = () => {
    setIsCreating(true);
    setEditingCategory(null);
    setName('');
    setNameAr('');
    setSlug('');
    setDescription('');
    setStatus('enabled');
    setSortOrder(categories.length + 1);
  };

  const openEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setIsCreating(false);
    setName(cat.name);
    setNameAr(cat.nameAr || '');
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setStatus(cat.status);
    setSortOrder(cat.sortOrder || 1);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedSlug = slug.trim() ? slug.trim().toLowerCase().replace(/\s+/g, '_') : name.toLowerCase().replace(/\s+/g, '_');

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name,
        nameAr,
        slug: generatedSlug,
        description,
        status,
        sortOrder,
      });
    } else {
      const newCat: CategoryItem = {
        id: `cat_${Date.now()}`,
        name,
        nameAr,
        slug: generatedSlug,
        description,
        status,
        sortOrder,
      };
      addCategory(newCat);
    }

    setIsCreating(false);
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.nameAr && c.nameAr.toLowerCase().includes(search.toLowerCase())) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Categories Management (OpenCart Structure)</h2>
              <p className="text-[11px] text-indigo-300/80">
                Organize your blanks, apparel, and DTF printed merchandise into catalog hierarchies
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* 2. Add / Edit Modal Form */}
      {(isCreating || editingCategory) && (
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}</span>
            </h3>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCategory(null); }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Category Name (English) *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Heavyweight Hoodies"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Category Name (Arabic)</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: هوديز وسويت شيرتات"
                dir="rtl"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">SEO URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. hoodies_sweatshirts"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of products in this category..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setEditingCategory(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Category Search & Table List */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name or slug..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono text-xs font-black flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
                {cat.sortOrder || 1}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">{cat.name}</h3>
                  {cat.nameAr && <span className="text-[10px] text-slate-400">({cat.nameAr})</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                  <span className="text-purple-300">slug: {cat.slug}</span>
                  {cat.description && <span>• {cat.description}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                cat.status === 'enabled'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
              }`}>
                {cat.status === 'enabled' ? 'Enabled' : 'Disabled'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-all"
                  title="Edit Category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete category "${cat.name}"?`)) {
                      deleteCategory(cat.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                  title="Delete Category"
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
