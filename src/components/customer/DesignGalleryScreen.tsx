import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, SlidersHorizontal, Info, Sparkles, Plus, ArrowRight, Eye, X, Check, Share2, Layers, ShieldCheck } from 'lucide-react';
import { DesignCategory, Design } from '../../types';

export const DesignGalleryScreen: React.FC = () => {
  const {
    designs,
    products,
    startCustomizer,
    setSelectedDesignId,
    t,
    isRtl,
    userRole,
    setActiveScreen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory>('all');
  const [previewModalDesign, setPreviewModalDesign] = useState<Design | null>(null);
  const [activePreviewShot, setActivePreviewShot] = useState<number>(0);

  const categories: { id: DesignCategory; label: string }[] = [
    { id: 'all', label: t('all') },
    { id: 'popular', label: t('popular') },
    { id: 'new', label: t('new') },
    { id: 'men', label: t('men') },
    { id: 'women', label: t('women') },
    { id: 'kids', label: t('kids') },
  ];

  const filteredDesigns = designs.filter((design) => {
    const matchesSearch =
      design.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (design.titleAr && design.titleAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      design.designerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      design.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      design.category === selectedCategory ||
      design.tags.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const defaultProduct = products.find(p => p.id === 'prod_tshirt') || products[0];

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* 1. Header with Independent Creators Count & Avatars (Matching Screenshot #2) */}
      <section className="px-4 pt-3 pb-3 border-b border-slate-900 bg-slate-950/60">
        <div className="flex items-center gap-3">
          {/* Overlapping Avatar circles */}
          <div className="flex items-center -space-x-2.5">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"
              alt="Designer 1"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
              alt="Designer 2"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
              alt="Designer 3"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover"
            />
            <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center font-bold text-white text-[10px] glow-blue-sm">
              +9
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-white truncate">
              {t('designsUploadedBy')}
            </h2>
            <p className="text-[11px] text-blue-400 font-medium tracking-wide">
              {t('designersCount')}
            </p>
          </div>
        </div>

        {/* Search Bar & Filter Button */}
        <div className="flex items-center gap-2 mt-3.5">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchDesignsPlaceholder')}
              className={`w-full py-2.5 bg-slate-900/90 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all ${
                isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
              }`}
            />
          </div>

          <button
            onClick={() => {}}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            aria-label="Filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md glow-blue-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. 2-Column Responsive Design Cards Grid (Matching Screenshot #2) */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              onClick={() => {
                setPreviewModalDesign(design);
                setActivePreviewShot(0);
              }}
              className="bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/70 rounded-2xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl group flex flex-col justify-between"
            >
              {/* Designer Avatar & Name Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={design.designerAvatar}
                      alt={design.designerName}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full border border-blue-400/50 object-cover flex-shrink-0"
                    />
                    <span className="text-[11px] font-medium text-slate-300 group-hover:text-blue-400 transition-colors truncate">
                      {design.designerName}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModalDesign(design);
                      setActivePreviewShot(0);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
                    title="Inspect & Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Artwork Graphic Preview */}
                <div className="relative w-full h-44 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
                  <img
                    src={design.imageUrl}
                    alt={design.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-1"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 border border-slate-700 text-[9px] text-cyan-300 font-mono font-bold">
                    300 DPI PNG
                  </span>
                </div>

                {/* Title & Sold Stat */}
                <div className="mt-2">
                  <h3 className="text-xs font-bold text-white truncate">
                    {isRtl ? design.titleAr || design.title : design.title}
                  </h3>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {design.soldCount} {t('sold')}
                    </span>
                    <span className="text-[10px] text-blue-400 font-semibold group-hover:underline flex items-center gap-0.5">
                      <span>{t('customize')}</span>
                      <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State if No Designs Match */}
        {filteredDesigns.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">No designs found matching "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* 3. Blue Info Tip Banner (Matching Screenshot #2) */}
        <div className="mt-5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200 leading-relaxed">
            {t('designerUploadTip')}
          </p>
        </div>
      </section>

      {/* FULL-PAGE / LARGE DESIGN PREVIEW MODAL */}
      {previewModalDesign && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl p-5 max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto no-scrollbar space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src={previewModalDesign.designerAvatar}
                  alt={previewModalDesign.designerName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-cyan-400 object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRtl ? previewModalDesign.titleAr || previewModalDesign.title : previewModalDesign.title}
                  </h3>
                  <p className="text-[10px] text-cyan-300">
                    {isRtl ? 'تصميم بواسطة' : 'By'} {previewModalDesign.designerName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewModalDesign(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Resolution Artwork & Presentation Shots */}
            <div className="space-y-2">
              <div className="relative w-full h-72 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={
                    previewModalDesign.presentationPhotos && previewModalDesign.presentationPhotos[activePreviewShot]
                      ? previewModalDesign.presentationPhotos[activePreviewShot]
                      : previewModalDesign.imageUrl
                  }
                  alt={previewModalDesign.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
                
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1.5 shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>300 DPI Transparent Master</span>
                </div>
              </div>

              {/* Presentation Shots Thumbnails (Min 3 shots) */}
              {previewModalDesign.presentationPhotos && previewModalDesign.presentationPhotos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {previewModalDesign.presentationPhotos.map((shot, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => setActivePreviewShot(sIdx)}
                      className={`relative w-16 h-16 rounded-xl bg-slate-950 border overflow-hidden p-1 flex-shrink-0 transition-all ${
                        activePreviewShot === sIdx ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={shot} alt={`Shot ${sIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Print Specification & Verification Details */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{isRtl ? 'المواصفات الفنية للطباعة:' : 'Print Technical Specs:'}</span>
                <span className="text-emerald-400 font-mono font-bold">DTF Lossless 300 DPI</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 font-mono bg-slate-900/60 p-2 rounded-xl">
                <div>
                  <span className="text-slate-500 block">DPI:</span>
                  <span className="text-white font-bold">{previewModalDesign.resolutionDpi || 300} DPI</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Alpha Transparency:</span>
                  <span className="text-emerald-400 font-bold">100% Isolated</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Print Size (Max):</span>
                  <span className="text-white font-bold">38.0 × 48.0 cm</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Embedded Text Rule:</span>
                  <span className="text-cyan-300 font-bold">Unmodified Physical Art</span>
                </div>
              </div>
            </div>

            {/* Tags & Categories */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {previewModalDesign.tags.map((tag, tIdx) => (
                <span key={tIdx} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>

            {/* CTA Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewModalDesign(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>

              <button
                onClick={() => {
                  setSelectedDesignId(previewModalDesign.id);
                  startCustomizer(defaultProduct, previewModalDesign);
                  setPreviewModalDesign(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg glow-blue transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isRtl ? 'طباعة وتخصيص هذا التصميم على منتج' : 'Customize & Print on Blank Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
