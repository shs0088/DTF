<?php
require_once __DIR__ . '/../upload/extension/dtf_smart_prepress/system/library/dtf_smart_prepress/contracts.php';
require_once __DIR__ . '/../upload/extension/dtf_smart_prepress/system/library/dtf_smart_prepress/preflight.php';

use Opencart\System\Library\DtfSmartPrepress\Contracts;
use Opencart\System\Library\DtfSmartPrepress\Preflight;

$engine = new Preflight();
$r = $engine->analyze([
    'effectivePpi'=>300, 'hasAlpha'=>true, 'edgeClass'=>'hard-edge',
    'minStrokePx'=>3, 'chokeMm'=>0.15, 'noiseSigma'=>0.04,
    'textureScore'=>0.72, 'blurRadiusX'=>1.0, 'blurRadiusY'=>3.0,
    'brisqueScore'=>42.0, 'trimapAvailable'=>true, 'edgeColorContamination'=>true
]);
assert(abs(Contracts::pixelsToMm(2, 300) - 0.1693333333) < 0.0001);
assert($r['decision']['alphaPolicy'] === 'threshold-hard-edge');
assert($r['provenance']['sourceImmutable'] === true);
assert($r['provenance']['mockupMayReplaceMaster'] === false);
assert($r['restorationEvidence']['blurAnisotropy'] > 0.35);
assert($r['restorationEvidence']['autoDeblurAllowed'] === false);
assert($r['restorationEvidence']['sharpenWithoutEvidenceAllowed'] === false);
assert($r['mattingDecision']['foregroundColorEstimationRecommended'] === true);
assert($r['mattingDecision']['naiveRgbTimesAlphaAllowed'] === false);
assert($r['qualityDiagnostics']['brisqueMayAcceptOrRejectPrintMaster'] === false);
echo "PASS\n";
