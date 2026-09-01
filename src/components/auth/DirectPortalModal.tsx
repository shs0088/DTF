import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Paintbrush,
  ShieldCheck,
  User,
  Copy,
  Check,
  ExternalLink,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DirectPortalModal: React.FC = () => {
  const {
    isDirectPortalModalOpen,
    setIsDirectPortalModalOpen,
    loginAsDesigner,
    loginAsAdmin,
    loginAsCustomer,
    getDirectPortalUrl,
    designerProfile,
    userRole,
    isRtl,
    t,
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isDirectPortalModalOpen) return null;

  const handleCopyLink = (portal: 'designer' | 'admin' | 'customizer' | 'shop', key: string) => {
    const url = getDirectPortalUrl(portal);
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Direct Portal Login & Links</h2>
              <p className="text-[10px] text-slate-400">Direct dashboard bypass without home landing</p>
            </div>
          </div>
          <button
            onClick={() => setIsDirectPortalModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-100">
          <p className="text-xs text-slate-300 leading-relaxed">
            Choose a dashboard below to <strong className="text-white">login instantly</strong>, or copy the direct URL link to bookmark and open straight to your workstation.
          </p>

          {/* 1. Designer Direct Portal Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 hover:border-cyan-400 transition-all space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/30">
                  <Paintbrush className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white">Designer Portal</h3>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                      Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {designerProfile.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-semibold block">Balance</span>
                <span className="text-xs font-black text-cyan-400">${(designerProfile.withdrawableBalance ?? designerProfile.balance ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Total Uploaded Artworks:</span>
                <span className="font-bold text-white">{designerProfile.totalDesignsCount ?? 0} designs</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Total Prints Sold:</span>
                <span className="font-bold text-emerald-400">{designerProfile.totalSoldOrUsed ?? designerProfile.salesCount ?? 0} orders</span>
              </p>
            </div>

            {/* Actions for Designer */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={loginAsDesigner}
                className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
              >
                <span>Direct Login to Designer Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCopyLink('designer', 'des_link')}
                title="Copy Direct Link to Designer Dashboard"
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                {copiedKey === 'des_link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Admin Direct Portal Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 hover:border-purple-400 transition-all space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white">Owner & Admin Command Center</h3>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                      Root Access
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    admin@dtfstudio.io
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <p className="text-slate-400">
                Full production management, RIP queue, artwork approvals, bank payment validations, and payouts.
              </p>
            </div>

            {/* Actions for Admin */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={loginAsAdmin}
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
              >
                <span>Direct Login to Admin Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCopyLink('admin', 'admin_link')}
                title="Copy Direct Link to Admin Dashboard"
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                {copiedKey === 'admin_link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Customer Storefront Option */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Customer Storefront</h4>
                <p className="text-[10px] text-slate-400">Browse apparel and customize prints</p>
              </div>
            </div>
            <button
              onClick={loginAsCustomer}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-semibold transition-colors"
            >
              Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
