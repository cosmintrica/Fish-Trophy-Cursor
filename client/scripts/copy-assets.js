const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, '../public');
const destDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Files to copy
const filesToCopy = [
  'icon_free.png',
  'icon_premium.png',
  'favicon.ico',
  'social-preview.html'
];

// Copy each file
filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${file} to dist/`);
  } else {
    console.log(`⚠️  Warning: ${file} not found in public/`);
  }
});

console.log('🎯 Asset copying completed!');
