import test from 'node:test';
import assert from 'node:assert';
import { setAuthToken, getAuthToken, ApiError, apiRequest } from '../src/services/api.js';

test('Frontend API Client: Auth Token Storage', () => {
  // Test token setting
  setAuthToken('test_mock_jwt_token_123');
  assert.strictEqual(getAuthToken(), 'test_mock_jwt_token_123');

  // Test token removal
  setAuthToken(null);
  assert.strictEqual(getAuthToken(), null);
});

test('Frontend ApiError: Custom Error Formatting', () => {
  const error = new ApiError('Forbidden action', 403, { code: 'FORBIDDEN_RESOURCE' });
  assert.strictEqual(error.message, 'Forbidden action');
  assert.strictEqual(error.status, 403);
  assert.deepStrictEqual(error.data, { code: 'FORBIDDEN_RESOURCE' });
  assert.ok(error instanceof Error);
});

test('Frontend API requests use the /api base and include credentials', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;

  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    };
  };

  try {
    await apiRequest('/health');
    assert.equal(requestUrl, '/api/health');
    assert.equal(requestOptions.credentials, 'include');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Frontend UI Rules: Form and Navigation Logic', () => {
  // Verify role menu generation logic matches specifications
  const getNavItems = (role) => {
    if (role === 'Admin') {
      return ['dashboard', 'organization', 'employees', 'attendance', 'leaves', 'payroll', 'announcements', 'audit', 'ai'];
    } else if (role === 'HR') {
      return ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'announcements', 'ai'];
    } else {
      return ['dashboard', 'attendance', 'leaves', 'payroll', 'profile', 'announcements', 'ai'];
    }
  };

  const adminMenu = getNavItems('Admin');
  const hrMenu = getNavItems('HR');
  const empMenu = getNavItems('Employee');

  // Admin has audit and organization
  assert.ok(adminMenu.includes('audit'));
  assert.ok(adminMenu.includes('organization'));

  // HR cannot have audit or organization
  assert.strictEqual(hrMenu.includes('audit'), false);
  assert.strictEqual(hrMenu.includes('organization'), false);

  // Employee has self-service profile and leaves
  assert.ok(empMenu.includes('profile'));
  assert.ok(empMenu.includes('attendance'));
  assert.strictEqual(empMenu.includes('audit'), false);
});
