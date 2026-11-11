import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const outputZip = path.join(publicDir, 'augmentlab-frontend.zip');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const zip = new JSZip();

// Folders and files to ignore
const IGNORED_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.aistudio',
  '.playwright-cli',
  'bun.lock',
  'augmentlab-frontend.zip',
]);

function addFilesRecursively(dirPath, zipFolder) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subZip = zipFolder.folder(entry.name);
      addFilesRecursively(fullPath, subZip);
    } else if (entry.isFile()) {
      const fileData = fs.readFileSync(fullPath);
      zipFolder.file(entry.name, fileData);
    }
  }
}

console.log('Archiving project source files into ZIP...');
addFilesRecursively(rootDir, zip);

zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
}).then((content) => {
  fs.writeFileSync(outputZip, content);
  const sizeKb = Math.round(content.length / 1024);
  console.log(`Successfully created: ${outputZip} (${sizeKb} KiB)`);
}).catch((err) => {
  console.error('Error generating zip:', err);
  process.exit(1);
});
