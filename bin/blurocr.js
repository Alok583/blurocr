#!/usr/bin/env node
/**
 * BlurOCR CLI — Command Line Interface
 * 
 * Usage:
 *   blurocr extract image.jpg
 *   blurocr extract image.jpg --lang eng --psm 6 --output result.txt
 *   blurocr extract image.jpg --json
 *   blurocr extract image.jpg --save-preprocessed debug.png
 *   blurocr batch *.jpg --lang eng --output-dir ./results
 *   blurocr detect-blur image.jpg
 *   blurocr serve --port 3000
 */

'use strict';

const { Command }     = require('commander');
const chalk           = require('chalk');
const ora             = require('ora');
const Table           = require('cli-table3');
const fs              = require('fs');
const path            = require('path');
const blurocr         = require('../src/index');

const program = new Command();

// ─── Version / header ─────────────────────────────────────────────────────────
program
  .name('blurocr')
  .description(
    chalk.cyan('BlurOCR') + ' — Advanced OCR with 10-stage blur recovery pipeline\n' +
    '  Open source · No API key · Runs on Node.js / VPS / Docker'
  )
  .version(blurocr.version, '-v, --version', 'Output the current version');

// ─── extract command ──────────────────────────────────────────────────────────
program
  .command('extract <image>')
  .description('Extract text from a single image')
  .option('-l, --lang <lang>',         'OCR language (e.g. eng, fra, deu)', 'eng')
  .option('-p, --psm <mode>',          'Page Segmentation Mode (1–13)', '6')
  .option('-b, --blur-level <level>',  'Force blur preset: sharp|mild|blurry|veryBlur (default: auto)')
  .option('-o, --output <file>',       'Save extracted text to file')
  .option('-j, --json',                'Output full result as JSON')
  .option('--hocr',                    'Output hOCR XML')
  .option('--save-preprocessed <path>','Save preprocessed image to path for debugging')
  .option('-q, --quiet',               'Suppress progress output')
  .action(async (imagePath, opts) => {
    // Validate input
    if (!fs.existsSync(imagePath)) {
      console.error(chalk.red(`Error: File not found: ${imagePath}`));
      process.exit(1);
    }

    const spinner = opts.quiet ? null : ora(chalk.cyan('Analysing image…')).start();

    const onProgress = (stage, msg) => {
      if (spinner) spinner.text = chalk.cyan(`[${stage}] `) + msg;
    };

    try {
      const result = await blurocr.extract(imagePath, {
        lang:             opts.lang,
        psm:              opts.psm,
        blurLevel:        opts.blurLevel,
        savePreprocessed: opts.savePreprocessed,
        onProgress,
      });

      if (spinner) spinner.succeed(chalk.green('Extraction complete'));

      // ── JSON output mode ──
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      // ── hOCR output mode ──
      if (opts.hocr) {
        console.log(result.hocr);
        return;
      }

      // ── Human-readable output ──
      if (!opts.quiet) {
        console.log('');
        const table = new Table({
          head:  [chalk.cyan('Metric'), chalk.cyan('Value')],
          style: { head: [], border: [] },
        });
        table.push(
          ['File',            path.basename(imagePath)],
          ['Blur Level',      blurBadge(result.blurLevel)],
          ['Confidence',      confBadge(result.confidence)],
          ['Words',           result.meta.wordCount],
          ['Lines',           result.meta.lineCount],
          ['Preprocessing',  `${result.meta.preprocessingMs}ms`],
          ['OCR',             `${result.meta.ocrMs}ms`],
          ['Total',           `${result.meta.totalMs}ms`],
        );
        console.log(table.toString());
        console.log('');
        console.log(chalk.bold.white('─── Extracted Text ───────────────────────────'));
        console.log(chalk.white(result.text));
        console.log(chalk.gray('──────────────────────────────────────────────'));
      } else {
        // Quiet mode: just print text
        console.log(result.text);
      }

      // ── Save to file ──
      if (opts.output) {
        fs.writeFileSync(opts.output, result.text, 'utf8');
        if (!opts.quiet) console.log(chalk.green(`\nText saved to ${opts.output}`));
      }

      if (opts.savePreprocessed && !opts.quiet) {
        console.log(chalk.gray(`Preprocessed image saved to ${opts.savePreprocessed}`));
      }

    } catch (err) {
      if (spinner) spinner.fail(chalk.red('Extraction failed'));
      console.error(chalk.red(err.message));
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    } finally {
      await blurocr.cleanup();
    }
  });

