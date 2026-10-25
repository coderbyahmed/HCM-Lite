import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { config } from '../src/config/env.js';

test('default Express export serves the API and restricts credentialed CORS', async () => {
  assert.equal(typeof app, 'function');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const allowedOrigin = config.frontendUrls[0];
    const allowedResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: allowedOrigin },
    });

    assert.equal(allowedResponse.status, 200);
    assert.equal(allowedResponse.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.equal(allowedResponse.headers.get('access-control-allow-credentials'), 'true');

    const deniedResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(deniedResponse.status, 200);
    assert.equal(deniedResponse.headers.get('access-control-allow-origin'), null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
