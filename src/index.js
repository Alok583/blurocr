/**
 * BlurOCR — Main Library Entry Point
 * 
 * Usage:
 *   const blurocr = require('blurocr');
 * 
 *   // Simple API
 *   const result = await blurocr.extract('photo.jpg');
 *   console.log(result.text);
 * 
 *   // With options
 *   const result = await blurocr.extract('photo.jpg', {
 *     lang: 'eng',
 *     psm: '6',
 *     blurLevel: 'auto',     // 'auto' | 'sharp' | 'mild' | 'blurry' | 'veryBlur'
 *     scale: 2,
 *     sharpen: true,
 *     threshold: true,
 *     savePreprocessed: '/tmp/debug.png',
 *     onProgress: (stage, msg) => console.log(stage, msg),
 *   });
 * 
 *   // Batch processing
 *   const results = await blurocr.extractBatch(['a.jpg', 'b.png'], options);
 */

'use strict';
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { preprocessImage, savePreprocessed, detectBlurLevel } = require('./preprocessor');
const { recognize, terminateAll }                             = require('./ocr');
const { processImageFallback }                                = require('./ocr-fallback');

/**
 * Extract text from a single image.
 * 
 * @param {string|Buffer}  input    - File path or raw image buffer
 * @param {object}         options  - Processing options
 * @returns {Promise<BlurOCRResult>}
 */
async function extract(input, options = {}) {
  const startTime = Date.now();
  const logs      = [];

  const onLog = options.onProgress || ((stage, msg) => {
    logs.push({ stage, msg, ts: Date.now() });
  });

  // 1. Preprocess
  const { buffer, blurLevel, meta } = await preprocessImage(input, options, onLog);

  // 2. Optionally save preprocessed image for debugging
  if (options.savePreprocessed) {
    await savePreprocessed(buffer, options.savePreprocessed);
    onLog('debug', `Preprocessed image saved to ${options.savePreprocessed}`);
  }

  // 3. OCR
  onLog('ocr', 'Running Tesseract OCR on preprocessed image…');
  const ocrResult = await recognize(buffer, {
    lang:       options.lang || 'eng',
    psm:        options.psm  || '6',
    onProgress: p => onLog('ocr', `Recognition: ${Math.round(p * 100)}%`),
  });

  const totalMs = Date.now() - startTime;
  onLog('done', `Extraction complete in ${totalMs}ms · confidence: ${ocrResult.confidence}%`);

  return {
    text:       ocrResult.text,
    confidence: ocrResult.confidence,
    words:      ocrResult.words,
    lines:      ocrResult.lines,
    blocks:     ocrResult.blocks,
    paragraphs: ocrResult.paragraphs,
    hocr:       ocrResult.hocr,
    blurLevel,
    meta: {
      ...meta,
      ...ocrResult.stats,
      totalMs,
    },
    logs,
  };
}

/**
 * Extract text from multiple images (batch mode).
 * Uses concurrency control to avoid memory exhaustion on VPS.
 * 
 * @param {string[]|Buffer[]}  inputs      - Array of file paths or buffers
 * @param {object}             options     - Options (same as extract)
 * @param {number}             concurrency - Max parallel jobs (default 2)
 * @returns {Promise<BatchResult[]>}
 */
async function extractBatch(inputs, options = {}, concurrency = 2) {
  const results = [];
  const queue   = [...inputs];

  async function runJob(input) {
    try {
      const result = await processImageFallback(input, options);
      return { input: typeof input === 'string' ? input : '[buffer]', ...result, error: null };
    } catch (err) {
      return { input: typeof input === 'string' ? input : '[buffer]', error: err.message };
    }
  }

  // Process with concurrency limit
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(batch.map(runJob));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Detect blur level of an image without running OCR.
 * Useful for pre-filtering image quality.
 * 
 * @param {string|Buffer} input
 * @returns {Promise<'sharp'|'mild'|'blurry'|'veryBlur'>}
 */
async function detectBlur(input) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  return detectBlurLevel(buffer);
}

/**
 * Clean up Tesseract workers. Call on process exit for clean shutdown.
 */
async function cleanup() {
  await terminateAll();
}

// Graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT',  cleanup);

module.exports = {
  extract,
  extractBatch,
  processImageFallback,
  detectBlur,
  cleanup,
  version: require('../package.json').version,
};

/**
 * @typedef {object} BlurOCRResult
 * @property {string}   text           - Extracted plain text
 * @property {number}   confidence     - OCR confidence (0–100)
 * @property {Word[]}   words          - Per-word confidence + bounding boxes
 * @property {string[]} lines          - Text lines array
 * @property {object[]} blocks         - Block-level structure
 * @property {object[]} paragraphs     - Paragraph structure
 * @property {string}   hocr           - hOCR XML
 * @property {string}   blurLevel      - Detected blur: sharp|mild|blurry|veryBlur
 * @property {object}   meta           - Timing and image metadata
 * @property {LogEntry[]} logs         - Processing log entries
 */
