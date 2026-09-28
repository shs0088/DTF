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
 'brisqueScore'=>42.0,'psfConfidence'=>0.85,'hausdorffDeltaPx'=>0.4
]);
assert($soft['decision']['alphaPolicy']==='preserve-continuous');
assert($soft['edgeCleanupDecision']['mode']==='remove-white-matte');
assert($soft['edgeCleanupDecision']['globalEdgeErosionAllowed']===false);
assert($soft['mattingDecision']['foregroundColorEstimationRecommended']===true);
assert($soft['mattingDecision']['naiveRgbTimesAlphaAllowed']===false);
assert($soft['resamplingDecision']['recommendedMode']==='detail-preserving-upscale');
assert($soft['qualityDiagnostics']['brisqueMayAcceptOrRejectPrintMaster']===false);
assert($soft['provenance']['mockupMayReplaceMaster']===false);

echo "PASS\n";
