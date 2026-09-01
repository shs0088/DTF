import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Heart, Share2, Star, Check, ShoppingCart, Edit3 } from 'lucide-react';
import { MockupRenderer } from '../mockups/MockupRenderer';

export const ProductDetailScreen: React.FC = () => {
  const {
    products,
    designs,
    selectedProductId,
    setActiveScreen,
    startCustomizer,
    addToCart,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const product = products.find(p => p.id === selectedProductId) || products[0];
  const defaultDesign = designs.find(d => d.id === product.defaultDesignId) || designs[0];

  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || 'Black');
  const [selectedColorHex, setSelectedColorHex] = useState(product.colors[0]?.hex || '#0B0F17');
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[1] || product.sizes[0] : 'M');
  const [selectedView, setSelectedView] = useState<'front' | 'model' | 'back'>('front');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images.primary,
      productType: product.type,
      selectedColor,
      selectedColorHex,
      selectedSize,
      unitPrice: product.basePrice,
      quantity: 1,
      design: defaultDesign,
      productionSpec: {
        printLocation: 'front',
        widthCm: product.printableAreas[0]?.defaultWidthCm || 10,
        heightCm: product.printableAreas[0]?.defaultHeightCm || 10,
        positionX: 0,
        positionY: 0,
        rotationDeg: 0,
        isFlippedHorizontally: false,
        previewUrl: product.images.primary,
        productionFileUrl: defaultDesign.imageUrl,
        originalDpi: 300,
        notes: 'Standard default chest DTF print'
      }
    });

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-28 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* 1. Top Detail Bar */}
      <div className="sticky top-0 z-30 bg-[#05070B]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-900">
        <button
          onClick={() => setActiveScreen('shop')}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          aria-label="Back"
        >
          <ChevronLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
        </button>

        <h1 className="text-sm font-bold text-white tracking-wide">
          {t('productDetail')}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center transition-colors ${
              isFavorite ? 'text-red-500 fill-red-500 border-red-500/30' : 'text-slate-300 hover:text-white'
            }`}
            aria-label="Favorite"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
              }
            }}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Hero Visual Showcase with Best Seller Badge & Side Angle Thumbnails */}
      <section className="px-4 pt-3 pb-4">
        <div className="grid grid-cols-4 gap-2.5">
          {/* Main 3D Mockup Display (Spans 3 cols) */}
          <div className="col-span-3 relative h-72 rounded-2xl bg-radial-blue border border-slate-800/80 overflow-hidden flex items-center justify-center">
            {/* Best Seller Pill */}
            {product.isBestSeller && (
              <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300" />
                <span>{t('bestSeller')}</span>
              </div>
            )}

            {selectedView === 'model' && product.images.model ? (
              <img
                src={product.images.model}
                alt="Model view"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : selectedView === 'back' && product.images.back ? (
              <MockupRenderer
                productType={product.category}
                colorHex={selectedColorHex}
                location="back"
                designUrl={defaultDesign.imageUrl}
                designScale={0.8}
                className="w-full h-full"
              />
            ) : (
              <MockupRenderer
                productType={product.category}
                colorHex={selectedColorHex}
                location="front"
                designUrl={defaultDesign.imageUrl}
                designScale={0.85}
                className="w-full h-full"
              />
            )}

            {/* Slider Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              <span className={`w-2 h-2 rounded-full transition-all ${selectedView === 'front' ? 'bg-blue-500 w-4' : 'bg-slate-700'}`} />
              <span className={`w-2 h-2 rounded-full transition-all ${selectedView === 'model' ? 'bg-blue-500 w-4' : 'bg-slate-700'}`} />
              <span className={`w-2 h-2 rounded-full transition-all ${selectedView === 'back' ? 'bg-blue-500 w-4' : 'bg-slate-700'}`} />
            </div>
          </div>

          {/* Side Angle Thumbnails (Spans 1 col) */}
          <div className="col-span-1 flex flex-col gap-2">
            <button
              onClick={() => setSelectedView('front')}
              className={`h-22 rounded-xl bg-slate-900 border overflow-hidden p-1 transition-all ${
                selectedView === 'front' ? 'border-blue-500 glow-blue-sm' : 'border-slate-800'
              }`}
            >
              <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden">
                <MockupRenderer
                  productType={product.category}
                  colorHex={selectedColorHex}
                  location="front"
                  designUrl={defaultDesign.imageUrl}
                  designScale={0.5}
                  className="w-full h-full"
                />
              </div>
            </button>

            {product.images.model && (
              <button
                onClick={() => setSelectedView('model')}
                className={`h-22 rounded-xl bg-slate-900 border overflow-hidden transition-all ${
                  selectedView === 'model' ? 'border-blue-500 glow-blue-sm' : 'border-slate-800'
                }`}
              >
                <img
                  src={product.images.model}
                  alt="Model"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            )}

            <button
              onClick={() => setSelectedView('back')}
              className={`h-22 rounded-xl bg-slate-900 border overflow-hidden p-1 transition-all ${
                selectedView === 'back' ? 'border-blue-500 glow-blue-sm' : 'border-slate-800'
              }`}
            >
              <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden">
                <MockupRenderer
                  productType={product.category}
                  colorHex={selectedColorHex}
                  location="back"
                  designUrl={defaultDesign.imageUrl}
                  designScale={0.5}
                  className="w-full h-full"
                />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Product Info & Pricing */}
      <section className="px-4 py-2">
        <h2 className="text-xl font-black text-white tracking-wide">
          {isRtl ? product.nameAr || product.name : product.name}
        </h2>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" />
            <span className="text-xs font-bold">{product.rating}</span>
          </div>
          <span className="text-xs text-slate-400">
            ({product.reviewsCount} {t('reviews')})
          </span>
        </div>

        {/* Price */}
        <div className="mt-2 text-2xl font-black text-white">
          {formatCurrency(product.basePrice)}
        </div>

        <div className="h-[1px] bg-slate-800/80 my-3" />

        {/* Color Swatches */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            {t('color')}: <span className="text-blue-400">{selectedColor}</span>
          </label>
          <div className="flex items-center gap-3">
            {product.colors.map((color) => {
              const isSelected = selectedColor === color.name;
              return (
                <button
                  key={color.name}
                  onClick={() => {
                    setSelectedColor(color.name);
                    setSelectedColorHex(color.hex);
                  }}
                  className={`relative w-8 h-8 rounded-full transition-transform active:scale-95 ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#05070B] scale-110' : 'border border-slate-700'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              );
            })}
          </div>
        </div>

        {/* Size Selector (for apparel) */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              {t('size')}: <span className="text-blue-400">{selectedSize}</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[42px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedSize === size
                      ? 'bg-blue-600 text-white shadow-md glow-blue-sm border border-blue-500'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Checkpoints Card */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>{t('premiumQualityMaterial')}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>{t('vibrantLongLasting')}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>{t('washDurable')}</span>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Floating Action Bar (Matching Screenshot #4) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800 p-3 max-w-md mx-auto flex items-center gap-2.5">
        {product.stock === 0 ? (
          <div className="w-full py-3.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 font-bold text-xs text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{isRtl ? 'هذا المنتج غير متوفر حالياً في المخزون' : 'This product is currently Out of Stock'}</span>
          </div>
        ) : product.type === 'ready_to_sell' ? (
          <button
            onClick={handleAddToCart}
            className="w-full py-3.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg glow-blue transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t('addToCart')} ({formatCurrency(product.basePrice)})</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleAddToCart}
              className="flex-1 py-3.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <span>{t('addToCart')}</span>
            </button>

            <button
              onClick={() => {
                startCustomizer(product, defaultDesign);
              }}
              className="flex-1 py-3.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg glow-blue transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>{t('customizeDesign')}</span>
            </button>
          </>
        )}
      </div>

      {/* Added Toast Notification */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{isRtl ? 'تمت الإضافة إلى السلة بنجاح!' : 'Added to cart successfully!'}</span>
        </div>
      )}
    </div>
  );
};
