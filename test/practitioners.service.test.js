import assert from 'node:assert/strict';
import test from 'node:test';
import {listPractitioners} from '../src/modules/practitioners/practitioners.service.js';

const now = new Date('2026-08-06T00:00:00Z');

function clientWithData() {
  const practitioners = [
    {
      id: 'internal-1',
      clinikoId: 'cliniko-1',
      active: true,
      firstName: 'Alex',
      lastName: 'Smith',
      displayName: 'Alex Smith',
      title: null,
      designation: 'Physiotherapist',
      label: null,
      showInOnlineBookings: true,
      lastSyncedAt: new Date('2026-08-05T00:00:00Z')
    },
    {
      id: 'internal-2',
      clinikoId: 'cliniko-2',
      active: true,
      firstName: 'Alex',
      lastName: 'Smith',
      displayName: 'Alex Smith',
      title: null,
      designation: 'Exercise Physiologist',
      label: null,
      showInOnlineBookings: true,
      lastSyncedAt: new Date('2026-08-05T00:00:00Z')
    }
  ];

  return {
    clinikoPractitioner: {
      findMany: async () => practitioners
    },
    clinikoBooking: {
      groupBy: async ({where}) => {
        if (where.cancelledAt) {
          return [{practitionerId: 'internal-1', _count: {_all: 1}}];
        }

        return [
          {practitionerId: 'internal-1', _count: {_all: 6}},
          {practitionerId: 'internal-2', _count: {_all: 3}}
        ];
      },
      findMany: async () => [
        {
          practitionerId: 'internal-1',
          business: {clinikoId: 'business-1', name: 'Morayfield'}
        },
        {
          practitionerId: 'internal-1',
          business: {clinikoId: 'business-1', name: 'Morayfield'}
        },
        {
          practitionerId: 'internal-2',
          business: {clinikoId: 'business-2', name: 'Caboolture'}
        }
      ]
    }
  };
}

test('practitioner directory combines Cliniko identity with bounded recent workload and locations', async () => {
  const result = await listPractitioners({}, {client: clientWithData(), now});

  assert.equal(result.length, 2);
  assert.equal(result[0].discipline, 'Physiotherapist');
  assert.equal(result[0].workload.periodDays, 30);
  assert.equal(result[0].workload.bookingCount, 6);
  assert.equal(result[0].workload.cancellationCount, 1);
  assert.deepEqual(result[0].locations, [
    {clinikoId: 'business-1', name: 'Morayfield'}
  ]);
  assert.equal(result[1].workload.bookingCount, 3);
  assert.equal(result[1].workload.cancellationCount, 0);
});

test('duplicate display names are surfaced as mapping warnings', async () => {
  const result = await listPractitioners({}, {client: clientWithData(), now});

  assert.equal(result[0].mappingStatus, 'DUPLICATE_NAME');
  assert.equal(result[1].mappingStatus, 'DUPLICATE_NAME');
});

test('invalid includeInactive values are rejected', async () => {
  await assert.rejects(
    () => listPractitioners({includeInactive: 'yes'}, {client: clientWithData(), now}),
    /includeInactive must be true or false/
  );
});

test('practitioner queries remain explicitly bounded', async () => {
  const calls = [];
  const client = clientWithData();

  client.clinikoPractitioner.findMany = async (args) => {
    calls.push({type: 'practitioners', args});
    return [];
  };

  await listPractitioners({}, {client, now});

  assert.equal(calls[0].args.take, 100);
});
