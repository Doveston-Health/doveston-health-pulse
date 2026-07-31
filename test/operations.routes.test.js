import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import express from 'express';
import {apiNotFound, errorHandler} from '../src/core/middleware/error-handler.js';
import {requestLogger} from '../src/core/middleware/request-logger.js';
import {requireRole} from '../src/modules/auth/auth.middleware.js';
import {createOperationsRouter} from '../src/modules/operations/operations.routes.js';
import {dateParam} from '../src/modules/operations/operations.validation.js';

const roles = ['DIRECTOR', 'PRACTICE_MANAGER', 'ADMIN', 'CLINICIAN'];
const contract = {
  date: '2026-07-31', timeZone: 'Australia/Brisbane', totalBookings: 3, activeBookings: 2,
  cancelledBookings: 1, archivedBookings: 0, practitionersWithBookings: 1,
  firstAppointmentAt: null, lastAppointmentAt: null, bookingsByPractitioner: [],
  bookingsByAppointmentType: [], cancellationsByPractitioner: [], multiplePatientBookingCount: 0,
  lastSuccessfulClinikoSyncAt: null
};

function app() {
  const application = express();
  application.use(requestLogger);
  application.use((request, _response, next) => {
    const role = request.get('x-test-role');
    if (role) request.authenticatedUser = {id: 'user-1', roles: [role]};
    next();
  });
  const respond = (body) => async (_request, response) => response.json(body);
  application.use('/api', createOperationsRouter({
    roleMiddleware: requireRole(...roles),
    handlers: {
      today: async (request, response) => {
        dateParam(request.query.date, 'date', {required: false, fallback: contract.date});
        response.json(contract);
      },
      forwardBookings: respond({startDate: contract.date, horizonDays: 14, practitioners: []}),
      rebookingRisk: respond({referenceDate: contract.date, patients: [], pagination: {page: 1, pageSize: 25, total: 0, totalPages: 0}}),
      cancellations: respond({totalBookings: 0, totalCancelledBookings: 0, cancellationRate: 0}),
      trends: respond({groupBy: 'day', trends: []}),
      patients: respond({patients: [], pagination: {page: 1, pageSize: 25, total: 0, totalPages: 0}}),
      patient: respond({patient: {clinikoId: 'patient-1'}, recentPastBookings: [], upcomingBookings: []}),
      practitioners: respond({practitioners: []})
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

test('all four approved roles can access every operations route', async () => {
  const paths = [
    '/api/operations/today', '/api/operations/forward-bookings', '/api/operations/rebooking-risk',
    '/api/operations/cancellations', '/api/operations/trends', '/api/operations/patients/search?q=pa',
    '/api/operations/patients/patient-1', '/api/operations/practitioners'
  ];
  await withServer(async (baseUrl) => {
    for (const role of roles) {
      for (const path of paths) {
        const response = await fetch(`${baseUrl}${path}`, {headers: {'x-test-role': role}});
        assert.equal(response.status, 200, `${role} ${path}`);
      }
    }
  });
});

test('operations routes preserve existing 401 and 403 response contracts', async () => {
  await withServer(async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/api/operations/today`);
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json()).error, 'Authentication required.');
    const forbidden = await fetch(`${baseUrl}/api/operations/today`, {headers: {'x-test-role': 'UNASSIGNED'}});
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json()).error, 'You do not have permission to access this resource.');
  });
});

test('operations validation errors use the stable sanitised JSON contract', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/operations/today?date=not-a-date`, {
      headers: {'x-test-role': 'ADMIN'}
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'date must use YYYY-MM-DD.');
    assert.ok(body.requestId);
    assert.equal('stack' in body, false);
  });
});

test('today route exposes the stable operations summary fields without unsupported data', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/operations/today`, {headers: {'x-test-role': 'CLINICIAN'}});
    const body = await response.json();
    assert.deepEqual(Object.keys(body), Object.keys(contract));
    assert.equal('patients' in body, false);
    assert.equal('apiKey' in body, false);
  });
});
