import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLINIKO_PERSISTENCE_BATCH_SIZE,
  runClinikoSync
} from '../src/modules/integrations/cliniko/cliniko.sync.service.js';
import {ClinikoError, ClinikoSyncConflictError} from '../src/modules/integrations/cliniko/cliniko.errors.js';
import {requireRole} from '../src/modules/auth/auth.middleware.js';

function fakeDatabase(activeJob, {failPatientClinikoId} = {}) {
  const state = {
    jobs: activeJob ? [structuredClone(activeJob)] : [],
    integration: {id: 'integration-1', status: 'CONFIGURED'},
    audits: [],
    businesses: new Map(),
    practitioners: new Map(),
    patients: new Map(),
    bookings: new Map(),
    bookingPatients: [],
    transactionCalls: [],
    failedPatientOnce: false
  };
  let sequence = 0;
  const collection = (map, model) => ({
    async upsert({where, update, create}) {
      if (model === 'patient' && where.clinikoId === failPatientClinikoId && !state.failedPatientOnce) {
        state.failedPatientOnce = true;
        throw new Error('Injected bounded-batch persistence failure.');
      }
      const previous = map.get(where.clinikoId);
      const value = {...(previous || create), ...(previous ? update : {}), id: previous?.id || `row-${++sequence}`};
      map.set(where.clinikoId, value);
      return value;
    },
    async findMany() {
      return [...map.values()].map(({id, clinikoId}) => ({id, clinikoId}));
    },
    async count() {
      return map.size;
    }
  });
  const client = {
    state,
    syncJob: {
      async findFirst() {
        return state.jobs.find((job) => ['PENDING', 'RUNNING'].includes(job.status)) || null;
      },
      async create({data}) {
        const job = {id: `job-${++sequence}`, createdAt: new Date(), ...data};
        state.jobs.push(job);
        return job;
      },
      async update({where, data}) {
        const job = state.jobs.find((candidate) => candidate.id === where.id);
        Object.assign(job, data);
        return job;
      }
    },
    integration: {
      async update({data}) {
        Object.assign(state.integration, data);
        return state.integration;
      }
    },
    auditLog: {
      async create({data}) {
        state.audits.push(data);
        return data;
      }
    },
    clinikoBusiness: collection(state.businesses, 'business'),
    clinikoPractitioner: collection(state.practitioners, 'practitioner'),
    clinikoPatient: collection(state.patients, 'patient'),
    clinikoBooking: collection(state.bookings, 'booking'),
    clinikoBookingPatient: {
      async deleteMany({where}) {
        state.bookingPatients = state.bookingPatients.filter((row) => row.bookingId !== where.bookingId);
      },
      async createMany({data}) {
        state.bookingPatients.push(...data);
        return {count: data.length};
      }
    },
    async $transaction(input) {
      if (Array.isArray(input)) {
        state.transactionCalls.push({type: 'batch', size: input.length});
        return Promise.all(input);
      }
      state.transactionCalls.push({type: 'interactive'});
      return input(client);
    }
  };
  return client;
}

function largeClinikoClient({patientCount = 250, bookingCount = 205} = {}) {
  const resources = {
    businesses: [{id: 'business-1', name: 'Fictional Clinic'}],
    practitioners: [{id: 'practitioner-1', first_name: 'Test', last_name: 'Practitioner'}],
    patients: Array.from({length: patientCount}, (_, index) => ({
      id: `patient-${index + 1}`,
      first_name: 'Test',
      last_name: `Patient ${index + 1}`
    })),
    bookings: Array.from({length: bookingCount}, (_, index) => ({
      id: `booking-${index + 1}`,
      starts_at: '2026-07-30T01:00:00Z',
      ends_at: '2026-07-30T02:00:00Z',
      business: {id: 'business-1'},
      practitioner: {id: 'practitioner-1'},
      patients: [{id: `patient-${(index % patientCount) + 1}`}, {id: `patient-${((index + 1) % patientCount) + 1}`}]
    }))
  };
  return {getAll: async (path) => structuredClone(resources[path.slice(1)])};
}

function successfulClinikoClient() {
  const resources = {
    businesses: [{id: 'business-1', name: 'Fictional Clinic'}],
    practitioners: [{id: 'practitioner-1', first_name: 'Test', last_name: 'Practitioner'}],
    patients: [{id: 'patient-1', first_name: 'Test', last_name: 'Patient'}],
    bookings: [{
      id: 'booking-1',
      starts_at: '2026-07-30T01:00:00Z',
      ends_at: '2026-07-30T02:00:00Z',
      business: {id: 'business-1'},
      practitioner: {id: 'practitioner-1'},
      patients: [{id: 'patient-1'}]
    }]
  };
  return {getAll: async (path) => structuredClone(resources[path.slice(1)])};
}

test('repeated Cliniko synchronisations are idempotent and update success lifecycle', async () => {
  const client = fakeDatabase();
  const args = {
    client,
    clinikoClient: successfulClinikoClient(),
    integration: client.state.integration,
    actorUserId: 'actor-1'
  };
  await runClinikoSync(args);
  await runClinikoSync(args);
  assert.equal(client.state.businesses.size, 1);
  assert.equal(client.state.practitioners.size, 1);
  assert.equal(client.state.patients.size, 1);
  assert.equal(client.state.bookings.size, 1);
  assert.equal(client.state.bookingPatients.length, 1);
  assert.equal(client.state.integration.status, 'CONNECTED');
  assert.ok(client.state.integration.lastSuccessfulSyncAt);
  assert.equal(client.state.jobs.every((job) => job.status === 'SUCCEEDED'), true);
  assert.equal(client.state.audits.filter((event) => event.action === 'CLINIKO_SYNC_SUCCEEDED').length, 2);
});

