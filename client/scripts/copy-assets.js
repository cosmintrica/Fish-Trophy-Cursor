import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure dist directory exists
try {
  mkdirSync('dist', { recursive: true });
} catch (error) {
  // Directory already exists
}

// Copy icon files
const iconFiles = ['icon_free.png', 'icon_premium.png'];

iconFiles.forEach(iconFile => {
  try {
    copyFileSync(
      join('public', iconFile),
      join('dist', iconFile)
    );
    console.log(`✅ Copied ${iconFile} to dist/`);
  } catch (error) {
    console.error(`❌ Failed to copy ${iconFile}:`, error.message);
  }
});

console.log('🎯 Asset copying completed!');
