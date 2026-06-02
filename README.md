# BlurOCR: The Ultimate 4-Tier Fallback OCR Tool (Vision + OCR.space + Tesseract) 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018-brightgreen.svg)](https://nodejs.org)

BlurOCR is a powerful, open-source Optical Character Recognition (OCR) pipeline designed to extract text from images—even heavily blurry, distorted, or low-quality photos. It uses an innovative **4-tier fallback system** (including Vision LLMs) combined with seamless **Google Sheets integration** to ensure you never lose extracted data.

Whether you're building a receipt scanner, digitizing old documents, or trying to read a blurry license plate, BlurOCR provides production-ready reliability.

## ✨ Features

- **🛡️ 4-Tier Fallback Architecture:**
  - **Tier 1:** [Google Cloud Vision API](https://cloud.google.com/vision) (Best accuracy, generous free tier of 1,000 requests/month).
  - **Tier 2:** [OCR.space API](https://ocr.space/) (Excellent fallback, Engine 2 handles special characters perfectly, 25k free requests/month).
  - **Tier 3:** **Nemotron Vision LLM via OpenRouter** (Advanced AI context understanding, extracts perfectly structured JSON receipts).
  - **Tier 4:** [Tesseract.js](https://github.com/naptha/tesseract.js) with Sharp (10-stage local blur recovery pipeline). If all APIs fail or you have no internet, local processing takes over!
- **📊 Google Sheets Auto-Sync:** Extracted text is automatically logged to your Google Sheet with timestamps, confidence scores, and the OCR provider used.
- **🔌 Open-Source & Deploy Anywhere:** Run it locally, on a VPS, inside Docker, or as a REST API.
- **🚫 No Vendor Lock-in:** Use it 100% locally with Tesseract, or configure your own free API keys.

---

## 🛠️ Installation & Setup

You can run BlurOCR anywhere Node.js is installed.

```bash
# 1. Clone the repository
git clone https://github.com/Alok583/blurocr.git
cd blurocr

# 2. Install dependencies
npm install
```

### Configure API Keys (The Magic Sauce)

BlurOCR uses environment variables to securely store your API keys. 

1. Copy the example configuration file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```env
   # Path to your Google Cloud Service Account JSON file (for Vision & Sheets)
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   
   # OCR.space API Key (Get a free one at https://ocr.space/OCRAPI)
   OCR_SPACE_API_KEY=your_ocr_space_key
   
   # Google Sheet ID (Found in the URL of your spreadsheet)
   GOOGLE_SHEET_ID=your_sheet_id_here
   
   # OpenRouter API Key (For Nemotron Vision LLM Tier 3)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

*(Don't have these keys? No problem. If they are missing, BlurOCR gracefully falls back directly to the local Tesseract.js engine!)*

---

## 🚀 Usage

### 1. Run the REST API Server

```bash
npm run start
# Or for development: npm run dev
```

The server will start at `http://localhost:3000`.

### 2. Extract Text via API

You can upload an image using `curl` or Postman to test the 3-tier fallback pipeline.

```bash
curl -X POST http://localhost:3000/extract \
  -F "image=@/path/to/your/blurry-receipt.jpg"
```

**Response Example:**
```json
{
  "success": true,
  "filename": "blurry-receipt.jpg",
  "text": "Total: $42.50",
  "confidence": 100,
  "provider": "Google Vision API",
  "blurLevel": "unknown"
}
```
*Behind the scenes, this exact data is instantly appended as a new row in your configured Google Sheet!*

---

## 📖 Programmatic API (Use it in your own code)

You can easily integrate BlurOCR into your existing Node.js applications.

```javascript
const blurocr = require('blurocr');

async function run() {
  // Uses the 4-tier fallback (Vision -> OCR.space -> Nemotron -> Tesseract)
  const result = await blurocr.processImageFallback('./invoice.png');
  
  console.log(`Extracted text: ${result.text}`);
  console.log(`Provider used: ${result.provider}`);
}

run();
```

---

## 💡 Why this architecture? (SEO & Tech Details)

When extracting text from a **blurry image**, single-engine OCR solutions often fail. By orchestrating multiple engines, BlurOCR maximizes extraction success rates:

1. **Google Vision OCR** is industry-leading for natural scenes and dense document text detection, easily cutting through noise and blur.
2. **OCR.space** provides an incredible secondary free OCR API that excels at parsing structured receipts and special characters.
3. **Nemotron Vision LLM (OpenRouter)** adds state-of-the-art multimodal AI understanding to extract structured JSON data when traditional OCR struggles.
4. **Tesseract OCR (Local)** combined with our WebAssembly pipeline and Sharp preprocessing (unsharp masking, adaptive thresholding, morphological operations) ensures you always have a zero-cost local fallback for text extraction.

### Keywords for Discoverability
`OCR`, `Blurry Image OCR`, `Free OCR API`, `Google Vision Node.js`, `Tesseract.js`, `Image to Text`, `Google Sheets API`, `Open Source OCR`, `Receipt Scanner`, `Vision LLM`, `Nemotron`, `Structured JSON Extraction`, `AI OCR`.

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
