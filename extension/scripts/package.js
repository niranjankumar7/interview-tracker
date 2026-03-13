#!/usr/bin/env node
/**
 * Package script for Interview Tracker Extension
 * Creates a distributable ZIP file from the dist directory
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('📦 Packaging Interview Tracker Extension...\n');

// Check if dist directory exists
const distDir = resolve(rootDir, 'dist');
if (!existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Read version from manifest
let version = '1.0.0';
try {
  const manifest = JSON.parse(readFileSync(resolve(distDir, 'manifest.json'), 'utf-8'));
  version = manifest.version;
} catch (error) {
  console.warn('⚠️  Could not read version from manifest, using default');
}

// Create releases directory
const releasesDir = resolve(rootDir, 'releases');
if (!existsSync(releasesDir)) {
  mkdirSync(releasesDir, { recursive: true });
}

// Create zip file
const zipName = `interview-tracker-v${version}.zip`;
const zipPath = resolve(releasesDir, zipName);

console.log(`📁 Creating: releases/${zipName}`);

const output = createWriteStream(zipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  console.log(`✅ Package created: ${zipName} (${sizeKB} KB)`);
  console.log(`📂 Location: releases/${zipName}\n`);
  console.log('🎉 Packaging completed successfully!');
  console.log('\nThe extension is ready for distribution:');
  console.log('  - Chrome Web Store: Upload releases/' + zipName);
  console.log('  - Manual install: Unzip and load as unpacked extension');
});

archive.on('error', (err) => {
  console.error('❌ Packaging failed:', err.message);
  process.exit(1);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ ', err.message);
  } else {
    throw err;
  }
});

// Pipe archive data to the file
archive.pipe(output);

// Add dist directory contents to the root of the zip
archive.directory(distDir, false);

// Finalize the archive
archive.finalize();
