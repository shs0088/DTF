import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Edit3, ChevronRight, ChevronLeft, Star, Heart, Shirt, Image as ImageIcon, Crop, Truck, Wifi, Signal } from 'lucide-react';
import { MockupRenderer } from '../mockups/MockupRenderer';

export const HomeScreen: React.FC = () => {
  const {
    products,
    designs,
    setSelectedProductId,
    setSelectedDesignId,
    setActiveScreen,
    startCustomizer,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const designerScrollRef = useRef<HTMLDivElement>(null);

  const scrollDesigners = (direction: 'left' | 'right') => {
    if (designerScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      designerScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const featuredTShirt = products.find(p => p.id === 'prod_tshirt') || products[0];
  const featuredMug = products.find(p => p.id === 'prod_mug') || products[1];
  const featuredCap = products.find(p => p.id === 'prod_cap') || products[2];

  const astronautDesign = designs.find(d => d.id === 'design_astronaut') || designs[0];

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* 1. HERO SECTION (100% Matching Screenshot) */}
      <section className="relative px-4 pt-3 pb-5 overflow-hidden bg-gradient-to-b from-[#05070B] via-[#070D1B] to-[#05070B]">
        {/* Glowing cosmic nebula backdrop effect */}
        <div className="absolute top-4 right-0 w-72 h-72 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-6 w-44 h-44 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          {/* Top Hero Layout: Left text/buttons and Right 3D Mockups */}
          <div className="grid grid-cols-12 gap-2 items-center min-h-[220px]">
            {/* Left Column: Heading & CTA Buttons */}
            <div className="col-span-6 z-20 flex flex-col justify-center py-1">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1 font-mono">
                {t('premiumDtfPrinting')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-[1.1]">
                {t('bringImaginationToLife')}{' '}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-[0_0_12px_rgba(0,102,255,0.6)]">
                  {t('toLife')}
                </span>
              </h1>

              {/* Action Buttons stacked neatly under headline */}
              <div className="flex flex-col gap-2 mt-4 pr-1">
                <button
                  onClick={() => setActiveScreen('shop')}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('shopProducts')}</span>
                </button>

                <button
                  onClick={() => {
                    startCustomizer(featuredTShirt, astronautDesign);
                  }}
                  className="w-full py-2.5 px-3 bg-[#0B0F19]/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-400 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 backdrop-blur-sm"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('printYourDream')}</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Product Mockup Composition (T-shirt, Mug, Cap) */}
            <div className="col-span-6 relative h-64 flex items-center justify-center">
              {/* Back: Dominant T-Shirt with Astronaut Print */}
              <div className="absolute -top-1 -right-4 w-44 h-52 z-10 transition-transform duration-300 hover:scale-105">
                <MockupRenderer
                  productType="t_shirts"
                  colorHex="#0B0F17"
                  location="front"
                  designUrl={astronautDesign.imageUrl}
                  designScale={0.95}
                  positionY={-5}
                  className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,102,255,0.25)]"
                />
              </div>

              {/* Front-Left: Photo Mug with Astronaut Print */}
              <div className="absolute left-0 bottom-1 z-20 w-24 h-24 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <MockupRenderer
                  productType="mugs"
                  colorHex="#0F172A"
                  location="front"
                  designUrl={astronautDesign.imageUrl}
                  designScale={0.8}
                  className="w-full h-full drop-shadow-xl"
                />
              </div>

              {/* Front-Right: Snapback Cap with Astronaut Print */}
              <div className="absolute right-0 bottom-0 z-20 w-28 h-24 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <MockupRenderer
                  productType="caps"
                  colorHex="#0B0F17"
                  location="front"
                  designUrl={astronautDesign.imageUrl}
                  designScale={0.7}
                  className="w-full h-full drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FRESH FROM OUR DESIGNERS SECTION */}
      <section className="px-4 py-4 border-t border-slate-900/80">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-wide">
            {t('freshFromDesigners')}
          </h2>
          <button
            onClick={() => setActiveScreen('designs')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5"
          >
            <span>{t('meetOurDesigners')}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Horizontal Designer Carousel with Arrows */}
        <div className="relative group">
          <div
            ref={designerScrollRef}
            className="flex gap-3 overflow-x-auto no-scrollbar pb-1 scroll-smooth"
          >
            {designs.map((design) => (
              <div
                key={design.id}
                onClick={() => {
                  setSelectedDesignId(design.id);
                  startCustomizer(featuredTShirt, design);
                }}
                className="flex-shrink-0 w-40 bg-[#0B0F19] border border-slate-800/80 hover:border-blue-500/60 rounded-2xl p-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl group/card"
              >
                {/* Artwork Thumbnail Image */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={design.imageUrl}
                    alt={design.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                {/* Designer Info Footer */}
                <div className="mt-2 flex items-center gap-1.5">
                  <img
                    src={design.designerAvatar}
                    alt={design.designerName}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full border border-blue-500/60 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 truncate">
                      {t('uploadedBy')}{' '}
                      <span className="text-slate-200 font-medium">{design.designerName}</span>
                    </p>
                  </div>
                </div>

                {/* Title & Sold badge */}
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-white truncate">
                    {isRtl ? design.titleAr || design.title : design.title}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{design.soldCount} {t('sold')}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Left / Right Carousel Controls */}
          <button
            onClick={() => scrollDesigners('left')}
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 border border-slate-700/80 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all opacity-80 hover:opacity-100 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scrollDesigners('right')}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 border border-slate-700/80 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all opacity-80 hover:opacity-100 z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS SECTION */}
      <section className="px-4 py-4 border-t border-slate-900/80">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-wide">
            {t('featuredProducts')}
          </h2>
          <button
            onClick={() => setActiveScreen('shop')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 3-Column Grid of Featured Products */}
        <div className="grid grid-cols-3 gap-2">
          {[featuredTShirt, featuredMug, featuredCap].map((product) => (
            <div
              key={product.id}
              onClick={() => {
                setSelectedProductId(product.id);
                setActiveScreen('product_detail');
              }}
              className="bg-[#0B0F19] border border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
            >
              <div className="relative w-full h-28 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
                <MockupRenderer
                  productType={product.category}
                  colorHex={product.colors[0]?.hex || '#0B0F17'}
                  location="front"
                  designUrl={
                    product.defaultDesignId
                      ? designs.find(d => d.id === product.defaultDesignId)?.imageUrl
                      : astronautDesign.imageUrl
                  }
                  designScale={0.7}
                  className="w-full h-full"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors"
                >
                  <Heart className="w-3 h-3" />
                </button>
              </div>

              <div className="mt-1.5">
                <h3 className="text-[11px] font-semibold text-white truncate">
                  {isRtl ? product.nameAr || product.name : product.name}
                </h3>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] font-bold text-white">
                    {formatCurrency(product.basePrice)}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] text-amber-400 font-medium">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Quick Selector Pills matching screenshot */}
        <div className="grid grid-cols-4 gap-1.5 mt-3">
          <div
            onClick={() => setActiveScreen('shop')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800/90 hover:border-blue-500/50 cursor-pointer transition-all"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-900 flex items-center justify-center text-xs">
              👕
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-200 truncate">{t('tshirts')}</p>
              <p className="text-[8px] text-slate-400 truncate">{t('fromPrice')} {formatCurrency(9.99)}</p>
            </div>
          </div>

          <div
            onClick={() => setActiveScreen('shop')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800/90 hover:border-blue-500/50 cursor-pointer transition-all"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-900 flex items-center justify-center text-xs">
              ☕
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-200 truncate">{t('mugs')}</p>
              <p className="text-[8px] text-slate-400 truncate">{t('fromPrice')} {formatCurrency(7.99)}</p>
            </div>
          </div>

          <div
            onClick={() => setActiveScreen('shop')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800/90 hover:border-blue-500/50 cursor-pointer transition-all"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-900 flex items-center justify-center text-xs">
              🧢
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-200 truncate">{t('caps')}</p>
              <p className="text-[8px] text-slate-400 truncate">{t('fromPrice')} {formatCurrency(8.99)}</p>
            </div>
          </div>

          <div
            onClick={() => setActiveScreen('shop')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800/90 hover:border-blue-500/50 cursor-pointer transition-all"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-900 flex items-center justify-center text-xs">
              🧥
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-200 truncate">{t('hoodies')}</p>
              <p className="text-[8px] text-slate-400 truncate">{t('fromPrice')} {formatCurrency(17.99)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION (Matching Screenshot) */}
      <section className="px-4 py-4 border-t border-slate-900/80 bg-[#05070B]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white tracking-wide">
            {t('howItWorks')}
          </h2>
          <button
            onClick={() => setActiveScreen('designs')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-start justify-between gap-1 relative">
          {/* Step 1 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="relative w-12 h-12 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                1
              </span>
              <Shirt className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-[10px] font-medium text-slate-200 mt-1.5 leading-tight">
              {t('step1Title')}
            </p>
          </div>

          {/* Dotted separator */}
          <div className="text-slate-600 font-bold text-xs pt-4 select-none">···</div>

          {/* Step 2 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="relative w-12 h-12 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                2
              </span>
              <ImageIcon className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-[10px] font-medium text-slate-200 mt-1.5 leading-tight">
              {t('step2Title')}
            </p>
          </div>

          {/* Dotted separator */}
          <div className="text-slate-600 font-bold text-xs pt-4 select-none">···</div>

          {/* Step 3 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="relative w-12 h-12 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                3
              </span>
              <Crop className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-[10px] font-medium text-slate-200 mt-1.5 leading-tight">
              {t('step3Title')}
            </p>
          </div>

          {/* Dotted separator */}
          <div className="text-slate-600 font-bold text-xs pt-4 select-none">···</div>

          {/* Step 4 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="relative w-12 h-12 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                4
              </span>
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-[10px] font-medium text-slate-200 mt-1.5 leading-tight">
              {t('step4Title')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

