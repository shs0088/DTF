<?php
namespace Opencart\System\Library\DtfSmartPrepress;

final class Preflight {
    public function analyze(array $m): array {
        $errors = [];
        $warnings = [];

        $ppi = (float)($m['effectivePpi'] ?? 0);
        $hasAlpha = (bool)($m['hasAlpha'] ?? false);
        $edgeClass = (string)($m['edgeClass'] ?? 'uncertain');
        $minStrokePx = isset($m['minStrokePx']) ? (float)$m['minStrokePx'] : null;
        $chokeMm = isset($m['chokeMm']) ? max(0.0, (float)$m['chokeMm']) : 0.0;
        $blurX = isset($m['blurRadiusX']) ? max(0.0, (float)$m['blurRadiusX']) : null;
        $blurY = isset($m['blurRadiusY']) ? max(0.0, (float)$m['blurRadiusY']) : null;
        $noiseSigma = isset($m['noiseSigma']) ? max(0.0, (float)$m['noiseSigma']) : null;
        $textureScore = isset($m['textureScore']) ? max(0.0, min(1.0, (float)$m['textureScore'])) : null;
        $brisque = isset($m['brisqueScore']) ? max(0.0, min(100.0, (float)$m['brisqueScore'])) : null;
        $trimapAvailable = (bool)($m['trimapAvailable'] ?? false);
        $edgeColorContamination = (bool)($m['edgeColorContamination'] ?? false);
        $psfConfidence = isset($m['psfConfidence']) ? max(0.0, min(1.0, (float)$m['psfConfidence'])) : 0.0;
        $hausdorffDeltaPx = isset($m['hausdorffDeltaPx']) ? max(0.0, (float)$m['hausdorffDeltaPx']) : null;
        $jInvariantLoss = isset($m['jInvariantLoss']) ? max(0.0, (float)$m['jInvariantLoss']) : null;
        $artworkClass = (string)($m['artworkClass'] ?? 'unknown');
        $scaleFactor = isset($m['scaleFactor']) ? max(0.01, (float)$m['scaleFactor']) : 1.0;
        $embeddedProfile = trim((string)($m['embeddedProfile'] ?? ''));
        $targetProfile = trim((string)($m['targetProfile'] ?? ''));
        $matteColor = (string)($m['suspectedMatteColor'] ?? 'unknown');
        $sampleWidthMm = isset($m['sampleWidthMm']) ? max(0.0, (float)$m['sampleWidthMm']) : null;
        $sourceWidthPx = isset($m['sourceWidthPx']) ? max(0, (int)$m['sourceWidthPx']) : null;
        $previewFilter = (string)($m['previewFilter'] ?? 'unknown');
        $previewMipBias = isset($m['previewMipBias']) ? (float)$m['previewMipBias'] : null;
        $mapSemantic = (string)($m['mapSemantic'] ?? 'color');
        $workingColorSpace = trim((string)($m['workingColorSpace'] ?? ''));
        $inputColorSpace = trim((string)($m['inputColorSpace'] ?? ''));
        $aiGenerated = (bool)($m['aiGenerated'] ?? false);
        $aiEdited = (bool)($m['aiEdited'] ?? false);
        $identitySimilarity = isset($m['identitySimilarity']) ? max(0.0, min(1.0, (float)$m['identitySimilarity'])) : null;
        $textIntegrity = isset($m['textIntegrity']) ? max(0.0, min(1.0, (float)$m['textIntegrity'])) : null;
        $editMaskLeakage = isset($m['editMaskLeakage']) ? max(0.0, min(1.0, (float)$m['editMaskLeakage'])) : null;
        $referenceCount = isset($m['referenceCount']) ? max(0, (int)$m['referenceCount']) : 0;
        $generationModel = trim((string)($m['generationModel'] ?? ''));
        $authoringApp = trim((string)($m['authoringApp'] ?? ''));
        $canvasWidthPx = isset($m['canvasWidthPx']) ? max(0, (int)$m['canvasWidthPx']) : null;
        $canvasHeightPx = isset($m['canvasHeightPx']) ? max(0, (int)$m['canvasHeightPx']) : null;
        $exportWidthPx = isset($m['exportWidthPx']) ? max(0, (int)$m['exportWidthPx']) : null;
        $exportHeightPx = isset($m['exportHeightPx']) ? max(0, (int)$m['exportHeightPx']) : null;
        $exportHasTransparency = isset($m['exportHasTransparency']) ? (bool)$m['exportHasTransparency'] : null;
        $exportFormat = strtolower(trim((string)($m['exportFormat'] ?? '')));
        $edgeOrientationDeg = isset($m['edgeOrientationDeg']) ? (float)$m['edgeOrientationDeg'] : null;
        $edgeCoherency = isset($m['edgeCoherency']) ? max(0.0, min(1.0, (float)$m['edgeCoherency'])) : null;
        $ripImageProfile = trim((string)($m['ripImageProfile'] ?? ''));
        $ripVectorProfile = trim((string)($m['ripVectorProfile'] ?? ''));
        $ripTextProfile = trim((string)($m['ripTextProfile'] ?? ''));
        $spotSeparationExpected = (bool)($m['spotSeparationExpected'] ?? false);
        $ripHalftoneMode = trim((string)($m['ripHalftoneMode'] ?? ''));
        $alphaSad = isset($m['alphaSad']) ? max(0.0, (float)$m['alphaSad']) : null;
        $alphaMse = isset($m['alphaMse']) ? max(0.0, (float)$m['alphaMse']) : null;
        $alphaGradientError = isset($m['alphaGradientError']) ? max(0.0, (float)$m['alphaGradientError']) : null;
        $alphaConnectivityError = isset($m['alphaConnectivityError']) ? max(0.0, (float)$m['alphaConnectivityError']) : null;
        $transparentPaddingMm = isset($m['transparentPaddingMm']) ? max(0.0, (float)$m['transparentPaddingMm']) : null;
        $requestedSpreadMm = isset($m['requestedSpreadMm']) ? max(0.0, (float)$m['requestedSpreadMm']) : 0.0;
        $sourceBitDepth = isset($m['sourceBitDepth']) ? max(1, (int)$m['sourceBitDepth']) : null;
        $targetBitDepth = isset($m['targetBitDepth']) ? max(1, (int)$m['targetBitDepth']) : null;
        $layerDither = (bool)($m['layerDither'] ?? false);
        $textDither = (bool)($m['textDither'] ?? false);
        $maskDither = (bool)($m['maskDither'] ?? false);
        $alphaSelectionPreservesPartial = (bool)($m['alphaSelectionPreservesPartial'] ?? true);
        $resizeBlockingScore = isset($m['resizeBlockingScore']) ? max(0.0,(float)$m['resizeBlockingScore']) : null;
        $resizeRingingScore = isset($m['resizeRingingScore']) ? max(0.0,(float)$m['resizeRingingScore']) : null;
        $resizeAliasingScore = isset($m['resizeAliasingScore']) ? max(0.0,(float)$m['resizeAliasingScore']) : null;
        $resizeBlurScore = isset($m['resizeBlurScore']) ? max(0.0,(float)$m['resizeBlurScore']) : null;
        $resamplingFilter = trim((string)($m['resamplingFilter'] ?? ''));
        $blurMechanism = trim((string)($m['blurMechanism'] ?? 'unknown'));
        $outputRenderingIntent = trim((string)($m['outputRenderingIntent'] ?? ''));
        $outputProfileEmbedded = isset($m['outputProfileEmbedded']) ? (bool)$m['outputProfileEmbedded'] : null;
        $underbaseIntent = trim((string)($m['underbaseIntent'] ?? 'binary-production'));
        $underbaseOpacityZones = isset($m['underbaseOpacityZones']) && is_array($m['underbaseOpacityZones']) ? $m['underbaseOpacityZones'] : [];
        $halftoneMinTonePercent = isset($m['halftoneMinTonePercent']) ? max(0.0,min(100.0,(float)$m['halftoneMinTonePercent'])) : null;
        $creativeHalftoneMinDotMm = isset($m['creativeHalftoneMinDotMm']) ? max(0.0,(float)$m['creativeHalftoneMinDotMm']) : null;
        $chokeSource = trim((string)($m['chokeSource'] ?? 'prepress'));
        $ripChokeEnabled = (bool)($m['ripChokeEnabled'] ?? false);
        $alphaStorageMode = trim((string)($m['alphaStorageMode'] ?? 'unknown'));
        $filteringWorkingTransfer = trim((string)($m['filteringWorkingTransfer'] ?? 'unknown'));
        $premultiplyBeforeFiltering = (bool)($m['premultiplyBeforeFiltering'] ?? false);
        $transparentRgbPolicy = trim((string)($m['transparentRgbPolicy'] ?? 'preserve'));
        $sourceImageState = trim((string)($m['sourceImageState'] ?? 'unknown'));
        $iccProfileClass = trim((string)($m['iccProfileClass'] ?? 'unknown'));
        $dotGainPercent = isset($m['dotGainPercent']) ? max(0.0,(float)$m['dotGainPercent']) : null;
        $measuredWhitePoint = trim((string)($m['measuredWhitePoint'] ?? ''));
        $totalInkLimitPercent = isset($m['totalInkLimitPercent']) ? max(0.0,(float)$m['totalInkLimitPercent']) : null;
        $halftoneAlgorithm = trim((string)($m['halftoneAlgorithm'] ?? ''));
        $dotPlacementCalibrated = (bool)($m['dotPlacementCalibrated'] ?? false);
        $bandingRiskScore = isset($m['bandingRiskScore']) ? max(0.0,(float)$m['bandingRiskScore']) : null;
        $coarseSegmentationUsed = (bool)($m['coarseSegmentationUsed'] ?? false);
        $localBoundaryRefinement = (bool)($m['localBoundaryRefinement'] ?? false);
        $boundaryRefinementBandPx = isset($m['boundaryRefinementBandPx']) ? max(0,(int)$m['boundaryRefinementBandPx']) : null;
        $orientationAwareInterpolation = (bool)($m['orientationAwareInterpolation'] ?? false);

        if ($ppi <= 0) {
            $errors[] = ['code'=>'INVALID_EFFECTIVE_PPI','severity'=>'critical'];
        }
        if (!$hasAlpha) {
            $warnings[] = ['code'=>'NO_ALPHA_CHANNEL','severity'=>'warning'];
        }
        if (!in_array($edgeClass, Contracts::EDGE_CLASSES, true)) {
            $errors[] = ['code'=>'INVALID_EDGE_CLASS','severity'=>'critical'];
        }

        $minStrokeMm = null;
        $chokePx = null;
        if ($ppi > 0) {
            $chokePx = Contracts::mmToPixels($chokeMm, $ppi);
            if ($minStrokePx !== null) {
                $minStrokeMm = Contracts::pixelsToMm($minStrokePx, $ppi);
                if ($chokeMm > 0 && $minStrokeMm <= (2.0 * $chokeMm)) {
                    $warnings[] = [
                        'code'=>'STROKE_AT_RISK_AFTER_CHOKE',
                        'severity'=>'warning',
                        'minStrokeMm'=>$minStrokeMm,
                        'chokeMm'=>$chokeMm
                    ];
                }
            }
        }

        $alphaPolicy = match ($edgeClass) {
            'hard-edge' => 'threshold-hard-edge',
            'soft-intentional' => 'preserve-continuous',
            'contaminated' => 'refine-matte',
            default => 'reject-for-review'
        };

        $blurAnisotropy = null;
        if ($blurX !== null && $blurY !== null) {
            $maxBlur = max($blurX, $blurY);
            $blurAnisotropy = $maxBlur > 0 ? abs($blurX - $blurY) / $maxBlur : 0.0;
            if ($blurAnisotropy >= 0.35) {
                $warnings[] = ['code'=>'DIRECTIONAL_BLUR_SUSPECTED','severity'=>'warning','anisotropy'=>$blurAnisotropy];
            }
        }

        $restorationAction = 'none';
        if ($noiseSigma !== null && $noiseSigma > 0) {
            $restorationAction = ($textureScore !== null && $textureScore >= 0.55) ? 'texture-preserving-denoise' : 'conservative-denoise';
        }
        if ($blurAnisotropy !== null && $blurAnisotropy >= 0.35) {
            $restorationAction = 'diagnose-directional-psf-before-deblur';
        }

        $resampling = $this->resamplingDecision($artworkClass, $scaleFactor);
        $aiQaRequired = $aiGenerated || $aiEdited;
        $exportScaleX = ($canvasWidthPx && $exportWidthPx) ? $exportWidthPx / $canvasWidthPx : null;
        $exportScaleY = ($canvasHeightPx && $exportHeightPx) ? $exportHeightPx / $canvasHeightPx : null;
        $exportScaleMismatch = $exportScaleX !== null && $exportScaleY !== null && abs($exportScaleX - $exportScaleY) > 0.001;
        if ($exportScaleMismatch) {
            $warnings[] = ['code'=>'EXPORT_ASPECT_OR_SCALE_MISMATCH','severity'=>'warning'];
        }
        if ($chokeSource === 'prepress' && $ripChokeEnabled) {
            $warnings[] = ['code'=>'DOUBLE_CHOKE_RISK','severity'=>'critical'];
        }
        if ($hasAlpha && $resamplingFilter !== '' && $alphaStorageMode === 'straight' && !$premultiplyBeforeFiltering) {
            $warnings[] = ['code'=>'ALPHA_FILTERING_HALO_RISK','severity'=>'warning'];
        }
        if ($hasAlpha && $resamplingFilter !== '' && $filteringWorkingTransfer !== 'linear') {
            $warnings[] = ['code'=>'NONLINEAR_RESAMPLING_COMPOSITE_RISK','severity'=>'warning','workingTransfer'=>$filteringWorkingTransfer];
        }
        if ($targetProfile !== '' && $iccProfileClass === 'generic') {
            $warnings[] = ['code'=>'GENERIC_OUTPUT_PROFILE_NEEDS_DEVICE_PROOF','severity'=>'warning'];
        }
        if ($halftoneAlgorithm !== '' && !$dotPlacementCalibrated) {
            $warnings[] = ['code'=>'HALFTONE_PROCESS_NOT_CALIBRATED','severity'=>'warning'];
        }
        if ($sourceBitDepth !== null && $targetBitDepth !== null && $targetBitDepth < $sourceBitDepth && $maskDither) {
            $warnings[] = ['code'=>'ALPHA_MASK_DITHER_ON_PRECISION_REDUCTION','severity'=>'warning'];
        }
        if ($transparentPaddingMm !== null && $requestedSpreadMm > $transparentPaddingMm) {
            $warnings[] = ['code'=>'UNDERBASE_SPREAD_CLIPPED_BY_CANVAS','severity'=>'warning','requestedSpreadMm'=>$requestedSpreadMm,'transparentPaddingMm'=>$transparentPaddingMm];
        }
        if ($hasAlpha && $exportHasTransparency === false) {
            $warnings[] = ['code'=>'EXPORT_TRANSPARENCY_LOST','severity'=>'warning'];
        }
        $aiCritical = ($textIntegrity !== null && $textIntegrity < 0.98) || ($editMaskLeakage !== null && $editMaskLeakage > 0.02);
        if ($aiQaRequired && $aiCritical) {
            $warnings[] = ['code'=>'AI_EDIT_INTEGRITY_REVIEW_REQUIRED','severity'=>'warning'];
        }
        $physicalSamplePpi = ($sampleWidthMm !== null && $sampleWidthMm > 0 && $sourceWidthPx !== null) ? ($sourceWidthPx / ($sampleWidthMm / 25.4)) : null;
        $samplingContaminatedPreview = $previewFilter !== 'unknown' || $previewMipBias !== null;
        $mapColorPolicy = in_array($mapSemantic, ['mask','cutout','roughness','displacement','scalar'], true) ? 'raw-data' : 'color-managed';
        $edgeCleanup = $this->edgeCleanupDecision($edgeClass, $edgeColorContamination, $matteColor);
        $profileStatus = $embeddedProfile === '' ? 'missing-source-profile' : ($targetProfile === '' ? 'target-profile-unset' : 'profile-route-defined');
        if ($embeddedProfile === '') {
            $warnings[] = ['code'=>'SOURCE_ICC_PROFILE_MISSING','severity'=>'warning'];
        }

        return [
            'accepted' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
            'decision' => [
                'edgeClass'=>$edgeClass,
                'alphaPolicy'=>$alphaPolicy,
                'backgroundRemovalMode'=>$this->backgroundMode($edgeClass),
                'destructiveAlphaAllowed'=>$edgeClass === 'hard-edge',
            ],
            'alphaFilteringIntegrityReport' => [
                'storageMode'=>$alphaStorageMode,
                'workingTransfer'=>$filteringWorkingTransfer,
                'premultiplyBeforeFiltering'=>$premultiplyBeforeFiltering,
                'transparentRgbPolicy'=>$transparentRgbPolicy,
                'linearPremultipliedFilteringReady'=>!$hasAlpha || ((in_array($alphaStorageMode,['premultiplied','associated'],true) || $premultiplyBeforeFiltering) && $filteringWorkingTransfer === 'linear'),
                'wrongAssociationMayCreateHalo'=>true,
                'zeroAlphaUnpremultiplyGuardRequired'=>true,
                'multiBackgroundRecompositionQaRequired'=>true
            ],
            'deviceProfileCalibrationReport' => [
                'profileClass'=>$iccProfileClass,
                'sourceImageState'=>$sourceImageState,
                'dotGainPercent'=>$dotGainPercent,
                'measuredWhitePoint'=>$measuredWhitePoint !== '' ? $measuredWhitePoint : null,
                'deviceSpecificMeasurementRecommended'=>true,
                'genericProfileMayOnlyApproximateOutput'=>true
            ],
            'inkjetProcessReport' => [
                'totalInkLimitPercent'=>$totalInkLimitPercent,
                'halftoneAlgorithm'=>$halftoneAlgorithm !== '' ? $halftoneAlgorithm : null,
                'dotPlacementCalibrated'=>$dotPlacementCalibrated,
                'bandingRiskScore'=>$bandingRiskScore,
                'parameterCalibrationRequired'=>true,
                'singlePassBandingAndStreakQaRequired'=>true,
                'processSimulationPreferred'=>true
            ],
            'boundaryRefinementReport' => [
                'coarseSegmentationUsed'=>$coarseSegmentationUsed,
                'localBoundaryRefinement'=>$localBoundaryRefinement,
                'refinementBandPx'=>$boundaryRefinementBandPx,
                'orientationAwareInterpolation'=>$orientationAwareInterpolation,
                'globalThenLocalRefinementSupported'=>true,
                'smallObjectAndBoundaryPreservationRequired'=>true
            ],
            'underbaseIntentReport' => [
                'intent'=>$underbaseIntent,
                'opacityZones'=>$underbaseOpacityZones,
                'tonalUnderbaseAllowed'=>$underbaseIntent === 'intentional-tonal',
                'binaryAlphaFlatteningAllowed'=>$underbaseIntent === 'binary-production',
                'intentMustBePreserved'=>true
            ],
            'halftonePrintabilityReport' => [
                'minimumTonePercent'=>$halftoneMinTonePercent,
                'creativeMinimumDotMm'=>$creativeHalftoneMinDotMm,
                'ripOwnsScreenGeometry'=>true,
                'fileHalftoneMustNotBeRescreened'=>true
            ],
            'chokeOwnershipReport' => [
                'source'=>$chokeSource,
                'ripChokeEnabled'=>$ripChokeEnabled,
                'singleOwnerRequired'=>true,
                'doubleChokeDetected'=>$chokeSource === 'prepress' && $ripChokeEnabled
            ],
            'resamplingArtifactReport' => [
                'filter'=>$resamplingFilter !== '' ? $resamplingFilter : null,
                'blocking'=>$resizeBlockingScore,
                'ringing'=>$resizeRingingScore,
                'aliasingOrMoire'=>$resizeAliasingScore,
                'blur'=>$resizeBlurScore,
                'artifactFamiliesMustBeMeasuredSeparately'=>true,
                'previewMayAcceptMaster'=>false
            ],
            'blurMechanismReport' => [
                'mechanism'=>$blurMechanism,
                'diffusionDeblurEligible'=>in_array($blurMechanism,['lens-diffusion','demosaic-diffusion','static-defocus'],true),
                'motionBlurIsDiffusion'=>false,
                'unknownMechanismAllowsAutoDeblur'=>false
            ],
            'outputColorHandoffReport' => [
                'profile'=>$targetProfile !== '' ? $targetProfile : null,
                'renderingIntent'=>$outputRenderingIntent !== '' ? $outputRenderingIntent : null,
                'profileEmbedded'=>$outputProfileEmbedded,
                'displayProofMaySubstituteExportTransform'=>false
            ],
            'precisionConversionReport' => [
                'sourceBitDepth'=>$sourceBitDepth,
                'targetBitDepth'=>$targetBitDepth,
                'precisionReduction'=>$sourceBitDepth !== null && $targetBitDepth !== null ? $targetBitDepth < $sourceBitDepth : null,
                'layerDither'=>$layerDither,
                'textDither'=>$textDither,
                'maskOrAlphaDither'=>$maskDither,
                'alphaSelectionPreservesPartial'=>$alphaSelectionPreservesPartial,
                'maskDitherRequiresExplicitIntent'=>true,
                'textDitherDefaultAllowed'=>false
            ],
            'alphaMattingQualityReport' => [
                'sad'=>$alphaSad,
                'mse'=>$alphaMse,
                'gradientError'=>$alphaGradientError,
                'connectivityError'=>$alphaConnectivityError,
                'multiMetricRequired'=>true,
                'singleMetricMayAcceptMaster'=>false
            ],
            'underbaseCanvasSafetyReport' => [
                'transparentPaddingMm'=>$transparentPaddingMm,
                'requestedSpreadMm'=>$requestedSpreadMm,
                'spreadFitsCanvas'=>$transparentPaddingMm === null ? null : $requestedSpreadMm <= $transparentPaddingMm,
                'paddingMustBeCheckedBeforeRipSpread'=>true
            ],
            'directionalEdgeIntegrityReport' => [
                'orientationDeg'=>$edgeOrientationDeg,
                'coherency'=>$edgeCoherency,
                'orientationEvidenceAvailable'=>$edgeOrientationDeg !== null && $edgeCoherency !== null,
                'useForDirectionalPreservationQa'=>true,
                'mayDirectlyModifyMaster'=>false
            ],
            'ripHandoffReport' => [
                'imageProfile'=>$ripImageProfile !== '' ? $ripImageProfile : null,
                'vectorProfile'=>$ripVectorProfile !== '' ? $ripVectorProfile : null,
                'textProfile'=>$ripTextProfile !== '' ? $ripTextProfile : null,
                'objectDependentColorManagementPossible'=>true,
                'spotSeparationExpected'=>$spotSeparationExpected,
                'halftoneMode'=>$ripHalftoneMode !== '' ? $ripHalftoneMode : null,
                'previewHalftoneMaySubstituteRipScreen'=>false,
                'prepressMustNotDuplicateRipScreening'=>true
            ],
            'authoringExportIntegrityReport' => [
                'authoringApp'=>$authoringApp !== '' ? $authoringApp : null,
                'canvasPx'=>[$canvasWidthPx,$canvasHeightPx],
                'exportPx'=>[$exportWidthPx,$exportHeightPx],
                'exportScaleX'=>$exportScaleX,
                'exportScaleY'=>$exportScaleY,
                'scaleOrAspectMismatch'=>$exportScaleMismatch,
                'format'=>$exportFormat !== '' ? $exportFormat : null,
                'transparentExport'=>$exportHasTransparency,
                'sourceCanvasMayBeUsedAsPrintResolutionEvidence'=>false,
                'exportMustBeRepreflighted'=>true
            ],
            'aiGenerationIntegrityReport' => [
                'aiGenerated'=>$aiGenerated,
                'aiEdited'=>$aiEdited,
                'model'=>$generationModel !== '' ? $generationModel : null,
                'referenceCount'=>$referenceCount,
                'identitySimilarity'=>$identitySimilarity,
                'textIntegrity'=>$textIntegrity,
                'editMaskLeakage'=>$editMaskLeakage,
                'requiresSourceComparison'=>$aiQaRequired,
                'requiresTextOcrOrVectorComparison'=>$aiQaRequired && $textIntegrity !== null,
                'requiresAlphaReinspection'=>$aiQaRequired,
                'mayReplaceOriginalPrintMasterWithoutQa'=>false
            ],
            'physicalSamplingReport' => [
                'sourceWidthPx'=>$sourceWidthPx,
                'sampleWidthMm'=>$sampleWidthMm,
                'derivedPpi'=>$physicalSamplePpi,
                'previewFilter'=>$previewFilter,
                'previewMipBias'=>$previewMipBias,
                'previewSamplingMayAlterPerceivedSharpness'=>$samplingContaminatedPreview,
                'printMasterQualityMayBeJudgedFromRenderedPreview'=>false
            ],
            'mapSemanticReport' => [
                'semantic'=>$mapSemantic,
                'colorPolicy'=>$mapColorPolicy,
                'inputColorSpace'=>$inputColorSpace !== '' ? $inputColorSpace : null,
                'workingColorSpace'=>$workingColorSpace !== '' ? $workingColorSpace : null,
                'scalarMapGammaConversionAllowed'=>$mapColorPolicy !== 'raw-data' ? null : false,
                'cutoutRequiresBinaryIntent'=>$mapSemantic === 'cutout'
            ],
            'edgeCleanupDecision' => $edgeCleanup,
            'resamplingDecision' => $resampling,
            'colorManagementReport' => [
                'embeddedProfile'=>$embeddedProfile !== '' ? $embeddedProfile : null,
                'targetProfile'=>$targetProfile !== '' ? $targetProfile : null,
                'status'=>$profileStatus,
                'assignVsConvertMustBeExplicit'=>true,
                'renderingIntentMustBeRecorded'=>true,
                'blackPointCompensationMustBeRecorded'=>true,
                'silentProfileConversionAllowed'=>false
            ],
            'mattingDecision' => [
                'trimapAvailable'=>$trimapAvailable,
                'alphaEstimationRecommended'=>$trimapAvailable && $edgeClass !== 'hard-edge',
                'foregroundColorEstimationRecommended'=>$edgeColorContamination || $edgeClass === 'soft-intentional',
                'naiveRgbTimesAlphaAllowed'=>!($edgeColorContamination || $edgeClass === 'soft-intentional'),
                'recompositionQaRequired'=>true
            ],
            'qualityDiagnostics' => [
                'brisqueScore'=>$brisque,
                'brisqueRole'=>'diagnostic-only',
                'brisqueMayAcceptOrRejectPrintMaster'=>false,
                'hausdorffBoundaryDeltaPx'=>$hausdorffDeltaPx,
                'jInvariantCalibrationLoss'=>$jInvariantLoss,
                'boundaryMetricRole'=>'preservation-gate',
                'selfSupervisedDenoiseCalibrationAvailable'=>$jInvariantLoss !== null
            ],
            'restorationEvidence' => [
                'noiseSigma'=>$noiseSigma,
                'textureScore'=>$textureScore,
                'blurRadiusX'=>$blurX,
                'blurRadiusY'=>$blurY,
                'blurAnisotropy'=>$blurAnisotropy,
                'recommendedAction'=>$restorationAction,
                'psfConfidence'=>$psfConfidence,
                'deconvolutionCandidate'=>$psfConfidence >= 0.8 && $blurAnisotropy !== null,
                'autoDeblurAllowed'=>false,
                'sharpenWithoutEvidenceAllowed'=>false
            ],
            'printGeometry' => [
                'effectivePpi'=>$ppi,
                'mmPerPixel'=>$ppi > 0 ? Contracts::mmPerPixel($ppi) : null,
                'chokeMm'=>$chokeMm,
                'chokePxDerived'=>$chokePx,
                'minStrokeMm'=>$minStrokeMm,
            ],
            'provenance' => [
                'engine'=>'dtf-smart-prepress',
                'contractVersion'=>'1.0.0-research',
                'sourceImmutable'=>true,
                'mockupMayReplaceMaster'=>false
            ]
        ];
    }

