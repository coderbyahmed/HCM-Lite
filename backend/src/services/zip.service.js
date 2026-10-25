import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const createProjectZip = async () => {
  const zip = new JSZip();
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
  const ignoredNames = new Set(['node_modules', '.git', 'dist', '.aistudio', '.vite']);

  const shouldIgnore = (relPath) => relPath.split(path.sep).some((name) => {
    return (
      ignoredNames.has(name) ||
      name.startsWith('.hcm_db_') ||
      (name.startsWith('.env') && name !== '.env.example')
    );
  });

  const addFolderToZip = (folderPath, zipFolder) => {
    if (!fs.existsSync(folderPath)) return;
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      const relPath = path.relative(rootDir, fullPath);

      if (shouldIgnore(relPath)) continue;

      if (entry.isDirectory()) {
        const subZip = zipFolder.folder(entry.name);
        addFolderToZip(fullPath, subZip);
      } else if (entry.isFile()) {
        zipFolder.file(entry.name, fs.readFileSync(fullPath));
      }
    }
  };

  const baseFolder = zip.folder('HCM-Lite');

  // Add backend folder
  if (fs.existsSync(path.join(rootDir, 'backend'))) {
    addFolderToZip(path.join(rootDir, 'backend'), baseFolder.folder('backend'));
  }

  // Add frontend folder
  if (fs.existsSync(path.join(rootDir, 'frontend'))) {
    addFolderToZip(path.join(rootDir, 'frontend'), baseFolder.folder('frontend'));
  }

  // Add root files
  const rootFilesToInclude = [
    'README.md',
    '.gitignore',
    'package.json',
  ];

  for (const fileName of rootFilesToInclude) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      baseFolder.file(fileName, fs.readFileSync(filePath));
    }
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
};
