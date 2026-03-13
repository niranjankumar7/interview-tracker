#!/usr/bin/env node
/**
 * Build script for Interview Tracker Extension
 * Runs TypeScript compilation and Vite build
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🔨 Building Interview Tracker Extension...\n');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
try {
  if (existsSync(resolve(rootDir, 'dist'))) {
    execSync('rm -rf dist', { cwd: rootDir, stdio: 'inherit' });
  }
  mkdirSync(resolve(rootDir, 'dist'), { recursive: true });
  console.log('✅ Dist directory cleaned\n');
} catch (error) {
  console.error('❌ Failed to clean dist directory:', error.message);
  process.exit(1);
}

// Run TypeScript check
console.log('🔍 Running TypeScript type check...');
try {
  execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ TypeScript check passed\n');
} catch (error) {
  console.error('❌ TypeScript check failed');
  process.exit(1);
}

// Run Vite build
console.log('📦 Running Vite build...');
try {
  execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Vite build completed\n');
} catch (error) {
  console.error('❌ Vite build failed');
  process.exit(1);
}

// Copy static files
console.log('📋 Copying static files...');
try {
  // Ensure icons directory exists
  const iconsDir = resolve(rootDir, 'dist/icons');
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  // Copy manifest.json
  copyFileSync(
    resolve(rootDir, 'src/manifest.json'),
    resolve(rootDir, 'dist/manifest.json')
  );

  // Copy popup CSS
  copyFileSync(
    resolve(rootDir, 'src/popup/popup.css'),
    resolve(rootDir, 'dist/popup.css')
  );

  // Copy and update popup HTML
  let popupHtml = readFileSync(resolve(rootDir, 'src/popup/popup.html'), 'utf-8');
  // Update script path for built JS
  popupHtml = popupHtml.replace(
    'src="popup.js"',
    'src="popup.js"'
  );
  // Update CSS path
  popupHtml = popupHtml.replace(
    'href="popup.css"',
    'href="popup.css"'
  );
  writeFileSync(resolve(rootDir, 'dist/popup.html'), popupHtml);

  // Create placeholder icons (SVG-based, will be converted or replaced)
  const iconSizes = [16, 32, 48, 128];
  iconSizes.forEach(size => {
    const iconPath = resolve(iconsDir, `icon${size}.png`);
    if (!existsSync(iconPath)) {
      // Create a simple SVG and note to replace with actual PNG
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#4f46e5" rx="10"/>
        <text x="50" y="65" font-size="45" text-anchor="middle" fill="white" font-family="Arial">IT</text>
      </svg>`;
      writeFileSync(resolve(iconsDir, `icon${size}.svg`), svgContent);
    }
  });

  console.log('✅ Static files copied\n');
} catch (error) {
  console.error('❌ Failed to copy static files:', error.message);
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('📁 Output: dist/');
console.log('\nNext steps:');
console.log('  1. Load extension in Chrome: chrome://extensions → Developer mode → Load unpacked → Select dist/');
console.log('  2. Or run: npm run package  to create distributable zip');
