// Generates optimized PWA icons from public/icon_free.png
// Requires: sharp (installed as a dev dependency)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const srcIcon = path.join(publicDir, 'icon_free.png');

const targets = [
  { out: 'icon-192.png', size: 192 },
  { out: 'icon-512.png', size: 512 },
];

async function run() {
  if (!fs.existsSync(srcIcon)) {
    console.warn(`⚠️  Source icon not found: ${srcIcon}. Skipping icon generation.`);
    return;
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.warn('⚠️  sharp is not installed; copying original icon as fallbacks.');
    for (const t of targets) {
      const dest = path.join(publicDir, t.out);
      fs.copyFileSync(srcIcon, dest);
      console.log(`Copied fallback: ${t.out}`);
    }
    return;
  }

  for (const t of targets) {
    const dest = path.join(publicDir, t.out);
    try {
      // Cover fit with transparent background for maskable safety
      await sharp(srcIcon)
        .resize({ width: t.size, height: t.size, fit: 'cover' })
        .png({ compressionLevel: 9, adaptiveFiltering: true, quality: 90 })
        .toFile(dest);
      console.log(`✅ Generated ${t.out}`);
    } catch (err) {
      console.error(`❌ Failed generating ${t.out}:`, err);
      // Fallback copy
      fs.copyFileSync(srcIcon, dest);
      console.log(`Copied fallback: ${t.out}`);
    }
  }
}

run().catch((e) => {
  console.error('Icon generation failed:', e);
  process.exit(1);
});

