import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Paintbrush, ShieldAlert, Sparkles, RefreshCw, Key, Link as LinkIcon, FileText } from 'lucide-react';
import { downloadWordReport } from '../../utils/downloadReport';

export const RoleSwitcherBar: React.FC = () => {
  const {
    userRole,
    setUserRole,
    setActiveScreen,
    resetToDemoDefaults,
    setIsDirectPortalModalOpen,
    language,
    setLanguage,
  } = useApp();

  return (
    <div className="w-full bg-[#080D1A] border-b border-blue-500/20 px-3 py-1.5 flex items-center justify-between text-xs max-w-md mx-auto">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Role:</span>
        </span>

        {/* Customer Button */}
        <button
          onClick={() => {
            setUserRole('customer');
            setActiveScreen('home');
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all whitespace-nowrap ${
            userRole === 'customer'
              ? 'bg-blue-600 text-white shadow-sm glow-blue-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <User className="w-3 h-3" />
          <span>Customer</span>
        </button>

        {/* Designer Button */}
        <button
          onClick={() => {
            setUserRole('designer');
            setActiveScreen('designer_dashboard');
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all whitespace-nowrap ${
            userRole === 'designer'
              ? 'bg-cyan-600 text-white shadow-sm glow-cyan'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Paintbrush className="w-3 h-3" />
          <span>Designer</span>
        </button>

        {/* Admin Button */}
        <button
          onClick={() => {
            setUserRole('admin');
            setActiveScreen('admin_dashboard');
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all whitespace-nowrap ${
            userRole === 'admin'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Admin</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Instant Word Report Download Button */}
        <button
          onClick={() => downloadWordReport()}
          title="Download Final Verification Report in Word (.doc / .docx)"
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-[10px] transition-all shadow-sm"
        >
          <FileText className="w-3 h-3 text-emerald-400" />
          <span>Word Report</span>
        </button>

        {/* Direct Access / Portal Links Button */}
        <button
          onClick={() => setIsDirectPortalModalOpen(true)}
          title="Direct Login Portals & Links"
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/40 text-blue-300 hover:text-white font-bold text-[10px] transition-all"
        >
          <LinkIcon className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Portals</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={resetToDemoDefaults}
          title="Reset Demo Data"
          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