test('large persistence uses bounded batches and short booking transactions', async () => {
  const client = fakeDatabase();
  const result = await runClinikoSync({
    client,
    clinikoClient: largeClinikoClient(),
    integration: client.state.integration,
    actorUserId: 'actor-1'
  });
  const batchSizes = client.state.transactionCalls
    .filter((call) => call.type === 'batch')
    .map((call) => call.size);
  assert.equal(batchSizes.every((size) => size <= CLINIKO_PERSISTENCE_BATCH_SIZE), true);
  assert.deepEqual(batchSizes.slice(-3), [100, 100, 50]);
  assert.equal(client.state.transactionCalls.some((call) => call.type === 'interactive' && call.size > 1), false);
  assert.equal(client.state.patients.size, 250);
  assert.equal(client.state.bookings.size, 205);
  assert.equal(client.state.bookingPatients.length, 410);
  assert.deepEqual(result.summary.patients, {received: 250, upserted: 250});
  assert.equal(result.summary.bookings.upserted, 205);
});

test('mid-batch failure marks sync failed and a later idempotent retry completes', async () => {
  const client = fakeDatabase(undefined, {failPatientClinikoId: 'patient-151'});
  const args = {
    client,
    clinikoClient: largeClinikoClient({patientCount: 220, bookingCount: 12}),
    integration: client.state.integration,
    actorUserId: 'actor-1'
  };
  await assert.rejects(runClinikoSync(args), /Injected bounded-batch persistence failure/);
  assert.equal(client.state.jobs.at(-1).status, 'FAILED');
  assert.equal(client.state.integration.lastSuccessfulSyncAt, undefined);
  assert.ok(client.state.integration.lastFailedSyncAt);
  assert.ok(client.state.patients.size > 0);

  const result = await runClinikoSync(args);
  assert.equal(result.status, 'SUCCEEDED');
  assert.deepEqual(result.summary.patients, {received: 220, upserted: 220});
  assert.equal(result.summary.bookings.upserted, 12);
  assert.equal(client.state.patients.size, 220);
  assert.equal(client.state.bookings.size, 12);
  assert.ok(client.state.integration.lastSuccessfulSyncAt);
});

test('partial upstream failure records sanitised failure without a successful timestamp', async () => {
  const client = fakeDatabase();
  const clinikoClient = {
    async getAll(path) {
      if (path === '/patients') throw new ClinikoError('Cliniko is temporarily unavailable.');
      return [];
    }
  };
  await assert.rejects(runClinikoSync({
    client,
    clinikoClient,
    integration: client.state.integration,
    actorUserId: 'actor-1'
  }), ClinikoError);
  assert.equal(client.state.integration.status, 'ERROR');
  assert.equal(client.state.integration.lastSuccessfulSyncAt, undefined);
  assert.ok(client.state.integration.lastFailedSyncAt);
  assert.equal(client.state.integration.lastError, 'Cliniko is temporarily unavailable.');
  assert.equal(client.state.jobs.at(-1).status, 'FAILED');
});

test('active Cliniko sync is rejected and stale running work is recovered', async () => {
  const activeClient = fakeDatabase({
    id: 'active-job',
    status: 'RUNNING',
    createdAt: new Date()
  });
  await assert.rejects(runClinikoSync({
    client: activeClient,
    clinikoClient: successfulClinikoClient(),
    integration: activeClient.state.integration,
    actorUserId: 'actor-1'
  }), ClinikoSyncConflictError);

  const staleClient = fakeDatabase({
    id: 'stale-job',
    status: 'RUNNING',
    createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000))
  });
  await runClinikoSync({
    client: staleClient,
    clinikoClient: successfulClinikoClient(),
    integration: staleClient.state.integration,
    actorUserId: 'actor-1'
  });
  assert.equal(staleClient.state.jobs[0].status, 'FAILED');
  assert.equal(staleClient.state.jobs[1].status, 'SUCCEEDED');
});

test('Cliniko management role policy allows managers and rejects all other access', () => {
  const middleware = requireRole('DIRECTOR', 'PRACTICE_MANAGER');
  for (const role of ['DIRECTOR', 'PRACTICE_MANAGER']) {
    let allowed = false;
    middleware({authenticatedUser: {roles: [role]}}, {}, () => { allowed = true; });
    assert.equal(allowed, true);
  }
  for (const role of ['ADMIN', 'CLINICIAN']) {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; }
    };
    middleware({authenticatedUser: {roles: [role]}, id: 'request-1'}, response, () => assert.fail());
    assert.equal(response.statusCode, 403);
    assert.equal(JSON.stringify(response.payload).includes('credential'), false);
  }
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; }
  };
  middleware({path: '/api/integrations/cliniko/status', originalUrl: '/api/integrations/cliniko/status', id: 'request-2'}, response, () => assert.fail());
  assert.equal(response.statusCode, 401);
});
