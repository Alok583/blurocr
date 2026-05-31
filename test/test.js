'use strict';

const assert = require('assert');
const path   = require('path');
const ROOT   = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\nBlurOCR Test Suite\n');

// ── Module Loading ────────────────────────────────────────────────────────────
console.log('Module Loading:');

test('blurocr main module loads', () => {
  const b = require(path.join(ROOT, 'src/index'));
  assert.ok(b);
});

test('extract function exported', () => {
  const { extract } = require(path.join(ROOT, 'src/index'));
  assert.strictEqual(typeof extract, 'function');
});

test('extractBatch function exported', () => {
  const { extractBatch } = require(path.join(ROOT, 'src/index'));
  assert.strictEqual(typeof extractBatch, 'function');
});

test('detectBlur function exported', () => {
  const { detectBlur } = require(path.join(ROOT, 'src/index'));
  assert.strictEqual(typeof detectBlur, 'function');
});

test('cleanup function exported', () => {
  const { cleanup } = require(path.join(ROOT, 'src/index'));
  assert.strictEqual(typeof cleanup, 'function');
});

test('version is a string', () => {
  const { version } = require(path.join(ROOT, 'src/index'));
  assert.strictEqual(typeof version, 'string');
  assert.ok(version.length > 0);
});

// ── Preprocessor Module ───────────────────────────────────────────────────────
console.log('\nPreprocessor Module:');

test('preprocessor loads', () => {
  const p = require(path.join(ROOT, 'src/preprocessor'));
  assert.ok(p);
});

test('preprocessImage function exported', () => {
  const { preprocessImage } = require(path.join(ROOT, 'src/preprocessor'));
  assert.strictEqual(typeof preprocessImage, 'function');
});

test('detectBlurLevel function exported', () => {
  const { detectBlurLevel } = require(path.join(ROOT, 'src/preprocessor'));
  assert.strictEqual(typeof detectBlurLevel, 'function');
});

test('PRESETS exported with all 4 levels', () => {
  const { PRESETS } = require(path.join(ROOT, 'src/preprocessor'));
  assert.ok(PRESETS.sharp);
  assert.ok(PRESETS.mild);
  assert.ok(PRESETS.blurry);
  assert.ok(PRESETS.veryBlur);
});

// ── OCR Module ────────────────────────────────────────────────────────────────
console.log('\nOCR Module:');

test('ocr module loads', () => {
  const o = require(path.join(ROOT, 'src/ocr'));
  assert.ok(o);
});

test('recognize function exported', () => {
  const { recognize } = require(path.join(ROOT, 'src/ocr'));
  assert.strictEqual(typeof recognize, 'function');
});

test('terminateAll function exported', () => {
  const { terminateAll } = require(path.join(ROOT, 'src/ocr'));
  assert.strictEqual(typeof terminateAll, 'function');
});

// ── Package Configuration ─────────────────────────────────────────────────────
console.log('\nPackage Configuration:');

test('package.json has bin entry', () => {
  const pkg = require(path.join(ROOT, 'package.json'));
  assert.ok(pkg.bin && pkg.bin.blurocr);
});

test('package.json has correct main', () => {
  const pkg = require(path.join(ROOT, 'package.json'));
  assert.strictEqual(pkg.main, 'src/index.js');
});

test('package.json has required dependencies', () => {
  const pkg  = require(path.join(ROOT, 'package.json'));
  const deps = pkg.dependencies;
  assert.ok(deps['tesseract.js']);
  assert.ok(deps['sharp']);
  assert.ok(deps['express']);
  assert.ok(deps['commander']);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`  Total:  ${passed + failed}`);
console.log(`  Passed: ${passed}`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  process.exit(1);
} else {
  console.log('  All tests passed ✓\n');
}
