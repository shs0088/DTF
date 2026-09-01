import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RoleSwitcherBar } from './components/navigation/RoleSwitcherBar';
import { TopBar } from './components/navigation/TopBar';
import { BottomNav } from './components/navigation/BottomNav';
import { NotificationDrawer } from './components/navigation/NotificationDrawer';
import { DocumentationModal } from './components/documentation/DocumentationModal';
import { DirectPortalModal } from './components/auth/DirectPortalModal';
import { DesignerRegistrationModal } from './components/designer/DesignerRegistrationModal';

// Screens
import { HomeScreen } from './components/customer/HomeScreen';
import { DesignGalleryScreen } from './components/customer/DesignGalleryScreen';
import { ProductDetailScreen } from './components/customer/ProductDetailScreen';
import { CustomizerScreen } from './components/customer/CustomizerScreen';
import { ShopScreen } from './components/customer/ShopScreen';
import { CartScreen } from './components/customer/CartScreen';
import { CheckoutScreen } from './components/customer/CheckoutScreen';
import { OrderTrackingScreen } from './components/customer/OrderTrackingScreen';
import { AccountScreen } from './components/customer/AccountScreen';
import { DesignerDashboardScreen } from './components/designer/DesignerDashboardScreen';
import { AdminDashboardScreen } from './components/admin/AdminDashboardScreen';

import { BookOpen } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeScreen, setActiveScreen, isRtl } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const isCustomizer = activeScreen === 'customizer' || activeScreen === 'customize';

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen />;
      case 'designs':
        return <DesignGalleryScreen />;
      case 'product_detail':
        return <ProductDetailScreen />;
      case 'customizer':
      case 'customize':
        return <CustomizerScreen />;
      case 'shop':
        return <ShopScreen />;
      case 'cart':
        return <CartScreen />;
      case 'checkout':
        return <CheckoutScreen />;
      case 'order_tracking':
        return <OrderTrackingScreen />;
      case 'account':
        return <AccountScreen />;
      case 'designer_dashboard':
        return <DesignerDashboardScreen />;
      case 'admin_dashboard':
        return <AdminDashboardScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'designs':
        return 'Designer Gallery';
      case 'shop':
        return 'DTF Apparel & Blanks';
      case 'cart':
        return 'Shopping Cart';
      case 'checkout':
        return 'Checkout';
      case 'order_tracking':
        return 'Order Tracking';
      case 'account':
        return 'My Account';
      case 'designer_dashboard':
        return 'Designer Portal';
      case 'admin_dashboard':
        return 'Owner Command Center';
      default:
        return undefined;
    }
  };

  const showBackButton = ['product_detail', 'checkout', 'order_tracking'].includes(activeScreen);

  const handleBack = () => {
    if (activeScreen === 'product_detail') setActiveScreen('shop');
    else if (activeScreen === 'checkout') setActiveScreen('cart');
    else if (activeScreen === 'order_tracking') setActiveScreen('home');
    else setActiveScreen('home');
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-100 flex flex-col items-center justify-start relative selection:bg-blue-600 selection:text-white font-body">
      {/* Background Glow Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Role Switcher Floating Bar (Customer / Designer / Admin + Direct Portals) */}
      <div className="w-full sticky top-0 z-50">
        <RoleSwitcherBar />
      </div>

      {/* Main Mobile Screen Container (480px width bound for pixel-perfect mockup matching, responsive on desktop) */}
      <main className="w-full max-w-md bg-[#05070B] min-h-[calc(100vh-32px)] border-x border-slate-800/60 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Top App Header (Hidden during full-screen customizer) */}
        {!isCustomizer && (
          <TopBar
            title={getScreenTitle()}
            showBack={showBackButton}
            onBack={handleBack}
            onOpenNotifications={() => setShowNotifications(true)}
          />
        )}

        {/* Active Screen View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {renderActiveScreen()}
        </div>

        {/* Bottom Navigation Bar (Hidden during customizer and checkout) */}
        {!isCustomizer && activeScreen !== 'checkout' && (
          <BottomNav />
        )}
      </main>

      {/* Floating Architecture Documentation Button (Sticky on bottom corner) */}
      <button
        onClick={() => setShowDocs(true)}
        className="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:text-white text-xs font-bold shadow-xl flex items-center gap-1.5 backdrop-blur-md transition-all glow-blue-sm"
        title="View Architecture & Integration Docs"
      >
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Docs & Integration</span>
      </button>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Component & Architecture Documentation Modal */}
      <DocumentationModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />

      {/* Direct Portal Access and Links Modal */}
      <DirectPortalModal />

      {/* Designer Automated Registration & Instant Qualification Modal */}
      <DesignerRegistrationModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
