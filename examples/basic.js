/**
 * BlurOCR — Usage Examples
 * 
 * Run: node examples/basic.js
 */

'use strict';

const blurocr = require('../src/index');
const path    = require('path');

async function main() {
  console.log('BlurOCR v' + blurocr.version + ' — Examples\n');

  // ── Example 1: Simple extraction ─────────────────────────────────────────
  console.log('Example 1: Simple extraction from file path');
  // const result = await blurocr.extract('path/to/your/image.jpg');
  // console.log(result.text);

  // ── Example 2: With options ───────────────────────────────────────────────
  console.log('Example 2: With custom options');
  /*
  const result = await blurocr.extract('receipt.jpg', {
    lang: 'eng',
    psm:  '6',
    blurLevel: 'blurry',          // force preset instead of auto-detect
    savePreprocessed: 'debug.png', // save enhanced image for inspection
    onProgress: (stage, msg) => console.log(`[${stage}] ${msg}`),
  });
  
  console.log('Text:',       result.text);
  console.log('Confidence:', result.confidence + '%');
  console.log('Blur level:', result.blurLevel);
  console.log('Words:',      result.words.length);
  */

  // ── Example 3: Batch processing ───────────────────────────────────────────
  console.log('Example 3: Batch processing');
  /*
  const files = ['receipt1.jpg', 'receipt2.jpg', 'form.png'];
  const results = await blurocr.extractBatch(files, { lang: 'eng' }, 2);
  
  results.forEach((r, i) => {
    if (r.error) {
      console.log(`${files[i]}: ERROR — ${r.error}`);
    } else {
      console.log(`${files[i]}: ${r.confidence}% confidence, ${r.meta.wordCount} words`);
    }
  });
  */

  // ── Example 4: Blur detection only ────────────────────────────────────────
  console.log('Example 4: Blur detection');
  /*
  const level = await blurocr.detectBlur('photo.jpg');
  console.log('Blur level:', level); // 'sharp' | 'mild' | 'blurry' | 'veryBlur'
  */

  // ── Example 5: Buffer input ───────────────────────────────────────────────
  console.log('Example 5: Buffer input (e.g. from HTTP upload)');
  /*
  const fs = require('fs');
  const buffer = fs.readFileSync('scan.png');
  const result = await blurocr.extract(buffer, { lang: 'eng' });
  console.log(result.text);
  */

  // ── Example 6: Express.js integration ────────────────────────────────────
  console.log('Example 6: Express.js integration');
  /*
  const express    = require('express');
  const fileUpload = require('express-fileupload');
  const blurocr    = require('blurocr');
  
  const app = express();
  app.use(fileUpload());
  
  app.post('/ocr', async (req, res) => {
    const buffer = req.files.image.data;
    const result = await blurocr.extract(buffer);
    res.json({ text: result.text, confidence: result.confidence });
  });
  
  app.listen(3000);
  */

  console.log('\nAll examples shown. Uncomment any block to run it.');

  await blurocr.cleanup();
}

main().catch(console.error);
