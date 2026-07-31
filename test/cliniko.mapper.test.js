import assert from 'node:assert/strict';
import test from 'node:test';
import {mapBooking, mapPatient} from '../src/modules/integrations/cliniko/cliniko.mapper.js';

test('patient mapper persists only the approved operational allow-list', () => {
  const mapped = mapPatient({
    id: 10,
    first_name: 'Test',
    last_name: 'Patient',
    email: 'fictional@example.test',
    mobile_phone: '0000',
    date_of_birth: '1990-01-01',
    address_1: 'Never persist',
    gender: 'Never persist',
    medical_alerts: ['Never persist'],
    notes: 'Never persist'
  });
  assert.deepEqual(Object.keys(mapped).sort(), [
    'acceptedPrivacyPolicy', 'archivedAt', 'clinikoId', 'email', 'firstName',
    'homePhone', 'lastName', 'lastSyncedAt', 'mobilePhone', 'sourceCreatedAt', 'sourceUpdatedAt'
  ].sort());
  assert.equal(JSON.stringify(mapped).includes('Never persist'), false);
  assert.equal('dateOfBirth' in mapped, false);
});

test('booking mapper excludes notes and supports multiple patient references', () => {
  const mapped = mapBooking({
    id: 20,
    starts_at: '2026-07-30T01:00:00Z',
    ends_at: '2026-07-30T02:00:00Z',
    notes: 'Never persist booking notes',
    patients: [{id: 1}, {links: {self: 'https://api.example/v1/patients/2'}}],
    practitioner: {id: 3},
    business: {id: 4}
  });
  assert.deepEqual(mapped.patientClinikoIds, ['1', '2']);
  assert.equal(mapped.practitionerClinikoId, '3');
  assert.equal(mapped.businessClinikoId, '4');
  assert.equal(JSON.stringify(mapped).includes('Never persist'), false);
  assert.equal('notes' in mapped.data, false);
});
