import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = resolve(
  frontendDirectory,
  'node_modules',
  '@vladmandic',
  'face-api',
  'model'
);
const publicModelDirectory = resolve(frontendDirectory, 'public', 'models');
const modelFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

mkdirSync(publicModelDirectory, { recursive: true });
for (const file of modelFiles) {
  copyFileSync(resolve(modelDirectory, file), resolve(publicModelDirectory, file));
}
