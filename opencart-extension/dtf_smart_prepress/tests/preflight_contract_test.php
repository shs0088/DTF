<?php
require_once __DIR__ . '/../upload/extension/dtf_smart_prepress/system/library/dtf_smart_prepress/contracts.php';
require_once __DIR__ . '/../upload/extension/dtf_smart_prepress/system/library/dtf_smart_prepress/preflight.php';

use Opencart\System\Library\DtfSmartPrepress\Contracts;
use Opencart\System\Library\DtfSmartPrepress\Preflight;

$engine = new Preflight();

$hard = $engine->analyze([
 'effectivePpi'=>300,'hasAlpha'=>true,'edgeClass'=>'hard-edge','minStrokePx'=>3,'chokeMm'=>0.15,
 'artworkClass'=>'pixel-art','scaleFactor'=>2.0,'embeddedProfile'=>'sRGB IEC61966-2.1','targetProfile'=>'DTF-RIP-ICC'
]);
assert(abs(Contracts::pixelsToMm(2,300)-0.1693333333)<0.0001);
assert($hard['decision']['alphaPolicy']==='threshold-hard-edge');
assert($hard['resamplingDecision']['recommendedMode']==='nearest-neighbor');
assert($hard['colorManagementReport']['silentProfileConversionAllowed']===false);

$soft = $engine->analyze([
 'effectivePpi'=>300,'hasAlpha'=>true,'edgeClass'=>'soft-intentional','trimapAvailable'=>true,
 'edgeColorContamination'=>true,'suspectedMatteColor'=>'white','artworkClass'=>'illustration','scaleFactor'=>1.5,
 'brisqueScore'=>42.0,'psfConfidence'=>0.85,'hausdorffDeltaPx'=>0.4,
 'sampleWidthMm'=>406.4,'sourceWidthPx'=>4800,'previewFilter'=>'smart-bicubic','previewMipBias'=>0.0,
 'mapSemantic'=>'cutout','inputColorSpace'=>'raw','workingColorSpace'=>'linear',
 'aiEdited'=>true,'generationModel'=>'reference-image-editor','referenceCount'=>2,
 'identitySimilarity'=>0.97,'textIntegrity'=>0.96,'editMaskLeakage'=>0.03,
 'alphaSad'=>3.2,'alphaMse'=>0.004,'alphaGradientError'=>1.1,'alphaConnectivityError'=>0.7,
 'transparentPaddingMm'=>0.20,'requestedSpreadMm'=>0.30,
 'sourceBitDepth'=>16,'targetBitDepth'=>8,'layerDither'=>true,'textDither'=>false,'maskDither'=>true,
 'resamplingFilter'=>'lanczos','resizeBlockingScore'=>0.1,'resizeRingingScore'=>0.2,'resizeAliasingScore'=>0.15,'resizeBlurScore'=>0.1,
 'blurMechanism'=>'motion','outputRenderingIntent'=>'relative-colorimetric','outputProfileEmbedded'=>true,
 'underbaseIntent'=>'intentional-tonal','underbaseOpacityZones'=>[30,50,100],
 'halftoneMinTonePercent'=>15,'creativeHalftoneMinDotMm'=>0.3,'chokeSource'=>'prepress','ripChokeEnabled'=>true,
 'authoringApp'=>'canva','canvasWidthPx'=>4000,'canvasHeightPx'=>5000,
 'exportWidthPx'=>2000,'exportHeightPx'=>2400,'exportFormat'=>'png','exportHasTransparency'=>false
]);
assert($soft['decision']['alphaPolicy']==='preserve-continuous');
assert($soft['edgeCleanupDecision']['mode']==='remove-white-matte');
assert($soft['edgeCleanupDecision']['globalEdgeErosionAllowed']===false);
assert($soft['mattingDecision']['foregroundColorEstimationRecommended']===true);
assert($soft['mattingDecision']['naiveRgbTimesAlphaAllowed']===false);
assert($soft['resamplingDecision']['recommendedMode']==='detail-preserving-upscale');
assert($soft['qualityDiagnostics']['brisqueMayAcceptOrRejectPrintMaster']===false);
assert(abs($soft['physicalSamplingReport']['derivedPpi']-300.0)<0.001);
assert($soft['physicalSamplingReport']['printMasterQualityMayBeJudgedFromRenderedPreview']===false);
assert($soft['mapSemanticReport']['colorPolicy']==='raw-data');
assert($soft['mapSemanticReport']['scalarMapGammaConversionAllowed']===false);
assert($soft['mapSemanticReport']['cutoutRequiresBinaryIntent']===true);
assert($soft['underbaseIntentReport']['tonalUnderbaseAllowed']===true);
assert($soft['underbaseIntentReport']['binaryAlphaFlatteningAllowed']===false);
assert($soft['halftonePrintabilityReport']['ripOwnsScreenGeometry']===true);
assert($soft['chokeOwnershipReport']['doubleChokeDetected']===true);
assert(in_array('DOUBLE_CHOKE_RISK', array_column($soft['warnings'],'code'), true));
assert($soft['resamplingArtifactReport']['artifactFamiliesMustBeMeasuredSeparately']===true);
assert($soft['blurMechanismReport']['motionBlurIsDiffusion']===false);
assert($soft['blurMechanismReport']['diffusionDeblurEligible']===false);
assert($soft['outputColorHandoffReport']['displayProofMaySubstituteExportTransform']===false);
assert($soft['precisionConversionReport']['precisionReduction']===true);
assert($soft['precisionConversionReport']['maskDitherRequiresExplicitIntent']===true);
assert($soft['precisionConversionReport']['textDitherDefaultAllowed']===false);
assert(in_array('ALPHA_MASK_DITHER_ON_PRECISION_REDUCTION', array_column($soft['warnings'],'code'), true));
assert($soft['alphaMattingQualityReport']['multiMetricRequired']===true);
assert($soft['alphaMattingQualityReport']['singleMetricMayAcceptMaster']===false);
assert($soft['underbaseCanvasSafetyReport']['spreadFitsCanvas']===false);
assert(in_array('UNDERBASE_SPREAD_CLIPPED_BY_CANVAS', array_column($soft['warnings'],'code'), true));
assert($soft['authoringExportIntegrityReport']['exportMustBeRepreflighted']===true);
assert($soft['authoringExportIntegrityReport']['sourceCanvasMayBeUsedAsPrintResolutionEvidence']===false);
assert($soft['authoringExportIntegrityReport']['scaleOrAspectMismatch']===true);
assert(in_array('EXPORT_TRANSPARENCY_LOST', array_column($soft['warnings'],'code'), true));
assert($soft['aiGenerationIntegrityReport']['requiresSourceComparison']===true);
assert($soft['aiGenerationIntegrityReport']['requiresAlphaReinspection']===true);
assert($soft['aiGenerationIntegrityReport']['mayReplaceOriginalPrintMasterWithoutQa']===false);
assert(in_array('AI_EDIT_INTEGRITY_REVIEW_REQUIRED', array_column($soft['warnings'],'code'), true));
assert($soft['provenance']['mockupMayReplaceMaster']===false);

echo "PASS\n";
