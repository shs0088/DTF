# Local AI models

This directory is intentionally empty in source control.

DTF Smart Prepress is offline-first at runtime:
- matting.rembg_candidate refuses to run unless the selected ONNX model already exists locally.
- Local Real-ESRGAN support requires a preinstalled realesrgan-ncnn-vulkan executable supplied by the operator.
- The tool does not upload customer artwork to a remote AI service.
- Model files are not committed to this repository.

Expected rembg cache examples:
- models/rembg/u2net.onnx
- models/rembg/u2netp.onnx
- models/rembg/isnet-general-use.onnx
- models/rembg/isnet-anime.onnx
- models/rembg/silueta.onnx
