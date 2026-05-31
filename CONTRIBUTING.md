# Contributing to BlurOCR

Thank you for wanting to make BlurOCR better!

## Ground Rules

- One HTML file (`BlurOCR.html`) — keep it self-contained
- No build tools, no npm, no framework dependencies
- All libraries via CDN only
- MIT-compatible licenses only

## How to Contribute

1. Fork the repo
2. Make your changes to `BlurOCR.html`
3. Test on blurry images
4. Open a PR describing what you changed and why

## Ideas for Contributions

- Additional OpenCV preprocessing steps
- Handwriting OCR via Transformers.js (TrOCR)
- PDF page support (pdf.js integration)
- Batch image mode
- Better super-resolution (ESRGAN ONNX model)
- Additional language support
- UI improvements

## Testing

Use images from these categories to test:
- Camera photos of documents (motion blur)
- Scanned pages (low contrast)
- Screenshots of small text
- Photos taken at an angle (deskew test)
- Images with uneven lighting

## Code Style

- Vanilla JS only, no transpilation
- `'use strict'` at top of scripts
- Comment complex algorithms
- Document any new preprocessing stage in the pipeline diagram in README.md
