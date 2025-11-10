const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', 'public');
const targetDir = path.resolve(__dirname, '..', 'dist', 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(sourceDir)) {
  console.warn([copy-public] source directory  nerastas – praleidžiame.);
  process.exit(0);
}

copyRecursive(sourceDir, targetDir);
console.log([copy-public] Nukopijuota  -> );
