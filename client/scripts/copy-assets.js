import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define source and destination directories
const sourceDir = join(__dirname, '../public');
const destDir = join(__dirname, '../dist');

// Ensure dist directory exists
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
  console.log(`📁 Created dist directory: ${destDir}`);
}

// Wait a bit for Vite to finish building
console.log(`🔍 Source directory: ${sourceDir}`);
console.log(`🔍 Destination directory: ${destDir}`);
console.log(`🔍 Source exists: ${existsSync(sourceDir)}`);
console.log(`🔍 Dest exists: ${existsSync(destDir)}`);

// Files to copy
const filesToCopy = [
  'icon_free.png',
  'icon_premium.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'site.webmanifest',
  'social-preview.html'
];

// Copy each file
filesToCopy.forEach(file => {
  const sourcePath = join(sourceDir, file);
  const destPath = join(destDir, file);
  
  console.log(`🔍 Checking: ${file}`);
  console.log(`   Source: ${sourcePath} (exists: ${existsSync(sourcePath)})`);
  console.log(`   Dest: ${destPath}`);
  
  if (existsSync(sourcePath)) {
    try {
      copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file} to dist/`);
    } catch (error) {
      console.error(`❌ Error copying ${file}:`, error.message);
    }
  } else {
    console.log(`⚠️  Warning: ${file} not found in public/`);
  }
});

console.log('🎯 Asset copying completed!');
