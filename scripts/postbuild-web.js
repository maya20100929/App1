const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const webDir = path.join(__dirname, '..', 'web');

function copyFile(name) {
  const from = path.join(webDir, name);
  const to = path.join(distDir, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log('Copied', name, 'to dist');
  } else {
    console.warn('Missing web asset:', name);
  }
}

function patchIndex() {
  const indexPath = path.join(distDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  let patched = html;

  // Replace default icon if present.
  patched = patched.replace(
    /<link rel="icon" href="\/favicon\.ico"\s*\/?>/gi,
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />\n    <link rel="manifest" href="/manifest.json" />\n    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n    <meta name="theme-color" content="#E6F4FE" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="default" />'
  );

  if (!patched.includes('<link rel="manifest" href="/manifest.json"')) {
    // If replacement did not occur, inject before </head>
    patched = patched.replace(
      /<\/head>/i,
      '    <link rel="manifest" href="/manifest.json" />\n    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />\n    <meta name="theme-color" content="#E6F4FE" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="default" />\n  </head>'
    );
  }

  fs.writeFileSync(indexPath, patched, 'utf8');
  console.log('Patched dist/index.html with PWA metadata');
}

copyFile('manifest.json');
copyFile('favicon.png');
copyFile('icon-192.png');
copyFile('icon-512.png');
copyFile('apple-touch-icon.png');
patchIndex();