    private function resamplingDecision(string $artworkClass, float $scaleFactor): array {
        $mode = 'bicubic-balanced';
        if (in_array($artworkClass, ['pixel-art','binary-mask'], true)) {
            $mode = 'nearest-neighbor';
        } elseif ($scaleFactor > 1.0 && in_array($artworkClass, ['photo','illustration'], true)) {
            $mode = 'detail-preserving-upscale';
        } elseif ($scaleFactor < 1.0) {
            $mode = 'antialiased-downsample';
        }
        return ['artworkClass'=>$artworkClass,'scaleFactor'=>$scaleFactor,'recommendedMode'=>$mode,'sharpenAfterResizeRequiresEvidence'=>true,'masterFromPreviewAllowed'=>false];
    }

    private function edgeCleanupDecision(string $edgeClass, bool $contamination, string $matteColor): array {
        $mode = 'none';
        if ($contamination) {
            $mode = match ($matteColor) {
                'white' => 'remove-white-matte',
                'black' => 'remove-black-matte',
                default => 'local-color-decontamination'
            };
        } elseif ($edgeClass === 'contaminated') {
            $mode = 'defringe-diagnostic-first';
        }
        return ['mode'=>$mode,'matteColor'=>$matteColor,'preserveIntentionalSoftAlpha'=>true,'globalEdgeErosionAllowed'=>false,'recompositionQaRequired'=>$mode !== 'none'];
    }

    private function backgroundMode(string $edgeClass): string {
        return match ($edgeClass) {
            'hard-edge' => 'hard-threshold',
            'soft-intentional' => 'trimap-matting',
            'contaminated' => 'color-distance-to-alpha',
            default => 'manual'
        };
    }
}