// ─── batch command ────────────────────────────────────────────────────────────
program
  .command('batch <images...>')
  .description('Extract text from multiple images')
  .option('-l, --lang <lang>',        'OCR language', 'eng')
  .option('-p, --psm <mode>',         'Page Segmentation Mode', '6')
  .option('-d, --output-dir <dir>',   'Directory to save .txt results (one per image)')
  .option('-j, --json',               'Output all results as JSON array')
  .option('-c, --concurrency <n>',    'Max parallel jobs', '2')
  .action(async (images, opts) => {
    console.log(chalk.cyan(`\nBlurOCR Batch — Processing ${images.length} images…\n`));

    // Validate all files exist
    const missing = images.filter(f => !fs.existsSync(f));
    if (missing.length > 0) {
      console.error(chalk.red(`Files not found: ${missing.join(', ')}`));
      process.exit(1);
    }

    const spinner = ora(chalk.cyan(`Processing 0/${images.length}…`)).start();
    let done = 0;

    const results = await blurocr.extractBatch(
      images,
      { lang: opts.lang, psm: opts.psm },
      parseInt(opts.concurrency)
    );

    spinner.succeed(chalk.green(`Processed ${results.length} images`));

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Print summary table
      const table = new Table({
        head:  [chalk.cyan('File'), chalk.cyan('Conf'), chalk.cyan('Words'), chalk.cyan('Blur'), chalk.cyan('Status')],
        style: { head: [], border: [] },
      });

      results.forEach((r, i) => {
        const fname = path.basename(images[i]);
        if (r.error) {
          table.push([fname, '—', '—', '—', chalk.red('ERROR: ' + r.error)]);
        } else {
          table.push([
            fname.slice(0, 30),
            confBadge(r.confidence),
            r.meta?.wordCount || '—',
            blurBadge(r.blurLevel),
            chalk.green('✓ OK'),
          ]);
        }
      });

      console.log(table.toString());
    }

    // Save output files
    if (opts.outputDir) {
      fs.mkdirSync(opts.outputDir, { recursive: true });
      results.forEach((r, i) => {
        if (!r.error) {
          const base = path.basename(images[i], path.extname(images[i]));
          const out  = path.join(opts.outputDir, base + '.txt');
          fs.writeFileSync(out, r.text, 'utf8');
        }
      });
      console.log(chalk.green(`\nResults saved to ${opts.outputDir}/`));
    }

    await blurocr.cleanup();
  });

// ─── detect-blur command ──────────────────────────────────────────────────────
program
  .command('detect-blur <image>')
  .description('Detect blur level of an image (no OCR)')
  .action(async (imagePath) => {
    if (!fs.existsSync(imagePath)) {
      console.error(chalk.red(`File not found: ${imagePath}`));
      process.exit(1);
    }
    const level = await blurocr.detectBlur(imagePath);
    const desc  = {
      sharp:    'Image is sharp — minimal processing needed',
      mild:     'Mild blur — moderate processing will be applied',
      blurry:   'Significant blur — aggressive processing needed',
      veryBlur: 'Severe blur — maximum enhancement will be applied',
    };
    console.log(`${blurBadge(level)} — ${desc[level]}`);
  });

// ─── serve command ────────────────────────────────────────────────────────────
program
  .command('serve')
  .description('Start the BlurOCR REST API server')
  .option('-p, --port <port>',  'Port to listen on', '3000')
  .option('-H, --host <host>',  'Host to bind to', '0.0.0.0')
  .action((opts) => {
    process.env.PORT = opts.port;
    process.env.HOST = opts.host;
    require('../src/server');
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function confBadge(conf) {
  if (conf > 80) return chalk.green(conf + '%');
  if (conf > 50) return chalk.yellow(conf + '%');
  return chalk.red(conf + '%');
}

function blurBadge(level) {
  const map = {
    sharp:    chalk.green('sharp'),
    mild:     chalk.yellow('mild blur'),
    blurry:   chalk.red('blurry'),
    veryBlur: chalk.bgRed.white('VERY BLURRY'),
  };
  return map[level] || level;
}

program.parse(process.argv);
