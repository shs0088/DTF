import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Bell, CheckCircle2, DollarSign, Package, AlertCircle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, t } = useApp();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order_status':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'designer_royalty':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'payment_confirmed':
        return <CheckCircle2 className="w-4 h-4 text-cyan-400" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col p-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">{t('notifications')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsRead}
              className="text-[10px] text-blue-400 hover:underline"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                notif.read
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-70'
                  : 'bg-slate-900 border-blue-500/40 glow-blue-sm'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white">{notif.title}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{notif.message}</p>
                  <span className="text-[9px] text-slate-500 mt-1 block">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-10">No notifications yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
