import {
  getClinikoCounts,
  getClinikoStatus,
  getClinikoSyncJobs,
  synchroniseCliniko,
  testClinikoConnection
} from './integration.service.js';

export async function testConnection(request, response) {
  response.json(await testClinikoConnection(request.authenticatedUser.id));
}

export async function sync(request, response) {
  response.json(await synchroniseCliniko(request.authenticatedUser.id));
}

export async function status(_request, response) {
  response.json(await getClinikoStatus());
}

export async function syncJobs(request, response) {
  response.json({provider: 'CLINIKO', jobs: await getClinikoSyncJobs(request.query.limit)});
}

export async function counts(_request, response) {
  response.json({provider: 'CLINIKO', counts: await getClinikoCounts()});
}
