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
    const rootResponse = await fetch(`${baseUrl}/`);
    assert.equal(rootResponse.status, 200);
    assert.deepEqual(await rootResponse.json(), {
      service: 'HCM Lite API',
      health: '/api/health',
    });

    const allowedResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: allowedOrigin },
    });

    assert.equal(allowedResponse.status, 200);
    assert.equal(allowedResponse.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.equal(allowedResponse.headers.get('access-control-allow-credentials'), 'true');

    const preflightResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    assert.equal(preflightResponse.status, 204);
    assert.equal(preflightResponse.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.equal(preflightResponse.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflightResponse.headers.get('access-control-allow-methods'), /POST/);

    const deniedResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(deniedResponse.status, 403);
    assert.equal(deniedResponse.headers.get('access-control-allow-origin'), null);
    const deniedBody = await deniedResponse.json();
    assert.equal(deniedBody.success, false);
    assert.equal(deniedBody.message, 'Request origin is not allowed by backend CORS configuration.');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
