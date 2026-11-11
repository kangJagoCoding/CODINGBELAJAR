import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function packProject() {
  const zip = new JSZip();
  const rootDir = process.cwd();

  const ignoreList = new Set([
    'node_modules',
    'dist',
    '.playwright-cli',
    '.git',
    '.aistudio',
    'bun.lock',
    'scripts',
  ]);

  function addDirectory(currentDir, zipFolder) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoreList.has(entry.name)) continue;
      if (entry.name.endsWith('.zip')) continue; // don't zip previous zips
      if (entry.name.startsWith('.playwright')) continue;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const subZip = zipFolder.folder(entry.name);
        addDirectory(fullPath, subZip);
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  }

  console.log('Packaging project files into ZIP...');
  addDirectory(rootDir, zip);

  const outDir = path.join(rootDir, 'public');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outZipPath = path.join(outDir, 'augmentlab-frontend.zip');
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(outZipPath, buffer);
  const sizeKb = Math.round(buffer.length / 1024);
  console.log(`Success! Created ${outZipPath} (${sizeKb} KiB)`);
}

packProject().catch((err) => {
  console.error('Failed to pack project:', err);
  process.exit(1);
});
