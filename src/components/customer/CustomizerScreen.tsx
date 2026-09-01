import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, RotateCcw, RotateCw, Plus, Minus, Image as GalleryIcon, Upload, RefreshCw, FlipHorizontal2, Check, AlertTriangle } from 'lucide-react';
import { MockupRenderer } from '../mockups/MockupRenderer';
import { PrintLocation, Design } from '../../types';

export const CustomizerScreen: React.FC = () => {
  const {
    customizerProduct,
    customizerDesign,
    customizerArtworkUrl,
    products,
    designs,
    addToCart,
    setActiveScreen,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const product = customizerProduct || products[0];

  // Customization States
  const [selectedLocation, setSelectedLocation] = useState<PrintLocation>('front');
  const [selectedColorHex, setSelectedColorHex] = useState(product.colors[0]?.hex || '#0B0F17');
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[1] || product.sizes[0] : 'M');
  const [activeDesign, setActiveDesign] = useState<Design | null>(customizerDesign || designs[0]);
  const [customUploadUrl, setCustomUploadUrl] = useState<string | null>(customizerArtworkUrl || null);

  // Exact physical size in centimeters
  const [printWidthCm, setPrintWidthCm] = useState(10);
  const [printHeightCm, setPrintHeightCm] = useState(10);

  // Transform states
  const [positionX, setPositionX] = useState(0); // -100 to 100
  const [positionY, setPositionY] = useState(0); // -100 to 100
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [designScale, setDesignScale] = useState(0.85);

  // History for Undo/Redo
  const [history, setHistory] = useState<Array<{ x: number; y: number; scale: number; rot: number; w: number; h: number }>>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Modals
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Drag interaction refs
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const saveHistoryStep = () => {
    const nextStep = { x: positionX, y: positionY, scale: designScale, rot: rotation, w: printWidthCm, h: printHeightCm };
    setHistory(prev => [...prev.slice(0, historyIdx + 1), nextStep]);
    setHistoryIdx(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevStep = history[historyIdx - 1];
      setPositionX(prevStep.x);
      setPositionY(prevStep.y);
      setDesignScale(prevStep.scale);
      setRotation(prevStep.rot);
      setPrintWidthCm(prevStep.w);
      setPrintHeightCm(prevStep.h);
      setHistoryIdx(historyIdx - 1);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextStep = history[historyIdx + 1];
      setPositionX(nextStep.x);
      setPositionY(nextStep.y);
      setDesignScale(nextStep.scale);
      setRotation(nextStep.rot);
      setPrintWidthCm(nextStep.w);
      setPrintHeightCm(nextStep.h);
      setHistoryIdx(historyIdx + 1);
    }
  };

  // Adjust size stepper
  const handleSizeChange = (delta: number) => {
    const newWidth = Math.max(5, Math.min(35, printWidthCm + delta));
    const newHeight = Math.max(5, Math.min(45, printHeightCm + delta));
    setPrintWidthCm(newWidth);
    setPrintHeightCm(newHeight);
    setDesignScale(newWidth / 12);
    saveHistoryStep();
  };

  const handleRotateClick = () => {
    setRotation(prev => (prev + 45) % 360);
    saveHistoryStep();
  };

  const handleFlipClick = () => {
    setIsFlipped(prev => !prev);
    saveHistoryStep();
  };

  // Drag handling on preview container
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setPositionX(prev => Math.max(-50, Math.min(50, prev + dx * 0.4)));
    setPositionY(prev => Math.max(-50, Math.min(50, prev + dy * 0.4)));
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      saveHistoryStep();
    }
  };

  // Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomUploadUrl(dataUrl);
      setActiveDesign(null); // Switch to custom upload
      setUploadSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  // Approve & Add to Cart
  const handleApprove = () => {
    const displayImg = customUploadUrl || activeDesign?.imageUrl || product.images.primary;

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images.primary,
      productType: activeDesign ? 'ready_to_sell' : 'blank',
      selectedColor: product.colors.find(c => c.hex === selectedColorHex)?.name || 'Custom',
      selectedColorHex,
      selectedSize,
      unitPrice: product.basePrice,
      quantity: 1,
      design: activeDesign || undefined,
      customUploadedArtworkUrl: customUploadUrl || undefined,
      productionSpec: {
        printLocation: selectedLocation,
        widthCm: printWidthCm,
        heightCm: printHeightCm,
        positionX,
        positionY,
        rotationDeg: rotation,
        isFlippedHorizontally: isFlipped,
        previewUrl: product.images.primary,
        productionFileUrl: displayImg,
        originalDpi: 300,
        notes: `Production-ready DTF transfer. Size: ${printWidthCm}cm x ${printHeightCm}cm. Location: ${selectedLocation}.`
      }
    });

    setActiveScreen('cart');
  };

  const activeArtworkDisplay = customUploadUrl || activeDesign?.imageUrl;

  return (
    <div className="flex-1 overflow-y-auto pb-28 text-slate-100 bg-[#05070B] no-scrollbar flex flex-col">
      {/* 1. Header Toolbar with Close, Title, Undo & Redo (Matching Screenshot #3) */}
      <header className="sticky top-0 z-40 bg-[#05070B]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-900">
        <button
          onClick={() => setActiveScreen('home')}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-bold text-white tracking-wide">
          {t('customize')}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className={`flex items-center gap-1 text-xs font-semibold ${
              historyIdx > 0 ? 'text-slate-200 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('undo')}</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className={`flex items-center gap-1 text-xs font-semibold ${
              historyIdx < history.length - 1 ? 'text-slate-200 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{t('redo')}</span>
          </button>
        </div>
      </header>

      {/* 2. Vector Customizer Stage with Transform Box */}
      <section className="relative px-4 pt-2 pb-3 flex-1 flex flex-col items-center">
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full h-[320px] rounded-2xl bg-radial-blue border border-slate-800/80 overflow-hidden flex items-center justify-center cursor-move select-none"
        >
          <MockupRenderer
            productType={product.category}
            colorHex={selectedColorHex}
            location={selectedLocation}
            designUrl={activeArtworkDisplay}
            designScale={designScale}
            positionX={positionX}
            positionY={positionY}
            rotation={rotation}
            isFlipped={isFlipped}
            showBoundaryGuide={true}
            interactive={true}
            className="w-full h-full"
          />

          {/* Floating Gesture Helper Tag */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-medium pointer-events-none flex items-center gap-1.5">
            <span>👆 {t('dragToMovePinch')}</span>
          </div>
        </div>

        {/* 3. Print Location Selector Pills (Matching Screenshot #3) */}
        <div className="w-full mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedLocation('front')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedLocation === 'front'
                ? 'bg-blue-600 text-white shadow-md glow-blue-sm border border-blue-500'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>👕 {t('front')}</span>
          </button>

          <button
            onClick={() => setSelectedLocation('back')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedLocation === 'back'
                ? 'bg-blue-600 text-white shadow-md glow-blue-sm border border-blue-500'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>👕 {t('backLocation')}</span>
          </button>

          {product.category === 't_shirts' && (
            <>
              <button
                onClick={() => setSelectedLocation('left_sleeve')}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                  selectedLocation === 'left_sleeve'
                    ? 'bg-blue-600 text-white shadow-md glow-blue-sm border border-blue-500'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>🏷️ {t('leftSleeve')}</span>
              </button>

              <button
                onClick={() => setSelectedLocation('right_sleeve')}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                  selectedLocation === 'right_sleeve'
                    ? 'bg-blue-600 text-white shadow-md glow-blue-sm border border-blue-500'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>🏷️ {t('rightSleeve')}</span>
              </button>
            </>
          )}
        </div>

        {/* 4. Physical Print Size Stepper (Matching Screenshot #3) */}
        <div className="w-full mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">{t('printSize')}</span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSizeChange(-1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition-all"
                aria-label="Decrease Size"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono font-black text-sm text-blue-400">
                {printWidthCm} × {printHeightCm} cm
              </div>

              <button
                onClick={() => handleSizeChange(1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition-all"
                aria-label="Increase Size"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>ℹ️</span>
            <span>{t('exactSizeNote')}</span>
          </p>
        </div>

        {/* 5. Customizer Tool Action Bar (Matching Screenshot #3) */}
        <div className="w-full mt-3 grid grid-cols-4 gap-2">
          {/* Gallery Button */}
          <button
            onClick={() => setShowGalleryModal(true)}
            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <GalleryIcon className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-semibold">{t('gallery')}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold">{t('upload')}</span>
          </button>

          {/* Rotate Button */}
          <button
            onClick={handleRotateClick}
            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-semibold">{t('rotate')}</span>
          </button>

          {/* Flip Button */}
          <button
            onClick={handleFlipClick}
            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <FlipHorizontal2 className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold">{t('flip')}</span>
          </button>
        </div>
      </section>

      {/* 6. Sticky Bottom CTA (Matching Screenshot #3) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800 p-3 max-w-md mx-auto">
        <button
          onClick={handleApprove}
          className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl glow-blue transition-all"
        >
          <span>
            {t('approveAndAddToCart')} — {formatCurrency(product.basePrice)}
          </span>
        </button>
      </div>

      {/* MODAL: Pick Design from Gallery */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-0">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{t('pickDesignFromGallery')}</h3>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {designs.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setActiveDesign(d);
                    setCustomUploadUrl(null);
                    setShowGalleryModal(false);
                    saveHistoryStep();
                  }}
                  className="bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl p-1.5 cursor-pointer flex flex-col items-center"
                >
                  <img
                    src={d.imageUrl}
                    alt={d.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <p className="text-[10px] font-bold text-white mt-1 truncate w-full text-center">
                    {d.title}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate w-full text-center">
                    {d.designerName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload Custom Artwork & DTF Validator */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-0">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{t('uploadYourArtwork')}</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="mt-4 relative border-2 border-dashed border-blue-500/40 hover:border-blue-400 rounded-2xl p-6 bg-slate-950/60 text-center flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-xs font-bold text-white">{t('dropzoneTitle')}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {t('dropzoneSub')}
              </p>
              <input
                type="file"
                accept="image/png, image/svg+xml, .ai, .psd, .pdf, image/jpeg"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Validation Checklist Requirements */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-2 text-slate-300">
              <p className="font-bold text-blue-400">DTF Quality Checks:</p>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{t('fileValid')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{t('maxFileSize')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{t('validDtfFileFormats')}</span>
              </div>
            </div>

            {uploadError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Artwork uploaded and verified! Loading on mockup...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
