import React from 'react';
import { X, BookOpen, Layers, Cpu, Database, Palette, CheckCircle2, FileCode, Shield, Download } from 'lucide-react';
import { downloadWordReport } from '../../utils/downloadReport';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">DTF Studio — Architecture & Integration Docs</h2>
              <p className="text-[10px] text-blue-400 font-mono">Component Guide & Production Specs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-300 no-scrollbar">
          {/* Section 1: Color Palette & Typography Match */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-400" />
              <span>Theme, Color Palette & Typography System</span>
            </h3>
            <p className="text-[11px] leading-relaxed">
              Strictly matched to the 4 uploaded reference screenshots with electric blue highlights and deep luxury dark canvas:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-[#05070B] border border-slate-800">
                <span className="text-slate-400 block">Primary Dark:</span>
                <span className="text-white font-bold">#05070B & #0B0F19</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-500/40">
                <span className="text-blue-300 block">Electric Accent:</span>
                <span className="text-blue-400 font-bold">#0066FF & #00D2FF</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Typography: <strong>Outfit</strong> for display headlines & badges, <strong>Plus Jakarta Sans</strong> for body readability, <strong>Cairo</strong> for Arabic RTL support.
            </p>
          </div>

          {/* Section 2: Vector Mockup Engine & Asset Export Formats */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Vector Mockup Engine & Asset Export Formats</span>
            </h3>
            <p className="text-[11px] leading-relaxed">
              The Vector Mockup Renderer (<code className="text-cyan-300">MockupRenderer.tsx</code>) computes real-time SVG fabric mesh and shadows:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[10px]">
              <li><strong>Physical Units:</strong> Real-world centimeters (CM) bounding specifications (e.g. 10×10 cm, 28×35 cm).</li>
              <li><strong>Export Formats:</strong> 300 DPI transparent PNG raster files and vector SVG layers sent to DTF RIP printer queue.</li>
              <li><strong>Interactive Transform:</strong> Real-time rotation angle, scale factor, X/Y offset, and horizontal flip.</li>
            </ul>
          </div>

          {/* Section 3: State & Role Management Architecture */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Multi-Role Architecture & State Store</span>
            </h3>
            <p className="text-[11px] leading-relaxed">
              Managed via centralized <code className="text-emerald-300">AppContext.tsx</code> with seamless live role switching:
            </p>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">1. Customer:</span>
                <span>Browses, customizes, uploads artwork, orders via Bank Transfer or COD, tracks status.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">2. Designer:</span>
                <span>Uploads designs with 2.50 JD royalty, tracks lifetime earnings, withdraws with &ge; 10 JD threshold.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-purple-400 font-bold">3. Admin / Owner:</span>
                <span>Marks bank payments received, manages DTF print queue with CM specs, edits CliQ & store rules.</span>
              </div>
            </div>
          </div>

          {/* Section 5: Verification & QA Audit Reports */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>Official System Verification & QA Audit Report</span>
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Export and save the official 20-point system verification and QA audit report directly in Microsoft Word format:
            </p>
            
            {/* Primary Instant Download Button */}
            <button
              onClick={() => downloadWordReport()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg glow-blue active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download Report in Word Format (.doc / .docx)</span>
            </button>

            {/* Static Fallback Direct Links */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Alternative Direct Links:</span>
              <div className="flex gap-2">
                <a
                  href="/DTF_Studio_Final_Verification_Report.doc"
                  download="DTF_Studio_Final_Verification_Report.doc"
                  className="text-cyan-400 hover:underline font-mono"
                >
                  Direct .DOC Link
                </a>
                <span>•</span>
                <a
                  href="/api/db/export"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline font-mono"
                >
                  JSON DB Snapshot
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
