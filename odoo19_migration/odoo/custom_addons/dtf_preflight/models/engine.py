import base64
import hashlib
import imghdr
import math
import re
from odoo import api, fields, models
from odoo.exceptions import ValidationError

FORMATS = {"png", "jpg", "jpeg", "webp", "svg", "pdf"}

def _effective_dpi(px, cm):
    return round(px / (cm / 2.54), 2) if px and cm and cm > 0 else None

class DTFPreflightEngine(models.AbstractModel):
    _name = "dtf.preflight.engine"
    _description = "DTF Studio Server Preflight Engine"

    @api.model
    def inspect_bytes(self, data, filename, declared_mime=None, target_width_cm=None, target_height_cm=None):
        raw = base64.b64decode(data) if isinstance(data, str) else bytes(data or b"")
        name = (filename or "").lower()
        extension = name.rsplit(".", 1)[-1] if "." in name else ""
        detected = imghdr.what(None, raw) or ""
        if detected == "jpeg": detected = "jpeg"
        if raw.startswith(b"%PDF-"): detected = "pdf"
        if re.search(br"<svg(?:\s|>)", raw[:65536], re.I): detected = "svg"
        if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP": detected = "webp"
        pixels = {"width": None, "height": None}
        if detected == "png" and len(raw) >= 24: pixels = {"width": int.from_bytes(raw[16:20], "big"), "height": int.from_bytes(raw[20:24], "big")}
        signature_ok = bool(detected and (extension in {detected, "jpg" if detected == "jpeg" else detected} or detected in {"svg", "pdf"}))
        vector = detected in {"svg", "pdf"}
        readable = bool(raw and detected in FORMATS)
        previewable = bool(detected in {"png", "jpeg", "jpg", "webp", "svg"})
        effective = {"x": _effective_dpi(pixels["width"], target_width_cm), "y": _effective_dpi(pixels["height"], target_height_cm)}
        effective["minimum"] = min([v for v in effective.values() if v is not None], default=None)
        physical = {"width_cm": target_width_cm, "height_cm": target_height_cm}
        return {"extension": extension, "declared_mime": declared_mime, "detected_format": detected or "unknown", "signature_valid": signature_ok, "size_bytes": len(raw), "pixel_width": pixels["width"], "pixel_height": pixels["height"], "embedded_dpi": None, "effective_dpi": effective, "physical_size": physical, "transparency": None, "alpha": None, "color_mode": None, "color_profile": None, "orientation": None, "metadata": {}, "readable": readable, "previewable": previewable, "analyzable": readable and (vector or bool(pixels["width"] and pixels["height"])), "aspect_ratio": round(pixels["width"] / pixels["height"], 6) if pixels["width"] and pixels["height"] else None, "scaling_factor": None, "scaling_risk": "unknown" if vector or not effective["minimum"] else ("high" if effective["minimum"] < 150 else "medium" if effective["minimum"] < 300 else "low"), "vector": vector}

    @api.model
    def evaluate(self, asset, rule, snapshot=None):
        snapshot = snapshot or {}
        reasons = []
        fmt = (snapshot.get("detected_format") or asset.file_format or "").lower()
        allowed = rule.allowed_formats or []
        if fmt not in FORMATS or (allowed and fmt not in allowed and not (fmt == "jpg" and "jpeg" in allowed)):
            reasons.append(("unsupported_format", "Unsupported or disallowed file format."))
        if not snapshot.get("readable", asset.readable): reasons.append(("unreadable", "File is not readable."))
        if not snapshot.get("analyzable", asset.analyzable): reasons.append(("unanalyzable", "File cannot be fully analyzed."))
        if rule.require_previewable and not snapshot.get("previewable", asset.previewable): reasons.append(("not_previewable", "A previewable asset is required."))
        dpi = (snapshot.get("effective_dpi") or {}).get("minimum")
        if not snapshot.get("vector") and dpi is not None and dpi < rule.min_effective_dpi: reasons.append(("effective_dpi", "Effective DPI is below the active rule minimum."))
        physical = snapshot.get("physical_size") or {}
        for key, minimum, maximum in (("width_cm", rule.min_width_cm, rule.max_width_cm), ("height_cm", rule.min_height_cm, rule.max_height_cm)):
            value = physical.get(key)
            if value is not None and minimum and value < minimum: reasons.append(("min_"+key, key+" is below the minimum."))
            if value is not None and maximum and value > maximum: reasons.append(("max_"+key, key+" exceeds the maximum."))
        if rule.require_transparency and snapshot.get("transparency") is not True: reasons.append(("transparency", "Transparency is required by the active rule."))
        status = "accepted" if not reasons else "rejected"
        return {"status": status, "codes": [code for code, _ in reasons], "reasons_en": " \".join(text for _, text in reasons), "reasons_ar": "", "snapshot": snapshot}

    @api.model
    def run(self, asset, rule, target_width_cm=None, target_height_cm=None):
        attachment = asset.attachment_id
        snapshot = self.inspect_bytes(attachment.datas or b"", asset.name, attachment.mimetype, target_width_cm, target_height_cm)
        result = self.evaluate(asset, rule, snapshot)
        return self.env["dtf.preflight.result"].create({"asset_id": asset.id, "rule_version_id": rule.id, "status": result["status"], "reasons_en": result["reasons_en"], "reasons_ar": result["reasons_ar"], "failure_codes": result["codes"], "analyzer_snapshot": snapshot, "locked": True})
