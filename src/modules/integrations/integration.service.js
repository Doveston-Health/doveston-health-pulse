import {config} from '../../core/config/index.js';
import {prisma} from '../../core/database/prisma.js';
import {createClinikoClient} from './cliniko/cliniko.client.js';
import {ClinikoNotConfiguredError, sanitiseClinikoError} from './cliniko/cliniko.errors.js';
import {runClinikoSync} from './cliniko/cliniko.sync.service.js';

function configuredClient() {
  if (!config.cliniko.enabled) throw new ClinikoNotConfiguredError();
  return createClinikoClient({
    apiKey: config.cliniko.apiKey,
    userAgent: config.cliniko.userAgent,
    baseUrl: config.cliniko.baseUrl
  });
}

async function clinikoIntegration(client = prisma) {
  return client.integration.upsert({
    where: {provider: 'CLINIKO'},
    update: {},
    create: {provider: 'CLINIKO', displayName: 'Cliniko', status: config.cliniko.enabled ? 'CONFIGURED' : 'NOT_CONFIGURED'}
  });
}

export async function testClinikoConnection(actorUserId, {client = prisma, clinikoClient = configuredClient()} = {}) {
  const integration = await clinikoIntegration(client);
  try {
    await clinikoClient.testConnection();
    await client.integration.update({where: {id: integration.id}, data: {status: 'CONNECTED', lastError: null}});
    await client.auditLog.create({
      data: {actorUserId, action: 'CLINIKO_CONNECTION_TEST_SUCCEEDED', entityType: 'Integration', entityId: integration.id, metadata: {outcome: 'SUCCEEDED'}}
    });
    return {ok: true, provider: 'CLINIKO', status: 'CONNECTED', message: 'Cliniko connection successful.'};
  } catch (error) {
    const message = sanitiseClinikoError(error);
    await client.integration.update({where: {id: integration.id}, data: {status: 'ERROR', lastError: message}});
    await client.auditLog.create({
      data: {actorUserId, action: 'CLINIKO_CONNECTION_TEST_FAILED', entityType: 'Integration', entityId: integration.id, metadata: {outcome: 'FAILED'}}
    });
    throw error;
  }
}

export async function synchroniseCliniko(actorUserId, {client = prisma, clinikoClient = configuredClient()} = {}) {
  const integration = await clinikoIntegration(client);
  return runClinikoSync({client, clinikoClient, integration, actorUserId});
}

export async function getClinikoStatus({client = prisma} = {}) {
  const integration = await clinikoIntegration(client);
  const [latestJob, runningJob] = await Promise.all([
    client.syncJob.findFirst({where: {integrationId: integration.id, status: {in: ['SUCCEEDED', 'FAILED']}}, orderBy: {createdAt: 'desc'}}),
    client.syncJob.findFirst({where: {integrationId: integration.id, status: {in: ['PENDING', 'RUNNING']}}})
  ]);
  return {
    provider: 'CLINIKO',
    configured: config.cliniko.enabled,
    status: integration.status,
    lastSuccessfulSyncAt: integration.lastSuccessfulSyncAt,
    lastFailedSyncAt: integration.lastFailedSyncAt,
    latestError: integration.lastError,
    latestCompletedSync: latestJob ? {
      id: latestJob.id, jobType: latestJob.jobType, status: latestJob.status,
      startedAt: latestJob.startedAt, completedAt: latestJob.completedAt, summary: latestJob.metadata
    } : null,
    syncRunning: Boolean(runningJob)
  };
}

export async function getClinikoSyncJobs(limit, {client = prisma} = {}) {
  const integration = await clinikoIntegration(client);
  return client.syncJob.findMany({
    where: {integrationId: integration.id},
    orderBy: {createdAt: 'desc'},
    take: Math.min(Math.max(Number(limit) || 10, 1), 50),
    select: {id: true, jobType: true, status: true, startedAt: true, completedAt: true, metadata: true, createdAt: true}
  });
}

export async function getClinikoCounts({client = prisma} = {}) {
  const [businesses, practitioners, patients, bookings] = await Promise.all([
    client.clinikoBusiness.count(), client.clinikoPractitioner.count(),
    client.clinikoPatient.count(), client.clinikoBooking.count()
  ]);
  return {businesses, practitioners, patients, bookings};
}
