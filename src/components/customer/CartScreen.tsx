import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { MockupRenderer } from '../mockups/MockupRenderer';

export const CartScreen: React.FC = () => {
  const { cart, removeFromCart, updateCartQuantity, cartTotal, setActiveScreen, formatCurrency, t, isRtl } = useApp();

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 pb-24">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 glow-blue-sm">
          <ShoppingBag className="w-8 h-8 text-blue-500/50" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">{t('cartEmpty')}</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          Pick a custom apparel, mug, or cap and start printing your dream design.
        </p>
        <button
          onClick={() => setActiveScreen('home')}
          className="py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs glow-blue transition-all"
        >
          {t('startCustomizing')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 text-slate-100 bg-[#05070B] no-scrollbar">
      <div className="px-4 py-3 border-b border-slate-900 flex items-center justify-between">
        <h1 className="text-base font-black text-white">{t('myCart')}</h1>
        <span className="text-xs font-semibold text-blue-400">
          {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {cart.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex gap-3 relative"
          >
            {/* Visual Thumbnail */}
            <div className="w-24 h-24 rounded-xl bg-slate-950 flex-shrink-0 overflow-hidden flex items-center justify-center">
              <MockupRenderer
                productType={item.productId.includes('mug') ? 'mugs' : item.productId.includes('cap') ? 'caps' : 't_shirts'}
                colorHex={item.selectedColorHex}
                location={item.productionSpec.printLocation}
                designUrl={item.productionSpec.productionFileUrl}
                designScale={0.7}
                className="w-full h-full"
              />
            </div>

            {/* Info details & exact production specifications */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-bold text-white truncate">
                    {item.productName}
                  </h3>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 mt-0.5">
                  {item.selectedColor} {item.selectedSize ? `• ${item.selectedSize}` : ''}
                </p>

                {/* Exact Production Specs Tag */}
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[9px] font-mono font-bold text-blue-300">
                    📐 {item.productionSpec.widthCm}×{item.productionSpec.heightCm} cm
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 capitalize">
                    {item.productionSpec.printLocation.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Price */}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-white min-w-[16px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-xs font-black text-white">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Checkout Action */}
      <div id="cart-checkout-summary-bar" className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800 p-3 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-semibold text-slate-400">{t('subtotal')}</span>
          <span className="text-base font-black text-white">{formatCurrency(cartTotal)}</span>
        </div>

        <button
          id="cart-proceed-to-checkout-btn"
          onClick={() => setActiveScreen('checkout')}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl glow-blue transition-all cursor-pointer"
        >
          <span>{t('proceedToCheckout')}</span>
          <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
