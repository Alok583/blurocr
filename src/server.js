/**
 * BlurOCR — REST API Server
 * 
 * Runs a production-ready Express server exposing BlurOCR over HTTP.
 * Deploy on any VPS, Docker container, or cloud instance.
 * 
 * Endpoints:
 *   POST /extract          — Upload image, get text back
 *   POST /extract/batch    — Upload multiple images
 *   GET  /detect-blur      — Detect blur level only (no OCR)
 *   GET  /health           — Health check
 *   GET  /version          — API version info
 */

'use strict';
require('dotenv').config();

const express      = require('express');
const fileUpload   = require('express-fileupload');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');
const fs           = require('fs');
const blurocr      = require('./index');
const { processImageFallback } = require('./ocr-fallback');
const { saveToSheet } = require('./sheets');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(fileUpload({
  limits:          { fileSize: 50 * 1024 * 1024 }, // 50MB max
  useTempFiles:    true,
  tempFileDir:     '/tmp/',
  abortOnLimit:    true,
  createParentPath: true,
}));

// ─── Serve browser version ────────────────────────────────────────────────────
app.use('/browser', express.static(path.join(__dirname, '../browser')));

// ─── Helper: format response ──────────────────────────────────────────────────
function successResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, ...data });
}

function errorResponse(res, message, statusCode = 400) {
  res.status(statusCode).json({ success: false, error: message });
}

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  successResponse(res, {
    status:   'ok',
    uptime:   process.uptime(),
    memory:   process.memoryUsage(),
    version:  blurocr.version,
  });
});

// ─── GET /version ─────────────────────────────────────────────────────────────
app.get('/version', (req, res) => {
  successResponse(res, {
    version:    blurocr.version,
    engine:     'Tesseract.js WASM',
    pipeline:   'Sharp 10-stage preprocessing',
    nodejs:     process.version,
  });
});

// ─── POST /extract ────────────────────────────────────────────────────────────
app.post('/extract', async (req, res) => {
  if (!req.files || !req.files.image) {
    return errorResponse(res, 'No image file provided. Send image as multipart form field "image".');
  }

  const file = req.files.image;
  const opts = {
    lang:       req.body.lang      || 'eng',
    psm:        req.body.psm       || '6',
    blurLevel:  req.body.blurLevel || undefined, // 'auto' by default
  };

  try {
    // 3-Tier Fallback OCR
    const imagePath = file.tempFilePath || file.data;
    const result = await processImageFallback(imagePath, opts);

    // Save to Google Sheets
    await saveToSheet(file.name, result.text, result.provider, result.confidence);

    // Clean up temp file
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    successResponse(res, {
      filename:   file.name,
      text:       result.text,
      confidence: result.confidence,
      provider:   result.provider,
      blurLevel:  result.blurLevel || 'unknown',
      logs:       result.logs,
    });

  } catch (err) {
    console.error('Extract error:', err);
    errorResponse(res, err.message, 500);
  }
});

// ─── POST /extract/batch ──────────────────────────────────────────────────────
app.post('/extract/batch', async (req, res) => {
  if (!req.files) {
    return errorResponse(res, 'No files provided.');
  }

  const files  = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
  const opts   = {
    lang: req.body.lang || 'eng',
    psm:  req.body.psm  || '6',
  };

  try {
    const inputs  = files.map(f => f.tempFilePath || f.data);
    // Note: extractBatch is updated in index.js to use processImageFallback
    const results = await blurocr.extractBatch(inputs, opts);

    // Map filenames back
    const mapped = results.map((r, i) => {
      // Save to Google Sheets in background
      saveToSheet(files[i]?.name || `file_${i}`, r.text, r.provider, r.confidence).catch(console.error);
      
      return {
        filename:   files[i]?.name || `file_${i}`,
        text:       r.text,
        confidence: r.confidence,
        provider:   r.provider,
        blurLevel:  r.blurLevel,
        error:      r.error || null,
      };
    });

    // Cleanup temp files
    files.forEach(f => {
      if (f.tempFilePath && fs.existsSync(f.tempFilePath)) {
        fs.unlinkSync(f.tempFilePath);
      }
    });

    successResponse(res, {
      count:   mapped.length,
      results: mapped,
    });

  } catch (err) {
    console.error('Batch extract error:', err);
    errorResponse(res, err.message, 500);
  }
});

// ─── POST /detect-blur ────────────────────────────────────────────────────────
app.post('/detect-blur', async (req, res) => {
  if (!req.files || !req.files.image) {
    return errorResponse(res, 'No image file provided.');
  }

  const file = req.files.image;

  try {
    const level = await blurocr.detectBlur(file.tempFilePath || file.data);

    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    successResponse(res, {
      filename:  file.name,
      blurLevel: level,
      description: {
        sharp:    'Minimal processing needed — image is already clean',
        mild:     'Moderate processing applied — slight blur detected',
        blurry:   'Aggressive processing applied — significant blur detected',
        veryBlur: 'Maximum processing applied — severe blur detected',
      }[level],
    });

  } catch (err) {
    errorResponse(res, err.message, 500);
  }
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  errorResponse(res, `Route ${req.method} ${req.path} not found`, 404);
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  errorResponse(res, 'Internal server error', 500);
});

// ─── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════╗
║         BlurOCR REST API v${blurocr.version}          ║
╠══════════════════════════════════════════╣
║  Server  : http://${HOST}:${PORT}          
║  Health  : http://${HOST}:${PORT}/health   
║  Browser : http://${HOST}:${PORT}/browser/BlurOCR.html
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully…');
  server.close(async () => {
    await blurocr.cleanup();
    process.exit(0);
  });
});

module.exports = app; // for testing
