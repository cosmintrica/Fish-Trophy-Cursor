import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy public assets to dist
const publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');

// Check if we're in Vercel build environment
const isVercel = process.env.VERCEL === '1';
console.log('🚀 Environment:', isVercel ? 'Vercel' : 'Local');

// In Vercel, try different possible locations for public files
if (isVercel) {
  const possiblePaths = [
    path.join(__dirname, '../public'),           // client/public
    path.join(__dirname, '../../client/public'), // workspace/client/public
    path.join(__dirname, '../../public'),        // workspace/public
  ];
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      console.log('📁 Found public at:', testPath);
      publicDir = testPath;
      break;
    }
  }
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
