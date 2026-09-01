import React from 'react';
import { useApp, ScreenType } from '../../context/AppContext';
import { Home, ShoppingBag, Palette, ShoppingCart, User, ShieldCheck, Paintbrush } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeScreen, setActiveScreen, cartCount, userRole, t } = useApp();

  const isHomeActive = activeScreen === 'home';
  const isShopActive = activeScreen === 'shop';
  const isDesignsActive = activeScreen === 'designs';
  const isCartActive = activeScreen === 'cart';
  const isAccountActive = activeScreen === 'account' || activeScreen === 'designer_dashboard' || activeScreen === 'admin_dashboard';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-slate-800/90 py-1.5 px-3 max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => setActiveScreen('home')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
            isHomeActive
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'stroke-[2.5px] scale-110 drop-shadow' : 'stroke-[1.8px]'}`} />
          <span className="text-[11px] font-medium mt-1">{t('home')}</span>
        </button>

        {/* Shop */}
        <button
          onClick={() => setActiveScreen('shop')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
            isShopActive
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className={`w-5 h-5 ${isShopActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'}`} />
          <span className="text-[11px] font-medium mt-1">{t('shop')}</span>
        </button>

        {/* Designs Gallery */}
        <button
          onClick={() => setActiveScreen('designs')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
            isDesignsActive
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Palette className={`w-5 h-5 ${isDesignsActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'}`} />
            <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-cyan-400 rounded-full glow-cyan animate-pulse" />
          </div>
          <span className="text-[11px] font-medium mt-1">{t('designs')}</span>
        </button>

        {/* Cart */}
        <button
          id="bottomnav-cart-btn"
          onClick={() => setActiveScreen('cart')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            isCartActive
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Cart"
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${isCartActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center glow-blue-sm">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium mt-1">{t('cart')}</span>
        </button>

        {/* Account / Role Specific Dashboard */}
        <button
          onClick={() => {
            if (userRole === 'designer') {
              setActiveScreen('designer_dashboard');
            } else if (userRole === 'admin') {
              setActiveScreen('admin_dashboard');
            } else {
              setActiveScreen('account');
            }
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
            isAccountActive
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {userRole === 'admin' ? (
            <ShieldCheck className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.5px] scale-110 text-amber-400' : 'stroke-[1.8px]'}`} />
          ) : userRole === 'designer' ? (
            <Paintbrush className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.5px] scale-110 text-cyan-400' : 'stroke-[1.8px]'}`} />
          ) : (
            <User className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'}`} />
          )}
          <span className="text-[11px] font-medium mt-1 truncate max-w-[64px]">
            {userRole === 'admin' ? t('admin') : userRole === 'designer' ? t('designer') : t('account')}
          </span>
        </button>
      </div>

      {/* iOS Home Indicator Bar */}
      <div className="w-32 h-1 bg-slate-600/60 rounded-full mx-auto mt-1 mb-0.5" />
    </nav>
  );
};
