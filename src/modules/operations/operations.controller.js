import {
  getCancellations,
  getForwardBookings,
  getPatient,
  getRebookingRisk,
  getToday,
  getTrends,
  listPractitioners,
  searchPatients
} from './operations.service.js';

export async function today(request, response) {
  response.json(await getToday(request.query));
}
export async function forwardBookings(request, response) {
  response.json(await getForwardBookings(request.query));
}
export async function rebookingRisk(request, response) {
  response.json(await getRebookingRisk(request.query));
}
export async function cancellations(request, response) {
  response.json(await getCancellations(request.query));
}
export async function trends(request, response) {
  response.json(await getTrends(request.query));
}
export async function patients(request, response) {
  response.json(await searchPatients(request.query));
}
export async function patient(request, response) {
  response.json(await getPatient(request.params.clinikoId));
}
export async function practitioners(request, response) {
  response.json({practitioners: await listPractitioners(request.query)});
}
