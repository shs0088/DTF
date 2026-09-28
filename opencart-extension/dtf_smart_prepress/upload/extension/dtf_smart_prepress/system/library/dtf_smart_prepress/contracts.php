<?php
namespace Opencart\System\Library\DtfSmartPrepress;

final class Contracts {
    public const EDGE_CLASSES = ['hard-edge','soft-intentional','contaminated','uncertain'];
    public const ALPHA_POLICIES = ['preserve-continuous','threshold-hard-edge','refine-matte','reject-for-review'];
    public const EDGE_COLOR_POLICIES = ['none','remove-white-matte','remove-black-matte','local-decontaminate'];
    public const BACKGROUND_REMOVAL_MODES = ['hard-threshold','color-distance-to-alpha','segmentation','trimap-matting','manual'];
    public const NOISE_MODELS = ['none','additive','multiplicative-speckle','correlated-value','independent-rgb','alpha-noise'];

    public static function mmPerPixel(float $effectivePpi): float {
        if ($effectivePpi <= 0) {
            throw new \InvalidArgumentException('effectivePpi must be > 0');
        }
        return 25.4 / $effectivePpi;
    }

    public static function mmToPixels(float $mm, float $effectivePpi): float {
        return $mm / self::mmPerPixel($effectivePpi);
    }

    public static function pixelsToMm(float $pixels, float $effectivePpi): float {
        return $pixels * self::mmPerPixel($effectivePpi);
    }
}
