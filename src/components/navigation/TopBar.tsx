import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Globe, ShoppingBag } from 'lucide-react';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onOpenNotifications?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onBack,
  onOpenNotifications,
}) => {
  const { language, setLanguage, cartCount, unreadNotificationsCount, setActiveScreen, activeScreen } = useApp();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#05070B]/95 backdrop-blur-md border-b border-slate-900 flex flex-col">
      {/* Main Header Row */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-200 hover:text-white hover:border-slate-700 active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <span className="text-base leading-none">←</span>
            </button>
          ) : (
            <div 
              onClick={() => setActiveScreen('home')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <span className="font-black text-xs tracking-wider">DTF</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs tracking-wider text-white">DTF STUDIO</span>
              </div>
            </div>
          )}
          {title && (
            <h1 className="text-sm font-bold text-white tracking-wide truncate max-w-[160px]">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Switch Language / تبديل اللغة"
          >
            <Globe className="w-3 h-3 text-blue-400" />
            <span>{language === 'en' ? 'العربية' : 'EN'}</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white font-bold text-[8px] flex items-center justify-center shadow-sm animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Cart Quick Access Button */}
          <button
            id="topbar-cart-btn"
            onClick={() => setActiveScreen('cart')}
            className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              activeScreen === 'cart'
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-blue-500'
            }`}
            aria-label="Shopping Cart"
            title="Shopping Cart / سلة التسوق"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white font-black text-[9px] flex items-center justify-center shadow-md animate-scale">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
