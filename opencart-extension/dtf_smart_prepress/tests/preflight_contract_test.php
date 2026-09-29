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
 'alphaStorageMode'=>'straight','filteringWorkingTransfer'=>'srgb-encoded','premultiplyBeforeFiltering'=>false,'transparentRgbPolicy'=>'preserve',
 'sourceImageState'=>'output-referred','iccProfileClass'=>'generic','dotGainPercent'=>18,'measuredWhitePoint'=>'D50',
 'totalInkLimitPercent'=>240,'halftoneAlgorithm'=>'error-diffusion','dotPlacementCalibrated'=>false,'bandingRiskScore'=>0.25,
 'coarseSegmentationUsed'=>true,'localBoundaryRefinement'=>true,'boundaryRefinementBandPx'=>8,'orientationAwareInterpolation'=>true,
 'deviceHandoffRequired'=>true,'deviceRasterDpiX'=>1440,'deviceRasterDpiY'=>720,'deviceBitsPerColor'=>2,'deviceBitsPerPixel'=>12,
 'deviceColorOrder'=>'banded','deviceColorSpace'=>'DeviceN','deviceNumColors'=>6,'deviceSeparations'=>true,'deviceBytesPerLine'=>8192,'deviceProtocol'=>'ESC/P2',
 'printerPlanes'=>6,'printerPlaneOrder'=>['W','K','C','M','Y'],'weaveMode'=>'softweave','dotRowStep'=>2,'dotColStep'=>1,'dotRowFeed'=>4,'printDirection'=>'bidirectional',
 'spotWhiteRequiredByRip'=>true,'spotWhitePresent'=>true,'whiteChannelName'=>'W1','spotChannelPolarity'=>'unknown','alphaCopiedToSpot'=>true,'alphaDeletedAfterSpotCopy'=>false,
 'ripOutputContainer'=>'TIFF','physicalSizeMetadataPreserved'=>true,'dpiMetadataPreserved'=>false,'whiteCoveragePercent'=>62.5,'whiteAverageDensity'=>0.74,
 'proofProfile'=>'DTF-proof.icc','proofRenderingIntent'=>'relative-colorimetric','deviceLinkProfile'=>'DTF-device-link.icc','softProofEnabled'=>true,'rawTechCheckAvailable'=>true,
 'processingScope'=>'image-pre-rip','ripOwnsPrintExecution'=>true,'sourceImageWidthPx'=>2000,'sourceImageHeightPx'=>2400,
 'backgroundRemovalProvider'=>'photoroom','backgroundRemovalModel'=>'segment-v1','rawSegmentationMaskAvailable'=>true,'mattingApplied'=>true,
 'foregroundColorReconstruction'=>true,'edgeDecontaminationApplied'=>true,'backgroundRemovalUncertainty'=>0.08,
 'originalAlphaPresentBeforeAi'=>true,'originalAlphaAction'=>'replace','maskSource'=>'ai-selection','maskPolarity'=>'unknown','maskWidthPx'=>1024,'maskHeightPx'=>1024,
 'maskQualityPredictedIou'=>0.91,'maskStabilityScore'=>0.96,'aiEditUsed'=>true,'aiProvider'=>'firefly','aiModelName'=>'fill-expand','aiEditType'=>'masked-generative-fill',
 'aiReferenceCount'=>2,'aiSeed'=>'12345','outsideMaskChanged'=>true,'generatedPixelFraction'=>0.12,'containsTextOrLogo'=>true,'textLogoIntegrityVerified'=>false,
 'aiUpscaleUsed'=>true,'aiUpscaleModel'=>'preserve-details-2','aiUpscaleScale'=>2.0,'aiUpscaleAlphaPreserved'=>false,
 'inpaintUsed'=>true,'inpaintMaskHasGray'=>true,'inpaintMaskExpandedPercent'=>15,'unmaskedRegionPreserved'=>false,'inpaintContextExpansionPx'=>64,
 'aiModelLicenses'=>[
   ['name'=>'BiRefNet','license'=>'MIT','commercialUseAllowed'=>true,'source'=>'upstream'],
   ['name'=>'RMBG-1.4','license'=>'BRIA non-commercial','commercialUseAllowed'=>false,'source'=>'model-card']
 ],
 'aiUpscaleDetailPolicy'=>'creative-add','maskThresholdMethod'=>'adaptive','maskThresholdSensitivity'=>0.45,'maskForegroundPolarity'=>'bright',
 'guidedAlphaRefinementApplied'=>true,'guidedAlphaGuide'=>'source-rgb','despillOrDecontaminateColor'=>'green',
 'opaqueSubjectDeltaE'=>4.2,'opaqueSubjectDeltaEThreshold'=>2.0,'restorationAlgorithm'=>'lucy-richardson','restorationPsfKnown'=>false,
 'restorationNoiseModelKnown'=>false,'denoiseStage'=>'post-enhancement',
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
assert($soft['aiModelLicenseReport']['commercialUseBlocked']===true);
assert(in_array('AI_MODEL_LICENSE_NOT_COMMERCIAL', array_column($soft['errors'],'code'), true));
assert($soft['deterministicImageRefinementReport']['guidedAlphaRefinementApplied']===true);
assert($soft['deterministicImageRefinementReport']['softAlphaShouldNotBeBinarizedByDefault']===true);
assert(in_array('SOFT_ALPHA_BINARIZATION_RISK', array_column($soft['warnings'],'code'), true));
assert($soft['edgeColorPreservationReport']['opaqueSubjectColorMustBeProtected']===true);
assert(in_array('DESPILL_CHANGED_OPAQUE_SUBJECT_COLOR', array_column($soft['warnings'],'code'), true));
assert($soft['restorationAlgorithmEvidenceReport']['deconvolutionRequiresPsfEvidence']===true);
assert(in_array('DECONVOLUTION_WITHOUT_PSF_EVIDENCE', array_column($soft['warnings'],'code'), true));
assert(in_array('DENOISE_AFTER_ENHANCEMENT_RISK', array_column($soft['warnings'],'code'), true));
assert(in_array('GENERATIVE_UPSCALE_SYNTHETIC_DETAIL', array_column($soft['warnings'],'code'), true));
assert($soft['aiUpscaleIntegrityReport']['detailPolicy']==='creative-add');
assert($soft['imageOnlyRipBoundaryReport']['validatesImagePreparationOnly']===true);
assert($soft['imageOnlyRipBoundaryReport']['ripOwnsPrintExecution']===true);
assert($soft['backgroundRemovalIntegrityReport']['segmentationMaskMaySubstituteSoftAlpha']===false);
assert($soft['backgroundRemovalIntegrityReport']['foregroundColorAndAlphaAreSeparateOutputs']===true);
assert($soft['aiMaskSemanticsReport']['matchesSourceDimensions']===false);
assert($soft['aiMaskSemanticsReport']['automaticMaskQualityIsEvidenceNotAcceptance']===true);
assert(in_array('AI_MASK_POLARITY_UNVERIFIED', array_column($soft['warnings'],'code'), true));
assert(in_array('AI_MASK_DIMENSION_MISMATCH', array_column($soft['warnings'],'code'), true));
assert(in_array('ORIGINAL_ALPHA_CHANGED_BY_AI_TOOL', array_column($soft['warnings'],'code'), true));
assert($soft['aiImageEditIntegrityReport']['requiresFullRepreflight']===true);
assert($soft['aiImageEditIntegrityReport']['mayReplaceMasterWithoutQa']===false);
assert(in_array('GENERATIVE_EDIT_REQUIRES_REPREFLIGHT', array_column($soft['warnings'],'code'), true));
assert(in_array('AI_EDIT_CHANGED_OUTSIDE_MASK', array_column($soft['warnings'],'code'), true));
assert(in_array('AI_TEXT_LOGO_INTEGRITY_UNVERIFIED', array_column($soft['warnings'],'code'), true));
assert($soft['aiUpscaleIntegrityReport']['syntheticDetailPossible']===true);
assert(in_array('AI_UPSCALE_ALPHA_NOT_PRESERVED', array_column($soft['warnings'],'code'), true));
assert($soft['inpaintIntegrityReport']['outsideMaskPixelDiffMustBeChecked']===true);
assert(in_array('INPAINT_CHANGED_UNMASKED_REGION', array_column($soft['warnings'],'code'), true));
assert($soft['deviceRasterContractReport']['complete']===true);
assert($soft['deviceRasterContractReport']['fileChannelOrderMaySubstituteDevicePlaneOrder']===false);
assert($soft['printerPlaneAndWeaveReport']['weaveAndHeadGeometryAreDeviceProperties']===true);
assert(in_array('DEVICE_PLANE_ORDER_UNVERIFIED', array_column($soft['warnings'],'code'), true));
assert($soft['ripSpotWhiteHandoffReport']['spotAndAlphaAreSeparateSemantics']===true);
assert($soft['ripSpotWhiteHandoffReport']['masterAlphaMayBeDeletedAfterCopy']===false);
assert(in_array('SPOT_CHANNEL_POLARITY_UNVERIFIED', array_column($soft['warnings'],'code'), true));
assert(in_array('PRINT_MASTER_PHYSICAL_SIZE_METADATA_CHANGED', array_column($soft['warnings'],'code'), true));
assert($soft['productionProofTransformReport']['proofMaySubstituteProductionTransform']===false);
assert($soft['productionProofTransformReport']['rawTechCheckAvailable']===true);
assert($soft['alphaFilteringIntegrityReport']['linearPremultipliedFilteringReady']===false);
assert($soft['alphaFilteringIntegrityReport']['zeroAlphaUnpremultiplyGuardRequired']===true);
assert(in_array('ALPHA_FILTERING_HALO_RISK', array_column($soft['warnings'],'code'), true));
assert(in_array('NONLINEAR_RESAMPLING_COMPOSITE_RISK', array_column($soft['warnings'],'code'), true));
assert($soft['deviceProfileCalibrationReport']['genericProfileMayOnlyApproximateOutput']===true);
assert(in_array('GENERIC_OUTPUT_PROFILE_NEEDS_DEVICE_PROOF', array_column($soft['warnings'],'code'), true));
assert($soft['inkjetProcessReport']['parameterCalibrationRequired']===true);
assert(in_array('HALFTONE_PROCESS_NOT_CALIBRATED', array_column($soft['warnings'],'code'), true));
assert($soft['boundaryRefinementReport']['localBoundaryRefinement']===true);
assert($soft['boundaryRefinementReport']['orientationAwareInterpolation']===true);
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

$missingWhite = $engine->analyze([
 'effectivePpi'=>300,'hasAlpha'=>true,'edgeClass'=>'hard-edge',
 'spotWhiteRequiredByRip'=>true,'spotWhitePresent'=>false
]);
assert($missingWhite['accepted']===false);
assert(in_array('RIP_WHITE_CHANNEL_MISSING', array_column($missingWhite['errors'],'code'), true));

echo "PASS\n";
