import {prisma} from '../../core/database/prisma.js';

const practitionerSelect = {
  id: true,
  clinikoId: true,
  active: true,
  firstName: true,
  lastName: true,
  displayName: true,
  title: true,
  designation: true,
  label: true,
  showInOnlineBookings: true,
  lastSyncedAt: true
};

function startOfDayDaysAgo(days, now = new Date()) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function normalisedName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function listPractitioners(query = {}, {client = prisma, now = new Date()} = {}) {
  if (query.includeInactive !== undefined && !['true', 'false'].includes(query.includeInactive)) {
    const error = new Error('includeInactive must be true or false.');
    error.statusCode = 400;
    throw error;
  }

  const search = String(query.search || '').trim();
  const since = startOfDayDaysAgo(30, now);

  const practitioners = await client.clinikoPractitioner.findMany({
    where: {
      ...(query.includeInactive === 'true' ? {} : {active: true}),
      ...(search ? {
        OR: [
          {displayName: {contains: search, mode: 'insensitive'}},
          {firstName: {contains: search, mode: 'insensitive'}},
          {lastName: {contains: search, mode: 'insensitive'}},
          {title: {contains: search, mode: 'insensitive'}},
          {designation: {contains: search, mode: 'insensitive'}},
          {label: {contains: search, mode: 'insensitive'}}
        ]
      } : {})
    },
    take: 100,
    orderBy: [{displayName: 'asc'}, {clinikoId: 'asc'}],
    select: practitionerSelect
  });

  if (practitioners.length === 0) {
    return [];
  }

  const practitionerIds = practitioners.map((practitioner) => practitioner.id);

  const [bookingCounts, cancellationCounts, locationRows] = await Promise.all([
    client.clinikoBooking.groupBy({
      by: ['practitionerId'],
      where: {
        practitionerId: {in: practitionerIds},
        startsAt: {gte: since, lte: now},
        deletedAt: null
      },
      _count: {_all: true}
    }),
    client.clinikoBooking.groupBy({
      by: ['practitionerId'],
      where: {
        practitionerId: {in: practitionerIds},
        startsAt: {gte: since, lte: now},
        deletedAt: null,
        cancelledAt: {not: null}
      },
      _count: {_all: true}
    }),
    client.clinikoBooking.findMany({
      where: {
        practitionerId: {in: practitionerIds},
        startsAt: {gte: since, lte: now},
        deletedAt: null,
        businessId: {not: null}
      },
      take: 5000,
      select: {
        practitionerId: true,
        business: {
          select: {
            clinikoId: true,
            name: true
          }
        }
      }
    })
  ]);

  const bookingsByPractitioner = new Map(
    bookingCounts.map((row) => [row.practitionerId, row._count._all])
  );
  const cancellationsByPractitioner = new Map(
    cancellationCounts.map((row) => [row.practitionerId, row._count._all])
  );
  const locationsByPractitioner = new Map();

  for (const row of locationRows) {
    if (!row.practitionerId || !row.business) continue;
    if (!locationsByPractitioner.has(row.practitionerId)) {
      locationsByPractitioner.set(row.practitionerId, new Map());
    }
    locationsByPractitioner
      .get(row.practitionerId)
      .set(row.business.clinikoId, row.business);
  }

  const duplicateCounts = new Map();
  for (const practitioner of practitioners) {
    const key = normalisedName(practitioner.displayName);
    duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
  }

  return practitioners.map((practitioner) => ({
    ...practitioner,
    discipline: practitioner.designation || practitioner.title || practitioner.label || null,
    workload: {
      periodDays: 30,
      bookingCount: bookingsByPractitioner.get(practitioner.id) || 0,
      cancellationCount: cancellationsByPractitioner.get(practitioner.id) || 0
    },
    locations: [...(locationsByPractitioner.get(practitioner.id)?.values() || [])]
      .sort((a, b) => a.name.localeCompare(b.name)),
    mappingStatus: duplicateCounts.get(normalisedName(practitioner.displayName)) > 1
      ? 'DUPLICATE_NAME'
      : 'MAPPED'
  }));
}

