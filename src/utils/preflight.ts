/**
 * DTF Studio Jordan - Automated Print-Preflight Engine (Step 4A-Correction)
 * 
 * Strict Numeric Ready-to-Print & Designer Qualification Rules:
 * 1. Effective DPI = pixel dimension ÷ final physical dimension in inches.
 *    (Final physical dimension in inches = target physical dimension in cm ÷ 2.54)
 * 2. Final physical dimensions must be calculated from the requested print size in cm.
 * 3. Minimum effective resolution = 300 DPI at the intended final physical size.
 * 4. Shows actual calculated DPI and required DPI (300 DPI).
 * 5. Shows actual pixel dimensions and minimum required pixel dimensions (ceil(targetCm / 2.54 * 300)).
 * 6. Shows actual physical dimensions in cm and allowed maximum (Max 38.0 × 48.0 cm).
 * 7. Maximum approved physical print area is 38.0 × 48.0 cm.
 * 8. Enlargement quality evaluated strictly from available pixels and intended physical size, not DPI metadata alone.
 * 9. Alpha transparency checked on designated Ready-to-Print Master.
 * 10. ONLY the designated Ready-to-Print Master is subject to these print-preflight rules.
 * 11. PSD, AI, SVG and presentation files remain supporting assets unless explicitly designated as Master.
 * 12. Stores calculated results and failure reasons against the correct Design ID / Asset ID.
 */

export interface PreflightInput {
  fileName?: string;
  format?: string;
  url?: string;
  widthPx: number;
  heightPx: number;
  dpiMetadata?: number;
  hasTransparency: boolean;
  targetWidthCm: number;
  targetHeightCm: number;
  isReadyToPrintMaster: boolean;
  assetType?: string;
}

export interface PreflightCriterionResult {
  code: 'PHYSICAL_SIZE' | 'FORMAT' | 'TRANSPARENCY' | 'EFFECTIVE_RESOLUTION';
  name: string;
  nameAr: string;
  passed: boolean;
  actualValue: string | number;
  requiredValue: string | number;
  messageEn: string;
  messageAr: string;
}

export interface PreflightEvaluation {
  passed: boolean;
  score: number; // 0-100
  effectiveDpi: number;
  requiredDpi: number; // 300
  actualWidthPx: number;
  actualHeightPx: number;
  requiredWidthPx: number;
  requiredHeightPx: number;
  targetWidthCm: number;
  targetHeightCm: number;
  maxAllowedWidthCm: number; // 38.0 cm
  maxAllowedHeightCm: number; // 48.0 cm
  hasTransparency: boolean;
  isReadyToPrintMaster: boolean;
  criteria: PreflightCriterionResult[];
  failedReasonsEn: string[];
  failedReasonsAr: string[];
  rejectionReason: string | null;
  rejectionReasonAr: string | null;
  notesEn: string;
  notesAr: string;
}

/**
 * Calculates physical dimensions in inches and required pixels at 300 DPI.
 * Formula: Required Pixels = ceil((Target Physical Dimension in cm ÷ 2.54) × 300)
 */
export function calculateRequiredPixels(widthCm: number, heightCm: number, dpi: number = 300): { requiredWidthPx: number; requiredHeightPx: number } {
  const widthInches = widthCm > 0 ? widthCm / 2.54 : 0;
  const heightInches = heightCm > 0 ? heightCm / 2.54 : 0;
  return {
    requiredWidthPx: Math.ceil(widthInches * dpi),
    requiredHeightPx: Math.ceil(heightInches * dpi),
  };
}

/**
 * Calculates true effective DPI from actual pixel count and target physical print centimeters.
 * Formula:
 *   Physical Dimension in Inches = Target Dimension in cm ÷ 2.54
 *   Effective DPI = Pixel Dimension ÷ Physical Dimension in Inches
 */
export function calculateEffectiveDpi(widthPx: number, heightPx: number, widthCm: number, heightCm: number): {
  effectiveDpiW: number;
  effectiveDpiH: number;
  effectiveDpi: number;
  roundedEffectiveDpi: number;
} {
  const widthInches = widthCm > 0 ? widthCm / 2.54 : 1;
  const heightInches = heightCm > 0 ? heightCm / 2.54 : 1;
  const effectiveDpiW = widthPx / widthInches;
  const effectiveDpiH = heightPx / heightInches;
  const effectiveDpi = Math.min(effectiveDpiW, effectiveDpiH);
  return {
    effectiveDpiW,
    effectiveDpiH,
    effectiveDpi,
    roundedEffectiveDpi: Math.round(effectiveDpi),
  };
}

