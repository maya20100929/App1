const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const src = process.argv[2];
  if (!src) {
    console.error('Usage: node scripts/generate-icons.js <source-png>');
    process.exit(1);
  }

  const assetDir = path.join(__dirname, '..', 'assets', 'images');
  const webDir = path.join(__dirname, '..', 'web');
  await ensureDir(assetDir);
  await ensureDir(webDir);

  const tasks = [
    { name: 'icon.png', size: 1024, ops: (s) => s.png(), target: 'asset' },
    { name: 'android-icon-foreground.png', size: 1024, ops: (s) => s.png(), target: 'asset' },
    { name: 'android-icon-background.png', size: 1024, ops: (s) => s.png(), target: 'asset' },
    { name: 'android-icon-monochrome.png', size: 1024, ops: (s) => s.grayscale().png(), target: 'asset' },
    { name: 'favicon.png', size: 32, ops: (s) => s.png(), target: 'both' },
    { name: 'icon-192.png', size: 192, ops: (s) => s.png(), target: 'web' },
    { name: 'icon-512.png', size: 512, ops: (s) => s.png(), target: 'web' },
    { name: 'apple-touch-icon.png', size: 180, ops: (s) => s.png(), target: 'web' }
  ];

  for (const t of tasks) {
    const targets = t.target === 'both' ? [assetDir, webDir] : [t.target === 'asset' ? assetDir : webDir];
    for (const targetDir of targets) {
      const outPath = path.join(targetDir, t.name);
      const pipeline = sharp(src)
        .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
      await t.ops(pipeline).toFile(outPath);
      console.log('Wrote', outPath);
    }
  }

  console.log('All icons generated in', assetDir, 'and', webDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
