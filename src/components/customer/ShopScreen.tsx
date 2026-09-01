import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Star, Edit3, ArrowRight, Filter } from 'lucide-react';
import { MockupRenderer } from '../mockups/MockupRenderer';

export const ShopScreen: React.FC = () => {
  const { products, designs, setSelectedProductId, setActiveScreen, startCustomizer, formatCurrency, t, isRtl } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'blank' | 'ready_to_sell'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: t('all') },
    { id: 't_shirts', label: t('tshirts') },
    { id: 'mugs', label: t('mugs') },
    { id: 'caps', label: t('caps') },
    { id: 'hoodies', label: t('hoodies') },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesType = productTypeFilter === 'all' || product.type === productTypeFilter;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.nameAr && product.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* Search and Category Filter Header */}
      <section className="px-4 pt-3 pb-3 bg-slate-950/70 border-b border-slate-900">
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchShopPlaceholder')}
            className={`w-full py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none ${
              isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
            }`}
          />
        </div>

        {/* Product Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md glow-blue-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Blank vs Ready-to-Sell Subtabs */}
        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={() => setProductTypeFilter('all')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
              productTypeFilter === 'all' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t('allItems')} ({products.length})
          </button>
          <button
            onClick={() => setProductTypeFilter('blank')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
              productTypeFilter === 'blank' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t('plainBlankApparel')}
          </button>
          <button
            onClick={() => setProductTypeFilter('ready_to_sell')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
              productTypeFilter === 'ready_to_sell' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t('readyToSellFeatured')}
          </button>
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const previewDesign = product.defaultDesignId
              ? designs.find(d => d.id === product.defaultDesignId)
              : designs[0];

            return (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProductId(product.id);
                  setActiveScreen('product_detail');
                }}
                className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-2.5 cursor-pointer flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-xl group"
              >
                <div className="relative w-full h-36 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
                  <MockupRenderer
                    productType={product.category}
                    colorHex={product.colors[0]?.hex || '#0B0F17'}
                    location="front"
                    designUrl={product.type === 'ready_to_sell' ? previewDesign?.imageUrl : undefined}
                    designScale={0.75}
                    className="w-full h-full"
                  />
                  {product.type === 'blank' ? (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 text-[9px] font-bold border border-slate-700">
                      {t('blankCanvas')}
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 text-[9px] font-bold border border-cyan-500/40">
                      {isRtl ? 'منتج جاهز للبيع' : 'Ready to Sell'}
                    </span>
                  )}

                  {product.stock === 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-black border border-rose-500 shadow-md">
                      {isRtl ? 'غير متوفر حالياً' : 'Out of Stock'}
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <h3 className="text-xs font-bold text-white truncate">
                    {isRtl ? product.nameAr || product.name : product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-blue-400">
                      {formatCurrency(product.basePrice)}
                    </span>
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{product.rating}</span>
                    </div>
                  </div>

                  {/* Direct Customize or View CTA */}
                  {product.stock === 0 ? (
                    <div className="w-full mt-2 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-[10px] text-center">
                      {isRtl ? 'غير متوفر حالياً' : 'Out of Stock'}
                    </div>
                  ) : product.type === 'ready_to_sell' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductId(product.id);
                        setActiveScreen('product_detail');
                      }}
                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-cyan-900/60 hover:bg-cyan-600 text-cyan-200 hover:text-white font-semibold text-[10px] flex items-center justify-center gap-1 transition-all"
                    >
                      <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                      <span>{isRtl ? 'طلب المنتج الجاهز' : 'Buy Ready Product'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCustomizer(product, previewDesign);
                      }}
                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-300 font-semibold text-[10px] flex items-center justify-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{t('customize')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