/**
 * Evaluates print preflight criteria on a candidate design file or asset.
 * Maximum approved physical print area: 38.0 × 48.0 cm.
 * Minimum required effective resolution: 300 DPI.
 */
export function evaluatePrintPreflight(input: PreflightInput): PreflightEvaluation {
  const MAX_WIDTH_CM = 38.0;
  const MAX_HEIGHT_CM = 48.0;
  const REQUIRED_DPI = 300;

  // Non-master assets (source PSD/AI, presentation catalog photos, vector files) are exempt from master criteria
  const isMaster = input.isReadyToPrintMaster || input.assetType === 'ready_to_print_master';

  if (!isMaster) {
    return {
      passed: true,
      score: 100,
      effectiveDpi: input.dpiMetadata || 300,
      requiredDpi: REQUIRED_DPI,
      actualWidthPx: input.widthPx || 1000,
      actualHeightPx: input.heightPx || 1000,
      requiredWidthPx: 0,
      requiredHeightPx: 0,
      targetWidthCm: input.targetWidthCm || 30,
      targetHeightCm: input.targetHeightCm || 38,
      maxAllowedWidthCm: MAX_WIDTH_CM,
      maxAllowedHeightCm: MAX_HEIGHT_CM,
      hasTransparency: input.hasTransparency ?? true,
      isReadyToPrintMaster: false,
      criteria: [],
      failedReasonsEn: [],
      failedReasonsAr: [],
      rejectionReason: null,
      rejectionReasonAr: null,
      notesEn: 'Non-master supporting / presentation asset (Exempt from 300 DPI master criteria).',
      notesAr: 'ملف عرض تقديمي أو ملف مصدري داعم (معفى من معايير ماستر الطباعة 300 DPI).',
    };
  }

  const targetW = Number(input.targetWidthCm) || 0;
  const targetH = Number(input.targetHeightCm) || 0;
  const actualW = Number(input.widthPx) || 0;
  const actualH = Number(input.heightPx) || 0;

  const { requiredWidthPx, requiredHeightPx } = calculateRequiredPixels(targetW, targetH, REQUIRED_DPI);
  const { effectiveDpi, roundedEffectiveDpi } = calculateEffectiveDpi(actualW, actualH, targetW, targetH);

  const criteriaResults: PreflightCriterionResult[] = [];
  const failedReasonsEn: string[] = [];
  const failedReasonsAr: string[] = [];

  // 1. Target Physical Dimensions Check (Max Approved Area: 38.0 × 48.0 cm)
  const physicalSizeValid = targetW > 0 && targetH > 0 && targetW <= MAX_WIDTH_CM && targetH <= MAX_HEIGHT_CM;
  if (!physicalSizeValid) {
    let msgEn = '';
    let msgAr = '';
    if (targetW <= 0 || targetH <= 0) {
      msgEn = `Physical dimensions: ${targetW}×${targetH} cm | Required: > 0 cm (Max ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} cm) | Result: REJECTED`;
      msgAr = `المقاس الفعلي: ${targetW}×${targetH} سم | المطلوب: أكبر من 0 سم (الحد الأقصى ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} سم) | النتيجة: مرفوض`;
    } else {
      msgEn = `Physical dimensions: ${targetW}×${targetH} cm | Allowed maximum: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} cm | Result: REJECTED`;
      msgAr = `المقاس الفعلي: ${targetW}×${targetH} سم | الحد الأقصى المسموح: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} سم | النتيجة: مرفوض`;
    }
    failedReasonsEn.push(msgEn);
    failedReasonsAr.push(msgAr);
    criteriaResults.push({
      code: 'PHYSICAL_SIZE',
      name: 'Physical Print Dimensions',
      nameAr: 'المقاس الفعلي للطباعة بالسم',
      passed: false,
      actualValue: `${targetW} × ${targetH} cm`,
      requiredValue: `Max ${MAX_WIDTH_CM} × ${MAX_HEIGHT_CM} cm`,
      messageEn: msgEn,
      messageAr: msgAr,
    });
  } else {
    criteriaResults.push({
      code: 'PHYSICAL_SIZE',
      name: 'Physical Print Dimensions',
      nameAr: 'المقاس الفعلي للطباعة بالسم',
      passed: true,
      actualValue: `${targetW} × ${targetH} cm`,
      requiredValue: `Max ${MAX_WIDTH_CM} × ${MAX_HEIGHT_CM} cm`,
      messageEn: `Physical dimensions: ${targetW}×${targetH} cm | Allowed maximum: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} cm | Result: PASSED`,
      messageAr: `المقاس الفعلي: ${targetW}×${targetH} سم | الحد الأقصى: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} سم | النتيجة: مقبول`,
    });
  }

  // 2. File Format Check (Must be transparent PNG)
  const fileNameLower = (input.fileName || '').toLowerCase();
  const formatLower = (input.format || '').toLowerCase();
  const isPng = fileNameLower.endsWith('.png') || formatLower === 'png' || (input.url && input.url.startsWith('data:image/png'));
  if (!isPng) {
    const ext = formatLower || (fileNameLower.includes('.') ? fileNameLower.split('.').pop() : 'unknown');
    const msgEn = `Master format: .${ext} | Required: .png (Transparent PNG) | Result: REJECTED`;
    const msgAr = `صيغة ماستر الطباعة: .${ext} | المطلوب: .png (خلفية شفافة) | النتيجة: مرفوض`;
    failedReasonsEn.push(msgEn);
    failedReasonsAr.push(msgAr);
    criteriaResults.push({
      code: 'FORMAT',
      name: 'File Format',
      nameAr: 'صيغة الملف',
      passed: false,
      actualValue: `.${ext}`,
      requiredValue: '.png (Transparent PNG)',
      messageEn: msgEn,
      messageAr: msgAr,
    });
  } else {
    criteriaResults.push({
      code: 'FORMAT',
      name: 'File Format',
      nameAr: 'صيغة الملف',
      passed: true,
      actualValue: '.png',
      requiredValue: '.png (Transparent PNG)',
      messageEn: 'Master format: .png | Required: .png (Transparent PNG) | Result: PASSED',
      messageAr: 'صيغة ماستر الطباعة: .png | المطلوب: .png (خلفية شفافة) | النتيجة: مقبول',
    });
  }

  // 3. Alpha Transparency Check
  if (!input.hasTransparency) {
    const msgEn = 'Alpha transparency: Opaque / solid background | Required: Transparent alpha channel | Result: REJECTED';
    const msgAr = 'قناة الشفافية: خلفية معتمة مصمتة | المطلوب: قناة ألفا شفافة معزولة | النتيجة: مرفوض';
    failedReasonsEn.push(msgEn);
    failedReasonsAr.push(msgAr);
    criteriaResults.push({
      code: 'TRANSPARENCY',
      name: 'Alpha Channel Transparency',
      nameAr: 'خلفية ألفا الشفافة',
      passed: false,
      actualValue: 'Opaque / Solid Background',
      requiredValue: 'Transparent Alpha Channel',
      messageEn: msgEn,
      messageAr: msgAr,
    });
  } else {
    criteriaResults.push({
      code: 'TRANSPARENCY',
      name: 'Alpha Channel Transparency',
      nameAr: 'خلفية ألفا الشفافة',
      passed: true,
      actualValue: 'Transparent Alpha Channel',
      requiredValue: 'Transparent Alpha Channel',
      messageEn: 'Alpha transparency: Clean transparent background | Required: Transparent alpha channel | Result: PASSED',
      messageAr: 'قناة الشفافية: خلفية شفافة معزولة 100% | المطلوب: قناة ألفا شفافة | النتيجة: مقبول',
    });
  }

  // 4. Minimum Effective Resolution & Enlargement Quality Check (300 DPI at intended physical print size)
  const isResolutionPassing = roundedEffectiveDpi >= REQUIRED_DPI && actualW >= requiredWidthPx && actualH >= requiredHeightPx;
  if (!isResolutionPassing) {
    const msgEn = `Effective resolution: ${roundedEffectiveDpi} DPI | Required: ${REQUIRED_DPI} DPI (Actual pixels: ${actualW}×${actualH} px; Minimum required: ${requiredWidthPx}×${requiredHeightPx} px for ${targetW}×${targetH} cm) | Result: REJECTED`;
    const msgAr = `الدقة الفعلية: ${roundedEffectiveDpi} DPI | المطلوب: ${REQUIRED_DPI} DPI (البكسل الفعلي: ${actualW}×${actualH} بكسل؛ الحد الأدنى المطلوب: ${requiredWidthPx}×${requiredHeightPx} بكسل لمقاس ${targetW}×${targetH} سم) | النتيجة: مرفوض`;
    failedReasonsEn.push(msgEn);
    failedReasonsAr.push(msgAr);
    criteriaResults.push({
      code: 'EFFECTIVE_RESOLUTION',
      name: 'Effective Resolution (300 DPI)',
      nameAr: 'الدقة الفعلية وجودة التكبير (300 DPI)',
      passed: false,
      actualValue: `${roundedEffectiveDpi} DPI (${actualW} × ${actualH} px)`,
      requiredValue: `${REQUIRED_DPI} DPI (≥ ${requiredWidthPx} × ${requiredHeightPx} px for ${targetW} × ${targetH} cm)`,
      messageEn: msgEn,
      messageAr: msgAr,
    });
  } else {
    criteriaResults.push({
      code: 'EFFECTIVE_RESOLUTION',
      name: 'Effective Resolution (300 DPI)',
      nameAr: 'الدقة الفعلية وجودة التكبير (300 DPI)',
      passed: true,
      actualValue: `${roundedEffectiveDpi} DPI (${actualW} × ${actualH} px)`,
      requiredValue: `${REQUIRED_DPI} DPI (≥ ${requiredWidthPx} × ${requiredHeightPx} px)`,
      messageEn: `Effective resolution: ${roundedEffectiveDpi} DPI | Required: ${REQUIRED_DPI} DPI (Actual pixels: ${actualW}×${actualH} px meets required ${requiredWidthPx}×${requiredHeightPx} px for ${targetW}×${targetH} cm) | Result: PASSED`,
      messageAr: `الدقة الفعلية: ${roundedEffectiveDpi} DPI | المطلوب: ${REQUIRED_DPI} DPI (البكسل الفعلي: ${actualW}×${actualH} بكسل يلبي الحد الأدنى ${requiredWidthPx}×${requiredHeightPx} بكسل لمقاس ${targetW}×${targetH} سم) | النتيجة: مقبول`,
    });
  }

  const passed = failedReasonsEn.length === 0;
  const score = passed ? 98 : Math.max(15, 100 - failedReasonsEn.length * 28);

  const notesEn = passed
    ? `Passed automated DTF preflight check: Certified 300 DPI (${roundedEffectiveDpi} DPI effective) transparent master for ${targetW}×${targetH} cm print (Max area: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} cm).`
    : `Preflight REJECTED (${failedReasonsEn.length} failed criteria): ${failedReasonsEn.join('; ')}`;

  const notesAr = passed
    ? `اجتاز الفحص الفني الآلي لطباعة DTF: معتمد بدقة 300 DPI (${roundedEffectiveDpi} DPI فعلي) مع خلفية شفافة لمقاس ${targetW}×${targetH} سم (الحد الأقصى: ${MAX_WIDTH_CM}×${MAX_HEIGHT_CM} سم).`
    : `تم رفض الفحص الفني (${failedReasonsAr.length} معايير غير مطابقة): ${failedReasonsAr.join('؛ ')}`;

  return {
    passed,
    score,
    effectiveDpi: roundedEffectiveDpi,
    requiredDpi: REQUIRED_DPI,
    actualWidthPx: actualW,
    actualHeightPx: actualH,
    requiredWidthPx,
    requiredHeightPx,
    targetWidthCm: targetW,
    targetHeightCm: targetH,
    maxAllowedWidthCm: MAX_WIDTH_CM,
    maxAllowedHeightCm: MAX_HEIGHT_CM,
    hasTransparency: input.hasTransparency,
    isReadyToPrintMaster: true,
    criteria: criteriaResults,
    failedReasonsEn,
    failedReasonsAr,
    rejectionReason: passed ? null : failedReasonsEn.join('; '),
    rejectionReasonAr: passed ? null : failedReasonsAr.join('؛ '),
    notesEn,
    notesAr,
  };
}

