# BlurOCR 🔬
### Open-source OCR that actually handles blurry images — no API key, no server, runs 100% in your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8.0-blue.svg)](https://opencv.org)
[![Tesseract](https://img.shields.io/badge/Tesseract.js-5.x-orange.svg)](https://github.com/naptha/tesseract.js)
[![Zero Dependencies](https://img.shields.io/badge/framework-none-lightgrey.svg)]()

---

## ✨ What makes BlurOCR better than Tesseract?

Tesseract is a great OCR engine — but it **fails badly on blurry, low-contrast, or degraded images** because it receives the raw pixels as-is.

BlurOCR wraps Tesseract's WASM engine with a **10-stage OpenCV.js preprocessing pipeline** that aggressively recovers text from difficult images before OCR ever runs:

| Feature | Tesseract (raw) | BlurOCR |
|---|---|---|
| Blurry images | ❌ Garbled output | ✅ Sharp pipeline first |
| Low contrast | ❌ Misses text | ✅ CLAHE equalization |
| Uneven lighting | ❌ Lost chars | ✅ Adaptive threshold |
| Tilted/skewed | ❌ Drops accuracy | ✅ Auto-deskew (Hough) |
| Very small text | ❌ Fails | ✅ Auto-upscale ×1–4 |
| Noisy images | ❌ Corrupted words | ✅ NL-Means denoising |
| API key required | — | ✅ None, ever |
| Server required | — | ✅ Runs offline |
| Single file | — | ✅ One HTML file |

---

## 🚀 Usage

**No install. No build step. Just open the file.**

```bash
git clone https://github.com/your-org/blurocr
open BlurOCR.html   # macOS
# or
xdg-open BlurOCR.html  # Linux
# or just double-click on Windows
```

On first load, it downloads and caches:
- OpenCV.js WASM (~8MB)
- Tesseract.js WASM + English language model (~10MB)

After that, it runs **100% offline**.

---

## 🔬 Preprocessing Pipeline

```
Input Image
    │
    ▼
[1] Auto-upscale (1× – 4×, INTER_CUBIC)         ← recover small text
    │
    ▼
[2] Grayscale conversion
    │
    ▼
[3] CLAHE (Contrast Limited Adaptive Histogram Equalization)
    │   └─ 8×8 tile grid, configurable clip limit
    ▼
[4] Non-local Means Denoising (fastNlMeansDenoising)
    │   └─ template window 7×7, search window 21×21
    ▼
[5] Unsharp Masking / High-Boost Sharpening
    │   └─ configurable kernel strength (1 or 2 passes)
    ▼
[6] Adaptive Gaussian Thresholding   OR   Otsu Global Threshold
    │   └─ handles uneven illumination across the image
    ▼
[7] Morphological Closing
    │   └─ 2×2 RECT kernel — fills gaps in character strokes
    ▼
[8] Auto-Deskew (Hough Line Detection → WarpAffine rotation)
    │   └─ corrects ±45° tilt
    ▼
[9] Border Padding (20px white)
    │   └─ prevents Tesseract from cropping edge characters
    ▼
[10] Tesseract WASM OCR
     └─ configurable PSM mode + language pack
```

---

## ⚙️ Configuration Options

All adjustable via the UI — no code changes needed:

| Setting | Range | Default | Effect |
|---|---|---|---|
| Sharpening | 0 – 5× | 2× | Unsharp mask strength |
| Denoise Strength | 0 – 30 | 10 | NL-Means h parameter |
| CLAHE Clip Limit | 1 – 10 | 3 | Contrast amplification limit |
| Block Size | 3 – 51 | 11 | Adaptive threshold window |
| Upscale Factor | 1 – 4× | 2× | Pre-OCR upsampling |
| Language | 14 options | English | Tesseract language pack |
| Page Seg Mode | PSM 3–13 | PSM 6 | Tesseract layout analysis |
| Auto-Deskew | on/off | on | Skew angle correction |
| Adaptive Threshold | on/off | on | vs Otsu global threshold |
| Morphological Closing | on/off | on | Stroke gap filling |

### Auto-Preset

BlurOCR measures the **Laplacian variance** (σ²) of the image to detect blur level, then automatically configures all sliders:

| σ² Value | Classification | Strategy |
|---|---|---|
| > 500 | Sharp | Light processing only |
| 100–500 | Mild blur | Moderate enhancement |
| 20–100 | Blurry | Aggressive processing |
| < 20 | Very blurry | Maximum enhancement |

---

## 📤 Export Formats

- **Plain text** — copy or download as `.txt`
- **JSON** — structured output with per-word confidence scores and bounding boxes
- **Word confidence view** — color-coded by confidence (green/yellow/red)
- **hOCR data** — structured block/line/word breakdown

---

## 🛠 Tech Stack

All open source, all running in WebAssembly in your browser:

| Library | Version | License | Role |
|---|---|---|---|
| [OpenCV.js](https://docs.opencv.org/4.8.0/opencv.js) | 4.8.0 | Apache 2.0 | Image preprocessing |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | 5.x | Apache 2.0 | OCR engine (WASM) |
| Vanilla JS/HTML/CSS | — | — | UI — zero framework deps |

No Node.js. No npm. No webpack. No React. No server. **One file.**

---

## 🤝 Contributing

PRs are welcome! Areas to contribute:

- **More preprocessing steps** — bilateral filter, Wiener deconvolution, super-resolution
- **Additional OCR engines** — integrate [EasyOCR](https://github.com/JaidedAI/EasyOCR) via ONNX, or [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- **Handwriting support** — [TrOCR](https://huggingface.co/microsoft/trocr-base-handwritten) via Transformers.js
- **Batch processing** — process multiple images at once
- **PDF support** — extract text from scanned PDFs
- **More languages** — contribute language model bundles

### Development

```bash
git clone https://github.com/your-org/blurocr
cd blurocr
# No build step! Just edit BlurOCR.html and open in browser.
# Use a local server for best WASM performance:
python3 -m http.server 8080
# then open http://localhost:8080/BlurOCR.html
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🙏 Credits

Built on the shoulders of giants:
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) — the original open-source OCR engine
- [Tesseract.js](https://github.com/naptha/tesseract.js) — Tesseract compiled to WebAssembly
- [OpenCV](https://opencv.org) — the world's most used computer vision library
