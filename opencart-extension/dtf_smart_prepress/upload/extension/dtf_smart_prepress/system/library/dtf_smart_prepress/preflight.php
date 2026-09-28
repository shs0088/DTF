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
            'restorationEvidence' => [
                'noiseSigma'=>$noiseSigma,
                'textureScore'=>$textureScore,
                'blurRadiusX'=>$blurX,
                'blurRadiusY'=>$blurY,
                'blurAnisotropy'=>$blurAnisotropy,
                'recommendedAction'=>$restorationAction,
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
                'contractVersion'=>'0.1.0-research',
                'sourceImmutable'=>true,
                'mockupMayReplaceMaster'=>false
            ]
        ];
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
