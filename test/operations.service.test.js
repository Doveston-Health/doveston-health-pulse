import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clinicDayBounds,
  getCancellations,
  getForwardBookings,
  getPatient,
  getRebookingRisk,
  getToday,
  getTrends,
  listPractitioners,
  searchPatients
} from '../src/modules/operations/operations.service.js';
import {SIGNAL_THRESHOLDS, dateParam, pagination, rangeParams} from '../src/modules/operations/operations.validation.js';

const business = {clinikoId: 'business-1', name: 'Doveston Health', timeZone: 'Australia/Brisbane'};
const practitioner = {id: 'internal-practitioner', clinikoId: 'practitioner-1', displayName: 'Alex Clinician'};
const patient = {
  clinikoId: 'patient-1', firstName: 'Pat', lastName: 'Example', email: 'pat@example.test',
  mobilePhone: '0400000000', homePhone: null, acceptedPrivacyPolicy: true, archivedAt: null
};
const booking = {
  clinikoId: 'booking-1', bookingType: 'Appointment', startsAt: new Date('2026-07-30T00:00:00Z'),
  endsAt: new Date('2026-07-30T01:00:00Z'), cancelledAt: null, archivedAt: null,
  appointmentTypeClinikoId: 'type-1', appointmentTypeName: 'Physiotherapy',
  practitioner: {clinikoId: practitioner.clinikoId, displayName: practitioner.displayName},
  patients: [{patient}]
};

function baseClient() {
  return {
    clinikoBusiness: {findFirst: async () => business, findUnique: async () => business},
    clinikoPractitioner: {findMany: async () => [practitioner]},
    clinikoPatient: {count: async () => 1, findMany: async () => [patient], findUnique: async () => patient},
    clinikoBooking: {
      count: async () => 1,
      findFirst: async ({select}) => select.startsAt ? {startsAt: booking.startsAt} : {endsAt: booking.endsAt},
      findMany: async () => [booking],
      groupBy: async ({by, where}) => {
        if (by.includes('appointmentTypeName')) return [{appointmentTypeClinikoId: 'type-1', appointmentTypeName: 'Physiotherapy', _count: {_all: 1}}];
        return [{practitionerId: practitioner.id, _count: {_all: where.cancelledAt ? 1 : 2}}];
      }
    },
    clinikoBookingPatient: {groupBy: async () => [{bookingId: 'booking-1', _count: {patientId: 2}}]},
    integration: {findUnique: async () => ({lastSuccessfulSyncAt: new Date('2026-07-30T02:00:00Z')})}
  };
}

test('clinic-day boundaries use the synced timezone across daylight-saving changes', () => {
  const bounds = clinicDayBounds('2026-10-04', 'Australia/Sydney');
  assert.equal(bounds.start.toISOString(), '2026-10-03T14:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-10-04T13:00:00.000Z');
  assert.equal(bounds.end - bounds.start, 23 * 60 * 60 * 1000);
});

test('malformed dates, reversed ranges, excessive ranges and page sizes are rejected', () => {
  assert.throws(() => dateParam('2026-02-30', 'date'), /valid calendar/);
  assert.throws(() => rangeParams({startDate: '2026-07-30', endDate: '2026-07-01'}), /before/);
  assert.throws(() => rangeParams({startDate: '2026-01-01', endDate: '2026-07-01'}), /90 days/);
  assert.throws(() => pagination({pageSize: '101'}), /between 1 and 100/);
});

test('today summary uses non-deleted filters, aggregates practitioners, types and multiple-patient bookings', async () => {
  const client = baseClient();
  const calls = [];
  client.clinikoBooking.count = async (args) => { calls.push(args); return calls.length; };
  const result = await getToday({date: '2026-07-30'}, {client});
  assert.equal(result.totalBookings, 1);
  assert.equal(result.activeBookings, 2);
  assert.equal(result.multiplePatientBookingCount, 1);
  assert.equal(result.bookingsByPractitioner[0].practitioner.clinikoId, practitioner.clinikoId);
  assert.equal(result.bookingsByAppointmentType[0].appointmentType.name, 'Physiotherapy');
  assert.ok(calls.every(({where}) => where.deletedAt === null));
  assert.equal('id' in result.bookingsByPractitioner[0].practitioner, false);
});

test('forward bookings compare immediately preceding equal periods and do not claim utilisation', async () => {
  const client = baseClient();
  let call = 0;
  client.clinikoBooking.findMany = async (args) => {
    assert.ok(args.take);
    call += 1;
    return call === 1 ? [booking] : [booking, {...booking, clinikoId: 'booking-2'}];
  };
  const result = await getForwardBookings({startDate: '2026-07-30', horizonDays: '14'}, {client});
  assert.equal(result.practitioners[0].bookings, 1);
  assert.equal(result.practitioners[0].bookingMomentum.previous, 2);
  assert.equal(JSON.stringify(result).includes('utilisation'), false);
});

