import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/core/config/index.js';
import { authenticateUser, AuthenticationError, normalizeEmail } from '../src/modules/auth/auth.service.js';

function createClient(initialUser) {
  let user = initialUser ? structuredClone(initialUser) : null;
  const auditEvents = [];

  return {
    auditEvents,
    get userState() {
      return user;
    },
    user: {
      async findUnique() {
        return user;
      },
      async update({data}) {
        user = {...user, ...data};
        return user;
      }
    },
    auditLog: {
      async create({data}) {
        auditEvents.push(data);
        return data;
      }
    }
  };
}

function activeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'director@example.test',
    displayName: 'Director',
    passwordHash: 'valid-hash',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: [{role: {name: 'DIRECTOR'}}],
    ...overrides
  };
}

test('normalizes email addresses before lookup', () => {
  assert.equal(normalizeEmail('  Director@Example.TEST '), 'director@example.test');
});

test('authenticates an active user and resets account security state', async () => {
  const client = createClient(activeUser({failedLoginAttempts: 2}));
  const now = new Date('2026-07-28T00:00:00Z');
  const user = await authenticateUser({
    email: ' Director@Example.TEST ',
    password: 'correct',
    verifyPassword: async (hash, password) => hash === 'valid-hash' && password === 'correct',
    dummyPasswordHash: 'dummy-hash',
    client,
    now
  });

  assert.deepEqual(user.roles, ['DIRECTOR']);
  assert.equal(client.userState.failedLoginAttempts, 0);
  assert.equal(client.userState.lockedUntil, null);
  assert.equal(client.userState.lastLoginAt, now);
  assert.equal(client.auditEvents.at(-1).action, 'AUTH_LOGIN_SUCCEEDED');
});

test('returns the same generic error for an unknown email and incorrect password', async () => {
  for (const client of [createClient(null), createClient(activeUser())]) {
    await assert.rejects(
      authenticateUser({
        email: 'unknown@example.test',
        password: 'incorrect',
        verifyPassword: async () => false,
        dummyPasswordHash: 'dummy-hash',
        client
      }),
      (error) => error instanceof AuthenticationError && error.message === 'Invalid email or password.'
    );
    assert.equal(client.auditEvents.at(-1).action, 'AUTH_LOGIN_FAILED');
  }
});

test('rejects inactive users with the generic error', async () => {
  const client = createClient(activeUser({isActive: false}));
  await assert.rejects(
    authenticateUser({
      email: 'director@example.test',
      password: 'correct',
      verifyPassword: async () => true,
      dummyPasswordHash: 'dummy-hash',
      client
    }),
    AuthenticationError
  );
});

test('locks an account after the configured number of failures', async () => {
  const client = createClient(activeUser());
  const now = new Date('2026-07-28T00:00:00Z');

  for (let attempt = 0; attempt < config.auth.maxFailedAttempts; attempt += 1) {
    await assert.rejects(authenticateUser({
      email: 'director@example.test',
      password: 'incorrect',
      verifyPassword: async () => false,
      dummyPasswordHash: 'dummy-hash',
      client,
      now
    }), AuthenticationError);
  }

  assert.equal(client.userState.failedLoginAttempts, config.auth.maxFailedAttempts);
  assert.equal(client.userState.lockedUntil.getTime(), now.getTime() + config.auth.lockDurationMs);
});
