import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Printer,
  Download,
  CheckCircle2,
  Maximize2,
  ExternalLink,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Check,
  Flame,
} from 'lucide-react';

export const ProductionTab: React.FC = () => {
  const { orders, updateOrderStatus, isRtl } = useApp();
  const [reprints, setReprints] = useState<Record<string, { count: number; reason: string }>>({});
  const [qcDefectModalItem, setQcDefectModalItem] = useState<{ orderId: string; orderNumber: string; idx: number } | null>(null);
  const [selectedDefectReason, setSelectedDefectReason] = useState('Print Color Shift / Calibration');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  const handleQcPass = (orderId: string, orderNumber: string) => {
    updateOrderStatus(orderId, 'ready_for_delivery', 'Quality Control (QC) Passed: Heat pressed & inspected');
    showToast(isRtl ? `تم اجتياز فحص الجودة بنجاح للطلب ${orderNumber}` : `QC Passed for order ${orderNumber}! Moved to Ready for Delivery.`);
  };

  const handleTriggerReprint = () => {
    if (!qcDefectModalItem) return;
    const key = `${qcDefectModalItem.orderId}_${qcDefectModalItem.idx}`;
    const current = reprints[key]?.count || 0;
    setReprints(prev => ({
      ...prev,
      [key]: { count: current + 1, reason: selectedDefectReason }
    }));
    updateOrderStatus(qcDefectModalItem.orderId, 'under_preparation', `QC Defect Reported: ${selectedDefectReason}. Reprint #${current + 1} queued.`);
    showToast(isRtl ? `تم تسجيل الخلل وإعادة توجيه الطلب ${qcDefectModalItem.orderNumber} لطباعة جديدة (إعادة طبع #${current + 1})` : `QC Defect recorded. Auto-Reprint #${current + 1} queued for ${qcDefectModalItem.orderNumber}`);
    setQcDefectModalItem(null);
  };

  const printQueueItems = orders.flatMap(o =>
    (o.items || []).map((item, itemIdx) => ({
      ...item,
      orderNumber: o.orderNumber,
      orderId: o.id,
      orderStatus: o.status,
      itemIdx,
    }))
  );

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isRtl ? 'محطة تشغيل طابعات DTF وفحص الجودة QC' : 'Direct-to-Film (DTF) RIP Print & QC Station'}
              </h2>
              <p className="text-[11px] text-blue-300/80">
                {isRtl ? 'ملفات طباعة 300 DPI بخلفية شفافة، أبعاد بالسنتيمتر، معايير المكبس الحراري وفحص الجودة' : '300 DPI transparent alpha print files, precise centimeter dimensions, heat press parameters & QC inspection'}
              </p>
            </div>
          </div>
        </div>

        {actionToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionToast}</span>
          </div>
        )}
      </div>

      {/* 2. Print Queue Items List */}
      <div className="space-y-3">
        {printQueueItems.map((item, idx) => {
          const designUrl = item.productionSpec?.productionFileUrl ||
            item.productionSpec?.previewUrl ||
            item.customUploadedArtworkUrl ||
            item.design?.imageUrl ||
            item.productImage;

          const location = item.productionSpec?.printLocation || 'front';
          const widthCm = item.productionSpec?.widthCm ?? 12;
          const heightCm = item.productionSpec?.heightCm ?? 12;
          const size = item.selectedSize || 'M';
          const colorName = item.selectedColor || 'Black';
          const reprintKey = `${item.orderId}_${item.itemIdx}`;
          const reprintInfo = reprints[reprintKey];

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white font-mono">{item.orderNumber}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30 font-bold uppercase">
                    {isRtl ? 'طابور أفلام DTF' : 'DTF Film Queue'}
                  </span>
                  {reprintInfo && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      <span>{isRtl ? `إعادة طبع #${reprintInfo.count}` : `REPRINT #${reprintInfo.count}`}</span>
                    </span>
                  )}
                </div>
                <span className="text-xs font-black text-purple-400 font-mono">
                  {isRtl ? 'الكمية:' : 'Quantity:'} {item.quantity || 1}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                {/* Artwork Thumbnail with checkerboard indicator */}
                <div className="w-20 h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                  <img
                    src={designUrl}
                    alt="Artwork"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1.5"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Print & Garment Specifications */}
                <div className="flex-1 space-y-1">
                  <h3 className="text-xs font-bold text-white">{item.productName}</h3>
                  <p className="text-[10px] text-slate-400">
                    {isRtl ? 'القطعة:' : 'Garment:'} <span className="text-white font-semibold">{colorName} ({size})</span> • {isRtl ? 'الموضع:' : 'Location:'} <span className="text-purple-300 font-bold uppercase">{location}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-blue-400 font-mono mt-1">
                    <span>{isRtl ? `العرض: ${widthCm} سم` : `Width: ${widthCm} cm`}</span>
                    <span>•</span>
                    <span>{isRtl ? `الارتفاع: ${heightCm} سم` : `Height: ${heightCm} cm`}</span>
                    <span>•</span>
                    <span>300 DPI Transparent PNG</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-amber-400/90 font-medium mt-0.5">
                    <Flame className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>{isRtl ? 'المكبس: 160°C لمدة 15 ثانية • تقشير دافئ Warm Peel • كبس تثبيت 5 ثوان' : 'Heat Press: 160°C for 15s • Warm Peel • 5s post-press seal'}</span>
                  </div>
                </div>
              </div>

              {/* Action Controls & QC Workflow */}
              <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'جاهز للطباعة والكبس الحراري' : 'Artwork Ready for RIP Printing'}</span>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={designUrl}
                    download={`dtf_${item.orderNumber}_${location}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تحميل ملف الفيلم (300 DPI)' : 'Download 300 DPI Film'}</span>
                  </a>

                  {item.orderStatus === 'under_preparation' && (
                    <>
                      <button
                        onClick={() => handleQcPass(item.orderId, item.orderNumber)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'اجتياز الجودة QC (جاهز للتوصيل)' : 'Pass QC & Ready'}</span>
                      </button>

                      <button
                        onClick={() => setQcDefectModalItem({ orderId: item.orderId, orderNumber: item.orderNumber, idx: item.itemIdx })}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'خلل QC (إعادة طبع)' : 'Report Defect / Reprint'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QC Defect & Reprint Modal */}
      {qcDefectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>{isRtl ? 'تسجيل خلل جودة وأمر إعادة طباعة' : 'Quality Control Defect & Auto-Reprint Order'}</span>
            </div>

            <p className="text-xs text-slate-300">
              {isRtl ? `حدد سبب الخلل للطلب ${qcDefectModalItem.orderNumber} لإعادة توليد ملف الطباعة وإرساله لطابور DTF:` : `Select defect reason for order ${qcDefectModalItem.orderNumber} to trigger a priority reprint:`}
            </p>

            <div className="space-y-2 text-xs">
              {[
                { id: 'print_color', label: 'Print Color Shift / Calibration Error' },
                { id: 'print_align', label: 'Artwork Misalignment / Placement Error' },
                { id: 'heat_peel', label: 'Heat Press Peel Damage / Adhesion Failure' },
                { id: 'garment_stain', label: 'Fabric / Garment Stain or Defect' },
              ].map(reason => (
                <label
                  key={reason.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    selectedDefectReason === reason.label
                      ? 'bg-rose-950/60 border-rose-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="defectReason"
                    value={reason.label}
                    checked={selectedDefectReason === reason.label}
                    onChange={(e) => setSelectedDefectReason(e.target.value)}
                    className="accent-rose-500"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setQcDefectModalItem(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleTriggerReprint}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تأكيد وإدراج في طابور إعادة الطبع' : 'Confirm & Queue Reprint'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
