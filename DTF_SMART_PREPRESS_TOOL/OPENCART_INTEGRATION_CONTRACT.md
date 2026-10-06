# OpenCart integration contract — evaluation layer only

This contract is implemented inside DTF_SMART_PREPRESS_TOOL but is not deployed into OpenCart.

## Endpoint

POST /integrations/opencart/evaluate

Multipart fields:
- file: artwork copy for this order item
- order_item_id
- product_type
- print_width_in
- print_height_in
- print_area_width_in
- print_area_height_in
- master_selected
- require_calibrated_profile (optional)
- output_profile (optional JSON file)

Configured product combinations:
- T-Shirt
- Mug
- Cap
- T-Shirt+Mug
- T-Shirt+Cap
- Mug+Cap
- T-Shirt+Mug+Cap

## Gate rules
1. Ready-to-Print Master must be explicitly selected for the order item.
2. Product type must be one of the configured combinations.
3. Requested physical print size must fit the product print area.
4. Image preflight Master Gate must be eligible.
5. If require_calibrated_profile=true, the output profile must contain the printer/RIP/ink/film/mode calibration fields required by the service.
6. The service returns an eligibility decision and detailed report only.

## Protection boundary
- This endpoint does not update OpenCart.
- It does not change order status.
- It does not replace the selected master.
- It does not publish designs or products.
- It does not deploy or merge storefront code.
- Mockup derivatives remain separate from the Ready-to-Print Master.
