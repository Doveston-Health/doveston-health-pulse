import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import express from 'express';
import {apiNotFound, errorHandler} from '../src/core/middleware/error-handler.js';
import {requestLogger} from '../src/core/middleware/request-logger.js';
import {requireRole} from '../src/modules/auth/auth.middleware.js';
import {createPractitionersRouter} from '../src/modules/practitioners/practitioners.routes.js';

const roles = ['DIRECTOR', 'PRACTICE_MANAGER', 'ADMIN', 'CLINICIAN'];

function app() {
  const application = express();

  application.use(requestLogger);
  application.use((request, _response, next) => {
    const role = request.get('x-test-role');
    if (role) {
      request.authenticatedUser = {
        id: 'user-1',
        roles: [role]
      };
    }
    next();
  });

  application.use('/api', createPractitionersRouter({
    roleMiddleware: requireRole(...roles),
    handlers: {
      list: async (_request, response) => {
        response.json({
          practitioners: [
            {
              clinikoId: 'practitioner-1',
              displayName: 'Alex Clinician',
              active: true,
              discipline: 'Physiotherapist',
              workload: {
                periodDays: 30,
                bookingCount: 12,
                cancellationCount: 1
              },
              locations: [],
              mappingStatus: 'MAPPED'
            }
          ]
        });
      }
    }
  }));

  application.use('/api', apiNotFound);
  application.use(errorHandler);

  return application;
}

async function withServer(callback) {
  const server = app().listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('all four approved roles can access the practitioner directory', async () => {
  await withServer(async (baseUrl) => {
    for (const role of roles) {
      const response = await fetch(`${baseUrl}/api/practitioners`, {
        headers: {'x-test-role': role}
      });

      assert.equal(response.status, 200, role);

      const body = await response.json();
      assert.equal(body.practitioners.length, 1);
      assert.equal(body.practitioners[0].clinikoId, 'practitioner-1');
      assert.equal(body.practitioners[0].workload.periodDays, 30);
    }
  });
});

test('practitioner routes preserve existing 401 and 403 response contracts', async () => {
  await withServer(async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/api/practitioners`);

    assert.equal(unauthenticated.status, 401);
    assert.equal(
      (await unauthenticated.json()).error,
      'Authentication required.'
    );

    const forbidden = await fetch(`${baseUrl}/api/practitioners`, {
      headers: {'x-test-role': 'UNASSIGNED'}
    });

    assert.equal(forbidden.status, 403);
    assert.equal(
      (await forbidden.json()).error,
      'You do not have permission to access this resource.'
    );
  });
});

test('unknown practitioner routes use the existing API 404 contract', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/practitioners/not-a-route`, {
      headers: {'x-test-role': 'ADMIN'}
    });

    assert.equal(response.status, 404);

    const body = await response.json();
    assert.equal(body.error, 'API endpoint not found.');
    assert.ok(body.requestId);
  });
});

