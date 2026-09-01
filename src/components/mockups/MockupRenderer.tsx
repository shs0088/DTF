import React from 'react';
import { PrintLocation } from '../../types';

interface MockupRendererProps {
  productType: 't_shirts' | 'mugs' | 'caps' | 'hoodies' | string;
  colorHex: string;
  location: PrintLocation;
  designUrl?: string | null;
  designScale?: number; // 0.2 to 2.0
  positionX?: number; // -100 to 100 percentage
  positionY?: number; // -100 to 100 percentage
  rotation?: number; // 0 to 360
  isFlipped?: boolean;
  widthCm?: number;
  heightCm?: number;
  showBoundaryGuide?: boolean;
  interactive?: boolean;
  onTransformChange?: (changes: { positionX?: number; positionY?: number; scale?: number; rotation?: number }) => void;
  className?: string;
}

export const MockupRenderer: React.FC<MockupRendererProps> = ({
  productType,
  colorHex,
  location,
  designUrl,
  designScale = 1,
  positionX = 0,
  positionY = 0,
  rotation = 0,
  isFlipped = false,
  showBoundaryGuide = false,
  interactive = false,
  className = 'w-full h-full min-h-[340px]',
}) => {
  // Normalize color brightness for highlights and shadows
  const isDarkColor = colorHex === '#0B0F17' || colorHex === '#0F172A' || colorHex === '#1E293B' || colorHex === '#111827';
  const shadowColor = isDarkColor ? '#000000' : 'rgba(0,0,0,0.35)';

  // Determine mockup view layout
  const renderProductSvg = () => {
    if (productType === 'mugs' || productType === 'prod_mug') {
      return (
        <svg viewBox="0 0 500 500" className="w-full h-full max-h-[380px] drop-shadow-2xl mx-auto select-none">
          <defs>
            <linearGradient id="mugGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={shadowColor} stopOpacity="0.8" />
              <stop offset="25%" stopColor={colorHex} />
              <stop offset="55%" stopColor={isDarkColor ? '#334155' : '#FFFFFF'} stopOpacity="0.4" />
              <stop offset="85%" stopColor={colorHex} />
              <stop offset="100%" stopColor={shadowColor} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorHex} />
              <stop offset="100%" stopColor={shadowColor} stopOpacity="0.9" />
            </linearGradient>
            <filter id="mugShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000000" floodOpacity="0.85" />
            </filter>
            <clipPath id="mugBodyClip">
              <rect x="140" y="120" width="220" height="270" rx="14" />
            </clipPath>
          </defs>

          {/* Table shadow */}
          <ellipse cx="250" cy="420" rx="170" ry="25" fill="#000000" opacity="0.6" filter="blur(10px)" />

          {/* Mug Handle */}
          <path
            d="M 330 160 C 440 160, 440 330, 330 330 L 330 290 C 390 290, 390 200, 330 200 Z"
            fill="url(#handleGrad)"
            stroke="#1E293B"
            strokeWidth="2"
            filter="url(#mugShadow)"
          />

          {/* Main Cylinder Mug Body */}
          <rect
            x="140"
            y="120"
            width="220"
            height="270"
            rx="16"
            fill="url(#mugGrad)"
            stroke={isDarkColor ? '#1E293B' : '#CBD5E1'}
            strokeWidth="2"
          />

          {/* Mug Rim Oval Top */}
          <ellipse
            cx="250"
            cy="125"
            rx="110"
            ry="20"
            fill={isDarkColor ? '#1E293B' : '#E2E8F0'}
            stroke={isDarkColor ? '#334155' : '#94A3B8'}
            strokeWidth="1.5"
          />
          <ellipse
            cx="250"
            cy="125"
            rx="102"
            ry="15"
            fill="#05070B"
            opacity="0.8"
          />

          {/* Printable Overlay inside Mug Clip */}
          <g clipPath="url(#mugBodyClip)">
            {/* Printable Boundary Box */}
            {showBoundaryGuide && (
              <rect
                x="160"
                y="155"
                width="180"
                height="190"
                rx="8"
                fill="none"
                stroke="#0066FF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            )}

            {/* Design Image Content */}
            {designUrl && (
              <g
                transform={`translate(${250 + (positionX * 0.9)}, ${250 + (positionY * 0.9)}) rotate(${rotation}) scale(${isFlipped ? -designScale : designScale}, ${designScale}) translate(-80, -80)`}
              >
                <image
                  href={designUrl}
                  x="0"
                  y="0"
                  width="160"
                  height="160"
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none drop-shadow-md"
                />
              </g>
            )}
          </g>

          {/* Glossy Curved Cylindrical Reflection */}
          <rect
            x="180"
            y="125"
            width="35"
            height="260"
            fill="#FFFFFF"
            opacity="0.08"
            clipPath="url(#mugBodyClip)"
          />
        </svg>
      );
    }

    if (productType === 'caps' || productType === 'prod_cap') {
      return (
        <svg viewBox="0 0 500 500" className="w-full h-full max-h-[380px] drop-shadow-2xl mx-auto select-none">
          <defs>
            <radialGradient id="capCrownGrad" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor={isDarkColor ? '#334155' : '#FFFFFF'} stopOpacity="0.3" />
              <stop offset="60%" stopColor={colorHex} />
              <stop offset="100%" stopColor={shadowColor} stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorHex} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
            </linearGradient>
            <clipPath id="capFrontClip">
              <path d="M 160 270 C 150 170, 350 170, 340 270 Z" />
            </clipPath>
          </defs>

          {/* Shadow */}
          <ellipse cx="250" cy="410" rx="190" ry="25" fill="#000000" opacity="0.75" filter="blur(12px)" />

          {/* Cap Flat Visor / Brim */}
          <path
            d="M 90 320 C 130 280, 370 280, 410 320 C 370 380, 130 380, 90 320 Z"
            fill="url(#visorGrad)"
            stroke="#1E293B"
            strokeWidth="2"
          />

          {/* Visor underside stitching curve */}
          <path
            d="M 120 325 C 160 300, 340 300, 380 325"
            fill="none"
            stroke={isDarkColor ? '#475569' : '#94A3B8'}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Cap Crown (6 panels) */}
          <path
            d="M 130 290 C 120 140, 380 140, 370 290 Z"
            fill="url(#capCrownGrad)"
            stroke={isDarkColor ? '#1E293B' : '#CBD5E1'}
            strokeWidth="2"
          />

          {/* Panel Seams */}
          <path d="M 250 145 L 250 285" stroke={isDarkColor ? '#1E293B' : '#94A3B8'} strokeWidth="1.5" />
          <path d="M 250 145 C 200 170, 160 220, 140 280" stroke={isDarkColor ? '#1E293B' : '#94A3B8'} strokeWidth="1.5" />
          <path d="M 250 145 C 300 170, 340 220, 360 280" stroke={isDarkColor ? '#1E293B' : '#94A3B8'} strokeWidth="1.5" />

          {/* Top Squatchee Button */}
          <ellipse cx="250" cy="145" rx="14" ry="7" fill={colorHex} stroke="#334155" strokeWidth="1.5" />

          {/* Eyelets (ventilation holes) */}
          <circle cx="205" cy="195" r="4" fill="#000000" stroke="#475569" strokeWidth="1" />
          <circle cx="295" cy="195" r="4" fill="#000000" stroke="#475569" strokeWidth="1" />

          {/* Printable Area & Design Placement */}
          <g>
            {showBoundaryGuide && (
              <rect
                x="180"
                y="200"
                width="140"
                height="80"
                rx="6"
                fill="none"
                stroke="#0066FF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            )}

            {designUrl && (
              <g
                transform={`translate(${250 + (positionX * 0.7)}, ${240 + (positionY * 0.5)}) rotate(${rotation}) scale(${isFlipped ? -designScale * 0.75 : designScale * 0.75}, ${designScale * 0.75}) translate(-65, -50)`}
              >
                <image
                  href={designUrl}
                  x="0"
                  y="0"
                  width="130"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none drop-shadow-md"
                />
              </g>
            )}
          </g>
        </svg>
      );
    }

    if (productType === 'hoodies' || productType === 'prod_hoodie') {
      return (
        <svg viewBox="0 0 500 500" className="w-full h-full max-h-[380px] drop-shadow-2xl mx-auto select-none">
          <defs>
            <radialGradient id="hoodieBodyGrad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor={isDarkColor ? '#1E293B' : '#FFFFFF'} stopOpacity="0.3" />
              <stop offset="60%" stopColor={colorHex} />
              <stop offset="100%" stopColor={shadowColor} stopOpacity="0.95" />
            </radialGradient>
            <clipPath id="hoodiePrintClip">
              <path d="M 170 150 L 330 150 L 345 370 L 155 370 Z" />
            </clipPath>
          </defs>

          {/* Shadow */}
          <ellipse cx="250" cy="460" rx="180" ry="20" fill="#000000" opacity="0.8" filter="blur(14px)" />

          {/* Hoodie Body Base */}
          <path
            d="M 180 85 L 120 130 L 70 230 L 120 250 L 140 180 L 140 430 L 360 430 L 360 180 L 380 250 L 430 230 L 380 130 L 320 85 Z"
            fill="url(#hoodieBodyGrad)"
            stroke={isDarkColor ? '#1E293B' : '#CBD5E1'}
            strokeWidth="2"
          />

          {/* Kangaroo Pocket */}
          <path
            d="M 180 330 L 320 330 L 340 400 L 160 400 Z"
            fill={colorHex}
            stroke={isDarkColor ? '#334155' : '#94A3B8'}
            strokeWidth="2"
          />

          {/* 3-Panel Hood */}
          <path
            d="M 180 85 C 160 40, 340 40, 320 85 C 310 130, 190 130, 180 85 Z"
            fill={isDarkColor ? '#0B0F17' : '#E2E8F0'}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Drawstrings */}
          <path d="M 225 115 L 220 190" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 275 115 L 280 190" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Printable Area & Design */}
          <g clipPath="url(#hoodiePrintClip)">
            {showBoundaryGuide && (
              <rect
                x="175"
                y="155"
                width="150"
                height="160"
                rx="6"
                fill="none"
                stroke="#0066FF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            )}

            {designUrl && (
              <g
                transform={`translate(${250 + (positionX * 0.8)}, ${230 + (positionY * 0.7)}) rotate(${rotation}) scale(${isFlipped ? -designScale : designScale}, ${designScale}) translate(-75, -80)`}
              >
                <image
                  href={designUrl}
                  x="0"
                  y="0"
                  width="150"
                  height="160"
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none drop-shadow-md"
                />
              </g>
            )}
          </g>
        </svg>
      );
    }

    // Default: Premium Classic T-Shirt Mockup
    return (
      <svg viewBox="0 0 500 500" className="w-full h-full max-h-[400px] drop-shadow-2xl mx-auto select-none">
        <defs>
          <radialGradient id="tshirtBodyGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={isDarkColor ? '#1E293B' : '#FFFFFF'} stopOpacity="0.35" />
            <stop offset="50%" stopColor={colorHex} />
            <stop offset="100%" stopColor={shadowColor} stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id="creaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </linearGradient>
          <clipPath id="tshirtPrintClip">
            <path d="M 160 110 L 340 110 L 375 440 L 125 440 Z" />
          </clipPath>
          <clipPath id="leftSleeveClip">
            <path d="M 60 210 L 150 150 L 140 240 L 95 245 Z" />
          </clipPath>
          <clipPath id="rightSleeveClip">
            <path d="M 440 210 L 350 150 L 360 240 L 405 245 Z" />
          </clipPath>
        </defs>

        {/* Ambient Floor Shadow */}
        <ellipse cx="250" cy="455" rx="190" ry="24" fill="#000000" opacity="0.8" filter="blur(16px)" />

        {/* Full T-Shirt Silhouette */}
        <path
          d="M 180 75 
             C 210 95, 290 95, 320 75 
             L 425 125 
             L 445 210 
             L 375 235 
             L 365 440 
             C 365 445, 135 445, 135 440 
             L 125 235 
             L 55 210 
             L 75 125 Z"
          fill="url(#tshirtBodyGrad)"
          stroke={isDarkColor ? '#1E293B' : '#CBD5E1'}
          strokeWidth="2"
        />

        {/* Realistic Fabric Wrinkle Folds */}
        <path d="M 135 240 Q 155 280, 140 330" fill="none" stroke="url(#creaseGrad)" strokeWidth="4" />
        <path d="M 365 240 Q 345 280, 360 330" fill="none" stroke="url(#creaseGrad)" strokeWidth="4" />
        <path d="M 210 95 Q 250 120, 290 95" fill="none" stroke="url(#creaseGrad)" strokeWidth="3" />

        {/* Ribbed Crewneck Collar */}
        <path
          d="M 180 75 C 205 110, 295 110, 320 75 C 300 95, 200 95, 180 75 Z"
          fill={isDarkColor ? '#0B0F17' : '#E2E8F0'}
          stroke={isDarkColor ? '#334155' : '#94A3B8'}
          strokeWidth="1.5"
        />

        {/* Inner Label Tag Mockup */}
        <rect x="235" y="85" width="30" height="18" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="0.8" opacity="0.8" />
        <text x="250" y="97" fill="#64748B" fontSize="6" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">DTF M</text>

        {/* Front / Back Printable Area */}
        {(location === 'front' || location === 'back') && (
          <g clipPath="url(#tshirtPrintClip)">
            {showBoundaryGuide && (
              <rect
                x="165"
                y="125"
                width="170"
                height="220"
                rx="6"
                fill="none"
                stroke="#0066FF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.85"
              />
            )}

            {designUrl && (
              <g
                transform={`translate(${250 + (positionX * 0.9)}, ${235 + (positionY * 0.9)}) rotate(${rotation}) scale(${isFlipped ? -designScale : designScale}, ${designScale}) translate(-85, -95)`}
              >
                <image
                  href={designUrl}
                  x="0"
                  y="0"
                  width="170"
                  height="190"
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none drop-shadow-xl"
                />
              </g>
            )}
          </g>
        )}

        {/* Left Sleeve Print Location */}
        {location === 'left_sleeve' && (
          <g clipPath="url(#leftSleeveClip)">
            {showBoundaryGuide && (
              <circle cx="105" cy="195" r="30" fill="none" stroke="#0066FF" strokeWidth="1.5" strokeDasharray="3 3" />
            )}
            {designUrl && (
              <g
                transform={`translate(${105 + positionX * 0.3}, ${195 + positionY * 0.3}) rotate(${rotation}) scale(${designScale * 0.5}) translate(-50, -50)`}
              >
                <image href={designUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
              </g>
            )}
          </g>
        )}

        {/* Right Sleeve Print Location */}
        {location === 'right_sleeve' && (
          <g clipPath="url(#rightSleeveClip)">
            {showBoundaryGuide && (
              <circle cx="395" cy="195" r="30" fill="none" stroke="#0066FF" strokeWidth="1.5" strokeDasharray="3 3" />
            )}
            {designUrl && (
              <g
                transform={`translate(${395 + positionX * 0.3}, ${195 + positionY * 0.3}) rotate(${rotation}) scale(${designScale * 0.5}) translate(-50, -50)`}
              >
                <image href={designUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
              </g>
            )}
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-radial-blue rounded-2xl ${className}`}>
      {/* Dynamic Blue ambient backdrop light */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      {/* Render Product Mockup SVG */}
      <div className="relative w-full h-full flex items-center justify-center p-2 z-10">
        {renderProductSvg()}

        {/* Interactive Bounding Box Overlays (as in screenshot #3) */}
        {interactive && designUrl && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 rounded-sm"
            style={{
              width: `${Math.min(220, Math.max(80, 160 * designScale))}px`,
              height: `${Math.min(260, Math.max(90, 180 * designScale))}px`,
              transform: `translate(${positionX * 0.9}px, ${positionY * 0.9}px) rotate(${rotation}deg)`,
              transition: 'none',
            }}
          >
            {/* 8 Anchor Corner & Edge Nodes */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />

            {/* Bottom Rotate Pivot Node */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-0.5 h-4 bg-blue-500" />
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg text-[10px] font-bold">
                🔄
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
