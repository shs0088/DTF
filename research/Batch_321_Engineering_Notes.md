# Batch 321: engineering notes

- ImageMagick regression: changing metadata from 300 to 150 PPI kept a 1200x600 raster unchanged; resampling to 150 PPI yielded 600x300 pixels.
- OpenCV BGR2BGRA produced opaque alpha=255, not a removed background.
- Porter-Duff 50% red over 50% blue: resulting alpha=0.75, straight RGB=(2/3,0,1/3).
- Morphological hole filling and erosion require safeguards for Arabic dots and fine lettering.
- Mockup textures should use alpha-aware filtering; original printing masters must remain unchanged.
- White-underbase choke requires physical printer calibration; 0.15mm per side equals 1.77 pixels at 300 PPI.

19 sources; provisional cumulative 2,841; globally certified count pending historical deduplication. No deployment or merge.
