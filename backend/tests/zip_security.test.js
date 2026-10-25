import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createProjectZip } from '../src/services/zip.service.js';

test('Source archive excludes secret and local runtime files', async () => {
  const archive = await JSZip.loadAsync(await createProjectZip());
  const names = Object.keys(archive.files);

  assert.ok(names.includes('HCM-Lite/backend/.env.example'));
  assert.ok(names.includes('HCM-Lite/frontend/.env.example'));
  assert.ok(names.includes('HCM-Lite/backend/package.json'));
  assert.ok(names.every((name) => !/(^|\/)\.env(?:\.(?!example)[^/]*)?$/.test(name)));
  assert.ok(names.every((name) => !name.includes('.hcm_db_')));
  assert.ok(names.every((name) => !name.split('/').includes('node_modules')));
});
