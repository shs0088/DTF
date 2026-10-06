# DTF Smart Prepress Tool — active build

Research-driven prepress/preflight engine, intentionally isolated from the protected OpenCart storefront.

## Implemented
- Real PNG/RGBA pixel inspection
- Final-size effective DPI (embedded DPI is not treated as sufficient)
- Transparent / semi-transparent / low-alpha statistics
- Content bounds and ghost-alpha risk inputs
- Preliminary light/dark edge-RGB diagnostics
- Minimum visible-run proxy for fine-feature risk
- White source policy model
- Choke/spread stored in physical units and converted after final size is known
- Diagnostic white-underbase preview
- Feature-loss warning from choke vs measured feature size
- JSON PASS/WARN/FAIL report
- CLI and unit tests

## Run
```
python -m pip install -r requirements.txt
python cli.py artwork.png --width-in 16 --height-in 18 --choke-mm 0.15 --white-preview white.png --report report.json
python -m unittest discover -v
```

## Important limits of this build
- White preview is diagnostic, not RIP-authoritative output.
- Light/dark edge metrics are screening signals, not proof of halo contamination.
- Minimum-run is a conservative proxy; topology-aware connected-component/hole/skeleton analysis is the next stage.
- No destructive background removal is automatically applied.
- No universal DTF choke, DPI, halftone, or ICC values are hard-coded.

## Protected-storefront rule
This directory is standalone. No OpenCart/storefront file is modified, no deployment is performed, and no merge is performed during tool development.
