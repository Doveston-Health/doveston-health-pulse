import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuthentication, requireRole } from '../src/modules/auth/auth.middleware.js';

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    redirectStatus: null,
    redirectPath: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    redirect(status, path) {
      this.redirectStatus = status;
      this.redirectPath = path;
      return this;
    }
  };
}

test('unauthenticated API access returns HTTP 401 JSON', () => {
  const response = responseRecorder();
  requireAuthentication({path: '/api/auth/me', originalUrl: '/api/auth/me', id: 'request-1'}, response, () => assert.fail());
  assert.equal(response.statusCode, 401);
  assert.equal(response.payload.error, 'Authentication required.');
});

test('unauthenticated browser access redirects to login', () => {
  const response = responseRecorder();
  requireAuthentication({path: '/', originalUrl: '/', id: 'request-2'}, response, () => assert.fail());
  assert.equal(response.redirectStatus, 303);
  assert.equal(response.redirectPath, '/login');
});

test('role middleware grants an allowed role', () => {
  let nextCalled = false;
  requireRole('DIRECTOR')(
    {authenticatedUser: {roles: ['DIRECTOR']}, path: '/api/example', originalUrl: '/api/example'},
    responseRecorder(),
    () => { nextCalled = true; }
  );
  assert.equal(nextCalled, true);
});

test('role middleware denies an unassigned role with HTTP 403', () => {
  const response = responseRecorder();
  requireRole('DIRECTOR')(
    {authenticatedUser: {roles: ['CLINICIAN']}, path: '/api/example', originalUrl: '/api/example', id: 'request-3'},
    response,
    () => assert.fail()
  );
  assert.equal(response.statusCode, 403);
});
