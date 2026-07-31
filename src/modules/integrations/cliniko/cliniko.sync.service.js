import {mapBooking, mapBusiness, mapPatient, mapPractitioner} from './cliniko.mapper.js';
import {ClinikoSyncConflictError, sanitiseClinikoError} from './cliniko.errors.js';

export const CLINIKO_SYNC_JOB_TYPE = 'CLINIKO_FULL_READ_ONLY_SYNC';
export const CLINIKO_PERSISTENCE_BATCH_SIZE = 100;
const BOOKING_WRITE_CONCURRENCY = 5;
const STALE_JOB_MS = 60 * 60 * 1000;

async function recoverAndCheckActiveJob(client, integrationId, now) {
  const active = await client.syncJob.findFirst({
    where: {integrationId, status: {in: ['PENDING', 'RUNNING']}},
    orderBy: {createdAt: 'desc'}
  });
  if (!active) return;
  if (now.getTime() - active.createdAt.getTime() <= STALE_JOB_MS) throw new ClinikoSyncConflictError();
  await client.syncJob.update({
    where: {id: active.id},
    data: {
      status: 'FAILED',
      completedAt: now,
      errorMessage: 'Abandoned Cliniko sync recovered.'
    }
  });
}

function batches(records, batchSize = CLINIKO_PERSISTENCE_BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < records.length; index += batchSize) {
    result.push(records.slice(index, index + batchSize));
  }
  return result;
}

async function persistMappedBatches(client, records, model, mapper) {
  let upserted = 0;
  for (const batch of batches(records)) {
    const operations = batch.map((source) => {
      const data = mapper(source);
      return client[model].upsert({
        where: {clinikoId: data.clinikoId},
        update: data,
        create: data
      });
    });
    await client.$transaction(operations);
    upserted += batch.length;
  }
  return upserted;
}

async function mapWithBoundedConcurrency(records, concurrency, worker) {
  const results = new Array(records.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < records.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(records[index]);
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, records.length)}, runWorker));
  return results;
}

export async function persistRecords(client, records, syncedAt) {
  const summary = {
    businesses: {received: records.businesses.length, upserted: 0},
    practitioners: {received: records.practitioners.length, upserted: 0},
    patients: {received: records.patients.length, upserted: 0},
    bookings: {received: records.bookings.length, upserted: 0, unresolvedReferences: 0}
  };

  summary.businesses.upserted = await persistMappedBatches(
    client, records.businesses, 'clinikoBusiness', (source) => mapBusiness(source, syncedAt)
  );
  summary.practitioners.upserted = await persistMappedBatches(
    client, records.practitioners, 'clinikoPractitioner', (source) => mapPractitioner(source, syncedAt)
  );
  summary.patients.upserted = await persistMappedBatches(
    client, records.patients, 'clinikoPatient', (source) => mapPatient(source, syncedAt)
  );

  const businesses = await client.clinikoBusiness.findMany({select: {id: true, clinikoId: true}});
  const practitioners = await client.clinikoPractitioner.findMany({select: {id: true, clinikoId: true}});
  const patients = await client.clinikoPatient.findMany({select: {id: true, clinikoId: true}});
  const businessIds = new Map(businesses.map((record) => [record.clinikoId, record.id]));
  const practitionerIds = new Map(practitioners.map((record) => [record.clinikoId, record.id]));
  const patientIds = new Map(patients.map((record) => [record.clinikoId, record.id]));

  for (const batch of batches(records.bookings)) {
    const results = await mapWithBoundedConcurrency(batch, BOOKING_WRITE_CONCURRENCY, async (source) => {
      const mapped = mapBooking(source, syncedAt);
      const practitionerId = practitionerIds.get(mapped.practitionerClinikoId) || null;
      const businessId = businessIds.get(mapped.businessClinikoId) || null;
      let unresolvedReferences = 0;
      if (mapped.practitionerClinikoId && !practitionerId) unresolvedReferences += 1;
      if (mapped.businessClinikoId && !businessId) unresolvedReferences += 1;
      const patientLinks = [];
      for (const clinikoId of new Set(mapped.patientClinikoIds)) {
        const patientId = patientIds.get(clinikoId);
        if (!patientId) {
          unresolvedReferences += 1;
          continue;
        }
        patientLinks.push(patientId);
      }
      await client.$transaction(async (transaction) => {
        const booking = await transaction.clinikoBooking.upsert({
          where: {clinikoId: mapped.data.clinikoId},
          update: {...mapped.data, practitionerId, businessId},
          create: {...mapped.data, practitionerId, businessId}
        });
        await transaction.clinikoBookingPatient.deleteMany({where: {bookingId: booking.id}});
        if (patientLinks.length > 0) {
          await transaction.clinikoBookingPatient.createMany({
            data: patientLinks.map((patientId) => ({bookingId: booking.id, patientId}))
          });
        }
      });
      return unresolvedReferences;
    });
    summary.bookings.upserted += batch.length;
    summary.bookings.unresolvedReferences += results.reduce((total, count) => total + count, 0);
  }
  return summary;
}

export async function runClinikoSync({
  client,
  clinikoClient,
  integration,
  actorUserId,
  now = () => new Date()
}) {
  const startedAt = now();
  let job;
  try {
    job = await client.$transaction(async (transaction) => {
      await recoverAndCheckActiveJob(transaction, integration.id, startedAt);
      return transaction.syncJob.create({
        data: {integrationId: integration.id, jobType: CLINIKO_SYNC_JOB_TYPE, status: 'PENDING'}
      });
    }, {isolationLevel: 'Serializable'});
  } catch (error) {
    if (error?.code === 'P2034') throw new ClinikoSyncConflictError();
    throw error;
  }
  await client.syncJob.update({where: {id: job.id}, data: {status: 'RUNNING', startedAt}});
  await client.auditLog.create({
    data: {actorUserId, action: 'CLINIKO_SYNC_STARTED', entityType: 'Integration', entityId: integration.id, metadata: {syncJobId: job.id}}
  });

  try {
    const records = {};
    for (const resource of ['businesses', 'practitioners', 'patients', 'bookings']) {
      records[resource] = await clinikoClient.getAll(`/${resource}`);
    }
    const completedAt = now();
    const summary = await persistRecords(client, records, completedAt);
    await client.syncJob.update({
      where: {id: job.id},
      data: {status: 'SUCCEEDED', completedAt, metadata: summary, errorMessage: null}
    });
    await client.integration.update({
      where: {id: integration.id},
      data: {status: 'CONNECTED', lastSuccessfulSyncAt: completedAt, lastError: null}
    });
    await client.auditLog.create({
      data: {
        actorUserId,
        action: 'CLINIKO_SYNC_SUCCEEDED',
        entityType: 'Integration',
        entityId: integration.id,
        metadata: {syncJobId: job.id, summary}
      }
    });
    return {ok: true, provider: 'CLINIKO', status: 'SUCCEEDED', syncJobId: job.id, summary};
  } catch (error) {
    const completedAt = now();
    const message = sanitiseClinikoError(error);
    await client.syncJob.update({where: {id: job.id}, data: {status: 'FAILED', completedAt, errorMessage: message}});
    await client.integration.update({
      where: {id: integration.id},
      data: {status: 'ERROR', lastFailedSyncAt: completedAt, lastError: message}
    });
    await client.auditLog.create({
      data: {
        actorUserId,
        action: 'CLINIKO_SYNC_FAILED',
        entityType: 'Integration',
        entityId: integration.id,
        metadata: {syncJobId: job.id, outcome: 'FAILED'}
      }
    });
    throw error;
  }
}
