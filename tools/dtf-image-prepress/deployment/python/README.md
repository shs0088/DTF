# Offline Python Wheelhouse

Python adapters are optional local capabilities. The runtime **never downloads Python packages**.

Prepare a wheelhouse out-of-band, create a JSON manifest with exact wheel filenames and SHA-256 hashes, verify it locally, then install selected profiles with pip in `--no-index --no-deps` mode.

Suggested profiles:

- `mask-core`: NumPy, Pillow, ONNX Runtime, PyMatting and all required transitive wheels.
- `ocr-paddle`: PaddleOCR, PaddlePaddle and all required transitive wheels.
- `ocr-secondary`: optional Python-only OCR tools if used; Tesseract itself remains a separately hash-pinned executable.

Example manifest shape:

```json
{
  "schemaVersion": "dtf-wheelhouse-v1",
  "python": "3.12",
  "entries": [
    {
      "packageName": "example",
      "version": "1.2.3",
      "wheelFile": "example-1.2.3-py3-none-any.whl",
      "sha256": "<64 hex characters>",
      "profiles": ["mask-core"]
    }
  ]
}
```

No placeholder manifest is accepted by production. Package versions are selected only after local compatibility/benchmark testing, then the exact wheels are pinned by hash.

Verification:

```bash
python3 verify_wheelhouse.py \
  --manifest /opt/dtf/wheelhouse/manifest.json \
  --wheelhouse /opt/dtf/wheelhouse \
  --output-json /opt/dtf/wheelhouse/verified.json
```

Offline install:

```bash
python3 install_offline.py \
  --verified-json /opt/dtf/wheelhouse/verified.json \
  --venv /opt/dtf/python \
  --profile mask-core
```

The installer uses only the verified local wheel paths. It does not use package indexes or dependency resolution.
