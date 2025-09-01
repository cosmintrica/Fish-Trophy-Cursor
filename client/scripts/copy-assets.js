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
console.log('ðŸš€ Environment:', isVercel ? 'Vercel' : 'Local');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// If public directory doesn't exist, create essential files
if (!fs.existsSync(publicDir)) {
  console.log('ðŸ“ Public directory not found, creating essential files...');
  
  // Create public directory
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Create essential files if they don't exist
  const essentialFiles = [
    { name: 'favicon.ico', content: '# Placeholder favicon' },
    { name: 'icon_free.png', content: '# Placeholder icon' },
    { name: 'manifest.json', content: JSON.stringify({
      name: "Fish Trophy - Platforma Pescarilor din România",
      short_name: "Fish Trophy",
      description: "Descoperă cele mai bune locații de pescuit din România",
      start_url: "/",
      display: "standalone",
      background_color: "#3b82f6",
      theme_color: "#3b82f6",
      icons: [
        { src: "/icon_free.png", sizes: "192x192", type: "image/png" },
        { src: "/icon_free.png", sizes: "512x512", type: "image/png" }
      ]
    }, null, 2) }
  ];
  
  for (const file of essentialFiles) {
    const filePath = path.join(publicDir, file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`âœ… Created ${file.name}`);
    }
  }
}

console.log('ðŸ” Debug paths:');
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
  console.log('âœ… Assets copied successfully!');
} catch (error) {
  console.error('âŒ Error copying assets:', error);
  process.exit(1);
}


