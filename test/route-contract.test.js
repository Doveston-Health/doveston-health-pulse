import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import express from 'express';
import {apiNotFound, errorHandler} from '../src/core/middleware/error-handler.js';
import {requestLogger} from '../src/core/middleware/request-logger.js';
import {securityHeaders} from '../src/core/middleware/security.js';
import {createLoginHandler, createLogoutHandler, getCurrentUser} from '../src/modules/auth/auth.controller.js';
import {requireAuthentication, requireRole} from '../src/modules/auth/auth.middleware.js';
import {createAuthRouter} from '../src/modules/auth/auth.routes.js';
import {getHealth, createGetReadiness} from '../src/modules/system/system.controller.js';
import {createSystemRouter} from '../src/modules/system/system.routes.js';

const authenticatedUser = {
  id: 'quality-user',
  email: 'director@example.test',
  displayName: 'Quality Director',
  roles: ['DIRECTOR']
};

function createSession() {
  return {
    regenerate(callback) {
      callback();
    },
    save(callback) {
      callback();
    },
    destroy(callback) {
      callback();
    }
  };
}

function createContractApp({databaseReady = true} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.locals.isReady = true;
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(express.json());
  app.get('/healthz', getHealth);
  app.use('/api', createSystemRouter({
    readinessHandler: createGetReadiness({
      databaseHealthCheck: async () => databaseReady
    })
  }));
  app.use((request, _response, next) => {
    request.session = createSession();
    if (request.get('x-test-authenticated') === 'true') {
      request.authenticatedUser = authenticatedUser;
    }
    next();
  });
  app.use(createAuthRouter({
    rateLimiter: (_request, _response, next) => next(),
    loginHandler: createLoginHandler({
      authenticate: async ({email, password}) => {
        if (email !== authenticatedUser.email || password !== 'correct-test-password') {
          const {AuthenticationError} = await import('../src/modules/auth/auth.service.js');
          throw new AuthenticationError();
        }
        return authenticatedUser;
      },
      dummyHashProvider: async () => 'test-only-dummy-hash'
    }),
    logoutHandler: createLogoutHandler({
      recordLogoutEvent: async () => {}
    }),
    currentUserHandler: getCurrentUser
  }));
  app.get('/api/authorized', requireAuthentication, (_request, response) => response.json({ok: true}));
  app.get('/director-only', requireRole('DIRECTOR'), (_request, response) => response.json({ok: true}));
  app.get('/', requireAuthentication, (_request, response) => response.type('html').send('<h1>Pulse</h1>'));
  app.use('/api', apiNotFound);
  app.use(errorHandler);
  return app;
}

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health and liveness routes preserve their public JSON contracts', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    for (const route of ['/api/health', '/healthz']) {
      const response = await fetch(`${baseUrl}${route}`, {redirect: 'manual'});
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      assert.ok(response.headers.get('x-request-id'));
      const body = await response.json();
      assert.equal(body.ok, true);
      assert.equal(body.status, 'ok');
      assert.equal(typeof body.uptime, 'number');
      assert.equal(typeof body.version, 'string');
      assert.equal(typeof body.environment, 'string');
      assert.equal(typeof body.integrations, 'object');
    }
  });
});

test('readiness route reports available and isolated unavailable database states', async () => {
  for (const [databaseReady, expectedStatus, expectedReady] of [
    [true, 200, true],
    [false, 503, false]
  ]) {
    await withServer(createContractApp({databaseReady}), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/ready`);
      assert.equal(response.status, expectedStatus);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      const body = await response.json();
      assert.equal(body.ready, expectedReady);
      assert.equal(body.databaseReady, databaseReady);
      assert.equal(body.status, expectedReady ? 'ready' : 'not_ready');
    });
  }
});

test('login returns an authenticated user and invalid credentials stay generic', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const successful = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        email: authenticatedUser.email,
        password: 'correct-test-password'
      })
    });
    assert.equal(successful.status, 200);
    assert.deepEqual((await successful.json()).user, authenticatedUser);

    const failed = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        email: 'unknown@example.test',
        password: 'incorrect'
      })
    });
    assert.equal(failed.status, 401);
    const failureBody = await failed.json();
    assert.equal(failureBody.error, 'Invalid email or password.');
    assert.equal('emailExists' in failureBody, false);
  });
});

test('invalid JSON login uses the existing JSON error contract', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: '{"email":'
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    const body = await response.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(body.requestId);
  });
});

test('logout, current user and authenticated dashboard contracts remain protected', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const headers = {'x-test-authenticated': 'true'};

    const me = await fetch(`${baseUrl}/api/auth/me`, {headers});
    assert.equal(me.status, 200);
    assert.deepEqual((await me.json()).user, authenticatedUser);

    const dashboard = await fetch(`${baseUrl}/`, {headers});
    assert.equal(dashboard.status, 200);
    assert.match(await dashboard.text(), /Pulse/);

    const logout = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers,
      redirect: 'manual'
    });
    assert.equal(logout.status, 303);
    assert.equal(logout.headers.get('location'), '/login');
  });
});

test('unauthenticated API and browser access preserve HTTP 401 and redirect contracts', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const apiResponse = await fetch(`${baseUrl}/api/authorized`);
    assert.equal(apiResponse.status, 401);
    assert.equal((await apiResponse.json()).error, 'Authentication required.');

    const browserResponse = await fetch(`${baseUrl}/`, {redirect: 'manual'});
    assert.equal(browserResponse.status, 303);
    assert.equal(browserResponse.headers.get('location'), '/login');
  });
});

test('RBAC permits assigned roles and denies unassigned and unauthenticated requests', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/director-only`, {
      headers: {'x-test-authenticated': 'true'}
    });
    assert.equal(allowed.status, 200);
  });

  const roleApp = express();
  roleApp.use(requestLogger);
  roleApp.get('/api/role', (request, _response, next) => {
    if (request.get('x-role')) request.authenticatedUser = {roles: [request.get('x-role')]};
    next();
  }, requireRole('DIRECTOR'), (_request, response) => response.json({ok: true}));
  roleApp.use(errorHandler);

  await withServer(roleApp, async (baseUrl) => {
    const forbidden = await fetch(`${baseUrl}/api/role`, {headers: {'x-role': 'CLINICIAN'}});
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json()).error, 'You do not have permission to access this resource.');

    const unauthenticated = await fetch(`${baseUrl}/api/role`, {headers: {accept: 'application/json'}});
    assert.equal(unauthenticated.status, 401);
  });
});

test('security headers, unknown API errors and absent registration route remain stable', async () => {
  await withServer(createContractApp(), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(health.headers.has('x-powered-by'), false);

    const unknown = await fetch(`${baseUrl}/api/not-a-route`);
    assert.equal(unknown.status, 404);
    assert.deepEqual(Object.keys(await unknown.json()).sort(), ['error', 'requestId']);

    const registration = await fetch(`${baseUrl}/register`);
    assert.equal(registration.status, 404);
  });
});
