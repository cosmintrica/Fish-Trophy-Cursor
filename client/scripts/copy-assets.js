import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy public assets to dist
let publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');

// Check if we're in Vercel build environment
const isVercel = process.env.VERCEL === '1';
console.log('🚀 Environment:', isVercel ? 'Vercel' : 'Local');

// If public directory doesn't exist, copy essential files directly to dist
if (!fs.existsSync(publicDir)) {
  console.log('📁 Public directory not found, copying essential files directly to dist...');
  
  // Copy favicon directly to dist
  try {
    const faviconSrc = path.join(__dirname, '../src/assets/favicon.ico');
    if (fs.existsSync(faviconSrc)) {
      fs.copyFileSync(faviconSrc, path.join(distDir, 'favicon.ico'));
      console.log('✅ Copied favicon.ico to dist');
    }
  } catch (error) {
    console.log('⚠️ Could not copy favicon:', error.message);
  }
  
  // Also try to copy other essential files from src/assets
  const assetsDir = path.join(__dirname, '../src/assets');
  if (fs.existsSync(assetsDir)) {
    try {
      const assets = fs.readdirSync(assetsDir);
      for (const asset of assets) {
        if (asset.endsWith('.png') || asset.endsWith('.svg') || asset.endsWith('.ico')) {
          fs.copyFileSync(path.join(assetsDir, asset), path.join(distDir, asset));
          console.log(`✅ Copied ${asset} to dist`);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not copy assets:', error.message);
    }
  }
  
  console.log('✅ Essential files copied, build should work now');
  process.exit(0);
}

console.log('🔍 Debug paths:');
console.log('__dirname:', __dirname);
console.log('publicDir:', publicDir);
console.log('distDir:', distDir);
console.log('publicDir exists:', fs.existsSync(publicDir));
console.log('distDir exists:', fs.existsSync(distDir));

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy all files from public to dist
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

try {
  copyDir(publicDir, distDir);
  console.log('✅ Assets copied successfully!');
} catch (error) {
  console.error('❌ Error copying assets:', error);
  process.exit(1);
}
