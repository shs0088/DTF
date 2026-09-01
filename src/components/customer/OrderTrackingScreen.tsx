import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Clock, CheckCircle2, PackageCheck, Truck, Store, AlertCircle, Copy, Check } from 'lucide-react';
import { OrderStatus } from '../../types';

export const OrderTrackingScreen: React.FC = () => {
  const {
    orders,
    currentOrderId,
    businessSettings,
    setActiveScreen,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const activeOrder = orders.find(o => o.id === currentOrderId) || orders[0];

  const [copiedCliq, setCopiedCliq] = useState(false);
  const [timeLeft, setTimeLeft] = useState((businessSettings.bankTransferReservationMinutes || 15) * 60); // 15 minutes stock reservation countdown

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyCliqAlias = () => {
    navigator.clipboard.writeText(businessSettings.bankDetails.cliqAlias);
    setCopiedCliq(true);
    setTimeout(() => setCopiedCliq(false), 2000);
  };

  if (!activeOrder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <p className="text-sm">No orders yet.</p>
        <button
          onClick={() => setActiveScreen('home')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Explore DTF Studio
        </button>
      </div>
    );
  }

  const steps: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'new', label: 'Order Placed', icon: '📝' },
    { status: 'payment_confirmed', label: 'Payment Confirmed', icon: '💳' },
    { status: 'under_preparation', label: 'DTF Printing & Heat Press', icon: '🔥' },
    { status: 'ready_for_delivery', label: activeOrder.deliveryType === 'store_pickup' ? 'Ready for Pickup' : 'Ready & Packed', icon: '📦' },
    { status: 'under_delivery', label: 'Out for Delivery', icon: '🚚' },
    { status: 'completed', label: 'Completed', icon: '🎉' },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'new':
      case 'payment_pending':
        return 0;
      case 'payment_confirmed':
        return 1;
      case 'under_preparation':
        return 2;
      case 'ready_for_delivery':
      case 'ready_for_pickup':
      case 'given_to_courier':
        return 3;
      case 'under_delivery':
        return 4;
      case 'completed':
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(activeOrder.status);

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#05070B]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-900">
        <button
          onClick={() => setActiveScreen('home')}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
        >
          <ChevronLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-sm font-bold text-white tracking-wide">{t('orderTracking')}</h1>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-4">
        {/* Order Header Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Order Number</span>
            <span className="font-mono text-xs font-black text-white">{activeOrder.orderNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold block">Total</span>
            <span className="text-xs font-black text-blue-400">{formatCurrency(activeOrder.totalAmount || activeOrder.total || 0)}</span>
          </div>
        </div>

        {/* Bank Transfer Reservation Timer (If status is payment_pending) */}
        {activeOrder.status === 'payment_pending' && (
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-xs font-bold text-white">Awaiting Bank Transfer</span>
              </div>
              <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                {formatTimer(timeLeft)}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Please transfer <strong className="text-blue-400">{formatCurrency(activeOrder.totalAmount ?? activeOrder.total ?? 0)}</strong> within the 15-minute reservation timer to secure your order.
            </p>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 block">CliQ Alias</span>
                <span className="font-mono text-xs font-bold text-cyan-400">{businessSettings.bankDetails.cliqAlias}</span>
              </div>
              <button
                onClick={copyCliqAlias}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 flex items-center gap-1 transition-all"
              >
                {copiedCliq ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCliq ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Real-time Visual Status Timeline */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90">
          <h2 className="text-xs font-bold text-white mb-4">Production & Delivery Status</h2>

          <div className="space-y-4 relative">
            {/* Connecting Vertical Line */}
            <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-slate-800 z-0" />

            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.status} className="flex items-center gap-3 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 glow-blue-sm animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : step.icon}
                  </div>

                  <div className="flex-1">
                    <p className={`text-xs font-bold ${isCurrent ? 'text-blue-400' : isPast ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        In progress — updated real-time
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ordered Items Breakdown with Production CM Dimensions */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2.5">
          <h2 className="text-xs font-bold text-white">Order Items ({activeOrder.items.length})</h2>

          {activeOrder.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-800/60 last:border-0">
              <div className="w-10 h-10 rounded-lg bg-slate-950 flex-shrink-0 overflow-hidden border border-slate-800 flex items-center justify-center">
                <img
                  src={item.productionSpec.productionFileUrl}
                  alt={item.productName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Qty: {item.quantity}</span>
                  <span>•</span>
                  <span className="font-mono text-blue-300">
                    {item.productionSpec.widthCm}×{item.productionSpec.heightCm} cm
                  </span>
                </div>
              </div>

              <span className="text-xs font-bold text-white">
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
