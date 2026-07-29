import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoginHandler, createLogoutHandler } from '../src/modules/auth/auth.controller.js';
import { AuthenticationError } from '../src/modules/auth/auth.service.js';

function jsonResponse() {
  return {
    statusCode: 200,
    payload: null,
    clearedCookie: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      return this;
    },
    clearCookie(name) {
      this.clearedCookie = name;
      return this;
    }
  };
}

test('successful login regenerates and saves the session', async () => {
  const calls = [];
  const request = {
    body: {email: 'director@example.test', password: 'correct'},
    session: {
      regenerate(callback) {
        calls.push('regenerate');
        callback();
      },
      save(callback) {
        calls.push('save');
        callback();
      }
    },
    is: () => true
  };
  const response = jsonResponse();
  const handler = createLoginHandler({
    authenticate: async () => ({id: 'user-1', email: 'director@example.test', displayName: 'Director', roles: ['DIRECTOR']}),
    dummyHashProvider: async () => 'dummy-hash'
  });

  await handler(request, response);
  assert.deepEqual(calls, ['regenerate', 'save']);
  assert.equal(request.session.userId, 'user-1');
  assert.equal(response.payload.user.id, 'user-1');
});

test('logout records an audit event and destroys the session', async () => {
  const calls = [];
  const request = {
    authenticatedUser: {id: 'user-1'},
    session: {
      destroy(callback) {
        calls.push('destroy');
        callback();
      }
    },
    log: {warn: () => {}},
    is: () => true
  };
  const response = jsonResponse();
  const handler = createLogoutHandler({
    recordLogoutEvent: async (userId) => calls.push(`audit:${userId}`)
  });

  await handler(request, response);
  assert.deepEqual(calls, ['audit:user-1', 'destroy']);
  assert.equal(response.statusCode, 204);
  assert.equal(response.clearedCookie, 'pulse.sid');
});

test('invalid JSON login returns the generic HTTP 401 response', async () => {
  const request = {
    id: 'request-1',
    body: {email: 'unknown@example.test', password: 'incorrect'},
    session: {},
    is: () => true
  };
  const response = jsonResponse();
  const handler = createLoginHandler({
    authenticate: async () => {
      throw new AuthenticationError();
    },
    dummyHashProvider: async () => 'dummy-hash'
  });

  await handler(request, response);
  assert.equal(response.statusCode, 401);
  assert.equal(response.payload.error, 'Invalid email or password.');
});