test('rebooking risk requires a historical booking, no future booking and excludes archived patients by default', async () => {
  const client = baseClient();
  let captured;
  client.clinikoPatient.findMany = async (args) => {
    captured = args;
    return [{...patient, bookings: [{booking}]}];
  };
  const result = await getRebookingRisk({referenceDate: '2026-07-31'}, {client});
  assert.equal(captured.where.archivedAt, null);
  assert.ok(captured.where.bookings.some);
  assert.ok(captured.where.bookings.none);
  assert.ok(captured.take);
  assert.equal(result.patients[0].noFutureBooking, true);
  assert.match(result.signalBasis, /attendance and discharge are not inferred/);
});

test('cancellation rate uses all bookings in the period and compares the preceding equal period', async () => {
  const client = baseClient();
  const values = [20, 4, 10, 1];
  client.clinikoBooking.count = async () => values.shift();
  const result = await getCancellations({startDate: '2026-07-01', endDate: '2026-07-14'}, {client});
  assert.equal(result.cancellationRate, 0.2);
  assert.equal(result.comparison.previousRate, 0.1);
  assert.equal(result.comparison.percentagePointChange, 10);
});

test('appointment-type trend signals require the centralised minimum volume threshold', async () => {
  const client = baseClient();
  let call = 0;
  client.clinikoBooking.findMany = async () => {
    call += 1;
    const count = call === 1 ? SIGNAL_THRESHOLDS.appointmentTypeMinimumVolume : 2;
    return Array.from({length: count}, (_, index) => ({...booking, clinikoId: `b-${call}-${index}`}));
  };
  const result = await getTrends({
    startDate: '2026-07-01', endDate: '2026-07-14', groupBy: 'appointmentType'
  }, {client});
  assert.equal(result.trends[0].signal, 'MATERIAL_APPOINTMENT_TYPE_CHANGE');
});

test('multiple-patient bookings preserve every approved patient and omit unsupported source fields', async () => {
  const client = baseClient();
  const second = {...patient, clinikoId: 'patient-2', firstName: 'Sam'};
  client.clinikoBooking.findMany = async () => [{...booking, patients: [{patient}, {patient: second}]}];
  const result = await getPatient(patient.clinikoId, {client});
  assert.equal(result.recentPastBookings[0].patients.length, 2);
  assert.equal('sourceCreatedAt' in result.patient, false);
  assert.equal('notes' in result.patient, false);
  assert.equal('deletedAt' in result.recentPastBookings[0], false);
});

test('patient search requires two characters, stays bounded and uses the approved allow-list', async () => {
  const client = baseClient();
  let captured;
  client.clinikoPatient.findMany = async (args) => { captured = args; return [patient]; };
  await assert.rejects(searchPatients({q: 'p'}, {client}), /at least two/);
  const result = await searchPatients({q: 'pat', pageSize: '20'}, {client});
  assert.equal(captured.take, 20);
  assert.deepEqual(Object.keys(captured.select), Object.keys(patientSelectForAssertion()));
  assert.equal('id' in result.patients[0], false);
});

function patientSelectForAssertion() {
  return {
    clinikoId: true, firstName: true, lastName: true, email: true, mobilePhone: true,
    homePhone: true, acceptedPrivacyPolicy: true, archivedAt: true
  };
}

test('patient detail returns bounded past and upcoming bookings and missing patients return 404', async () => {
  const client = baseClient();
  const calls = [];
  client.clinikoBooking.findMany = async (args) => { calls.push(args); return [booking]; };
  const result = await getPatient(patient.clinikoId, {client, now: new Date('2026-07-31T00:00:00Z')});
  assert.equal(result.recentPastBookings.length, 1);
  assert.equal(result.upcomingBookings.length, 1);
  assert.ok(calls.every(({take}) => take === 10));
  client.clinikoPatient.findUnique = async () => null;
  await assert.rejects(getPatient('missing', {client}), (error) => error.statusCode === 404);
});

test('all operations findMany calls are explicitly bounded', async () => {
  const client = baseClient();
  const seen = [];
  for (const delegate of [client.clinikoPractitioner, client.clinikoPatient, client.clinikoBooking]) {
    const original = delegate.findMany;
    delegate.findMany = async (args) => { seen.push(args); return original(args); };
  }
  await listPractitioners({}, {client});
  await searchPatients({q: 'pa'}, {client});
  await getPatient(patient.clinikoId, {client});
  await getForwardBookings({startDate: '2026-07-30'}, {client});
  await getTrends({startDate: '2026-07-01', endDate: '2026-07-07'}, {client});
  assert.ok(seen.length > 0);
  assert.ok(seen.every(({take}) => Number.isInteger(take) && take > 0));
});
