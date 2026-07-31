import {prisma} from '../../core/database/prisma.js';
import {AppError} from '../../shared/errors/app-error.js';
import {
  OPERATIONS_LIMITS,
  SIGNAL_THRESHOLDS,
  addDays,
  badRequest,
  dateParam,
  integerParam,
  pagination,
  rangeParams
} from './operations.validation.js';

const DEFAULT_TIME_ZONE = 'Australia/Brisbane';
const CLINIKO_TIME_ZONE_ALIASES = Object.freeze({
  Brisbane: 'Australia/Brisbane',
  Sydney: 'Australia/Sydney',
  Melbourne: 'Australia/Melbourne',
  Adelaide: 'Australia/Adelaide',
  Darwin: 'Australia/Darwin',
  Perth: 'Australia/Perth',
  Hobart: 'Australia/Hobart'
});
const practitionerSelect = {
  clinikoId: true, active: true, firstName: true, lastName: true, displayName: true,
  title: true, designation: true, label: true, showInOnlineBookings: true
};
const patientSelect = {
  clinikoId: true, firstName: true, lastName: true, email: true, mobilePhone: true,
  homePhone: true, acceptedPrivacyPolicy: true, archivedAt: true
};
const bookingSelect = {
  clinikoId: true, bookingType: true, startsAt: true, endsAt: true, cancelledAt: true,
  archivedAt: true, appointmentTypeClinikoId: true, appointmentTypeName: true,
  practitioner: {select: {clinikoId: true, displayName: true, title: true, designation: true}},
  patients: {select: {patient: {select: patientSelect}}}
};

function localParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant);
  return Object.fromEntries(parts.filter(({type}) => type !== 'literal').map(({type, value}) => [type, Number(value)]));
}

export function clinicDayBounds(date, timeZone = DEFAULT_TIME_ZONE) {
  try {
    new Intl.DateTimeFormat('en-AU', {timeZone}).format();
  } catch {
    throw new AppError('The synced business timezone is invalid.', 500);
  }
  const midnight = (localDate) => {
    const [year, month, day] = localDate.split('-').map(Number);
    const desired = Date.UTC(year, month - 1, day);
    let guess = desired;
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const observed = localParts(new Date(guess), timeZone);
      guess += desired - Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    }
    return new Date(guess);
  };
  return {start: midnight(date), end: midnight(addDays(date, 1))};
}

async function context(client, businessId) {
  const business = businessId
    ? await client.clinikoBusiness.findUnique({
      where: {clinikoId: businessId}, select: {clinikoId: true, name: true, timeZone: true}
    })
    : await client.clinikoBusiness.findFirst({
      where: {archivedAt: null}, orderBy: [{name: 'asc'}, {clinikoId: 'asc'}],
      select: {clinikoId: true, name: true, timeZone: true}
    });
  if (businessId && !business) throw new AppError('Business not found.', 404);
  const timeZone = CLINIKO_TIME_ZONE_ALIASES[business?.timeZone] || business?.timeZone || DEFAULT_TIME_ZONE;
  return {business, timeZone};
}

function todayIn(timeZone, now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

function publicBooking(row) {
  return {
    clinikoId: row.clinikoId,
    bookingType: row.bookingType,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.archivedAt ? 'archived' : row.cancelledAt ? 'cancelled' : 'active',
    appointmentType: {clinikoId: row.appointmentTypeClinikoId, name: row.appointmentTypeName},
    practitioner: row.practitioner,
    patients: row.patients?.map(({patient}) => patient) || []
  };
}

function periodWhere(start, end, query = {}) {
  return {
    startsAt: {gte: start, lt: end},
    deletedAt: null,
    ...(query.businessId ? {business: {clinikoId: query.businessId}} : {}),
    ...(query.practitionerId ? {practitioner: {clinikoId: query.practitionerId}} : {})
  };
}

async function practitionerMap(client, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await client.clinikoPractitioner.findMany({
    where: {id: {in: unique}}, take: 100, select: {id: true, clinikoId: true, displayName: true}
  });
  return new Map(rows.map((row) => [row.id, {
    clinikoId: row.clinikoId,
    displayName: row.displayName
  }]));
}

function groupedPractitioners(grouped, map) {
  return grouped.map((row) => ({
    practitioner: row.practitionerId ? map.get(row.practitionerId) || null : null,
    count: row._count._all
  })).sort((a, b) => (a.practitioner?.displayName || '').localeCompare(b.practitioner?.displayName || ''));
}

export async function getToday(query = {}, {client = prisma, now = new Date()} = {}) {
  const clinic = await context(client, query.businessId);
  const date = dateParam(query.date, 'date', {required: false, fallback: todayIn(clinic.timeZone, now)});
  const bounds = clinicDayBounds(date, clinic.timeZone);
  const base = periodWhere(bounds.start, bounds.end, query);
  const [total, active, cancelled, archived, first, last, byPractitionerRows, byTypeRows,
    cancellationRows, bookingPatients, integration] = await Promise.all([
    client.clinikoBooking.count({where: base}),
    client.clinikoBooking.count({where: {...base, archivedAt: null, cancelledAt: null}}),
    client.clinikoBooking.count({where: {...base, cancelledAt: {not: null}}}),
    client.clinikoBooking.count({where: {...base, archivedAt: {not: null}}}),
    client.clinikoBooking.findFirst({where: base, orderBy: {startsAt: 'asc'}, select: {startsAt: true}}),
    client.clinikoBooking.findFirst({where: base, orderBy: {endsAt: 'desc'}, select: {endsAt: true}}),
    client.clinikoBooking.groupBy({by: ['practitionerId'], where: base, _count: {_all: true}}),
    client.clinikoBooking.groupBy({by: ['appointmentTypeClinikoId', 'appointmentTypeName'], where: base, _count: {_all: true}}),
    client.clinikoBooking.groupBy({
      by: ['practitionerId'], where: {...base, cancelledAt: {not: null}}, _count: {_all: true}
    }),
    client.clinikoBookingPatient.groupBy({
      by: ['bookingId'], where: {booking: base}, _count: {patientId: true}
    }),
    client.integration.findUnique({
      where: {provider: 'CLINIKO'}, select: {lastSuccessfulSyncAt: true}
    })
  ]);
  const map = await practitionerMap(client, [
    ...byPractitionerRows.map(({practitionerId}) => practitionerId),
    ...cancellationRows.map(({practitionerId}) => practitionerId)
  ]);
  return {
    date, timeZone: clinic.timeZone, business: clinic.business,
    totalBookings: total, activeBookings: active, cancelledBookings: cancelled, archivedBookings: archived,
    practitionersWithBookings: byPractitionerRows.filter(({practitionerId}) => practitionerId).length,
    firstAppointmentAt: first?.startsAt || null, lastAppointmentAt: last?.endsAt || null,
    bookingsByPractitioner: groupedPractitioners(byPractitionerRows, map),
    bookingsByAppointmentType: byTypeRows.map((row) => ({
      appointmentType: {clinikoId: row.appointmentTypeClinikoId, name: row.appointmentTypeName},
      count: row._count._all
    })).sort((a, b) => (a.appointmentType.name || '').localeCompare(b.appointmentType.name || '')),
    cancellationsByPractitioner: groupedPractitioners(cancellationRows, map),
    multiplePatientBookingCount: bookingPatients.filter((row) => row._count.patientId > 1).length,
    lastSuccessfulClinikoSyncAt: integration?.lastSuccessfulSyncAt || null
  };
}

function comparison(current, previous) {
  const change = current - previous;
  return {current, previous, change, percentChange: previous ? (change / previous) * 100 : null};
}

function enforceAggregationLimit(...rowSets) {
  if (rowSets.some((rows) => rows.length > OPERATIONS_LIMITS.aggregationRowLimit)) {
    throw new AppError('The selected period contains too many bookings. Choose a shorter period or a practitioner filter.', 422);
  }
}

export async function getForwardBookings(query = {}, {client = prisma, now = new Date()} = {}) {
  const clinic = await context(client, query.businessId);
  const startDate = dateParam(query.startDate, 'startDate', {
    required: false, fallback: todayIn(clinic.timeZone, now)
  });
  const horizonDays = integerParam(query.horizonDays, 'horizonDays', {
    fallback: OPERATIONS_LIMITS.defaultHorizonDays, max: OPERATIONS_LIMITS.maxHorizonDays
  });
  const current = {start: clinicDayBounds(startDate, clinic.timeZone).start, end: clinicDayBounds(addDays(startDate, horizonDays), clinic.timeZone).start};
  const prior = {start: clinicDayBounds(addDays(startDate, -horizonDays), clinic.timeZone).start, end: current.start};
  const base = (period) => periodWhere(period.start, period.end, query);
  const [currentRows, priorRows, practitioners] = await Promise.all([
    client.clinikoBooking.findMany({
      where: base(current), take: OPERATIONS_LIMITS.aggregationRowLimit + 1,
      orderBy: [{startsAt: 'asc'}, {clinikoId: 'asc'}],
      select: {startsAt: true, cancelledAt: true, practitioner: {select: {clinikoId: true, displayName: true}}}
    }),
    client.clinikoBooking.findMany({
      where: base(prior), take: OPERATIONS_LIMITS.aggregationRowLimit + 1,
      orderBy: [{startsAt: 'asc'}, {clinikoId: 'asc'}],
      select: {startsAt: true, cancelledAt: true, practitioner: {select: {clinikoId: true, displayName: true}}}
    }),
    client.clinikoPractitioner.findMany({
      where: {active: true, ...(query.practitionerId ? {clinikoId: query.practitionerId} : {})},
      take: 100, orderBy: [{displayName: 'asc'}, {clinikoId: 'asc'}],
      select: {clinikoId: true, displayName: true}
    })
  ]);
  enforceAggregationLimit(currentRows, priorRows);
  const summarise = (rows, practitionerId) => {
    const selected = rows.filter((row) => row.practitioner?.clinikoId === practitionerId);
    const nonDeletedActive = selected.filter((row) => !row.cancelledAt);
    const bookedDays = new Set(nonDeletedActive.map((row) => todayIn(clinic.timeZone, row.startsAt)));
    return {
      bookings: nonDeletedActive.length, bookedDays: bookedDays.size,
      firstBookingAt: nonDeletedActive[0]?.startsAt || null,
      lastBookingAt: nonDeletedActive.at(-1)?.startsAt || null,
      cancellations: selected.filter((row) => row.cancelledAt).length,
      averageBookingsPerBookedDay: bookedDays.size ? nonDeletedActive.length / bookedDays.size : 0
    };
  };
  return {
    startDate, horizonDays, timeZone: clinic.timeZone,
    practitioners: practitioners.map((practitioner) => {
      const currentSummary = summarise(currentRows, practitioner.clinikoId);
      const previousSummary = summarise(priorRows, practitioner.clinikoId);
      return {
        practitioner, ...currentSummary,
        bookingMomentum: comparison(currentSummary.bookings, previousSummary.bookings),
        signal: previousSummary.bookings >= 4 &&
          comparison(currentSummary.bookings, previousSummary.bookings).percentChange <= -SIGNAL_THRESHOLDS.forwardBookingDeclinePercent
          ? 'WEAKENING_FORWARD_BOOKINGS' : null
      };
    })
  };
}

export async function getRebookingRisk(query = {}, {client = prisma, now = new Date()} = {}) {
  const clinic = await context(client, query.businessId);
  const referenceDate = dateParam(query.referenceDate, 'referenceDate', {
    required: false, fallback: todayIn(clinic.timeZone, now)
  });
  const reference = clinicDayBounds(referenceDate, clinic.timeZone).start;
  const minimumDays = integerParam(query.minimumDays, 'minimumDays', {
    fallback: SIGNAL_THRESHOLDS.rebookingMinimumDays, max: 3650
  });
  const cutoff = new Date(reference.getTime() - minimumDays * 86400000);
  const {page, pageSize, skip} = pagination(query);
  const bookingFilter = {
    deletedAt: null,
    ...(query.businessId ? {business: {clinikoId: query.businessId}} : {}),
    ...(query.practitionerId ? {practitioner: {clinikoId: query.practitionerId}} : {}),
    ...(query.appointmentType ? {appointmentTypeName: {contains: query.appointmentType, mode: 'insensitive'}} : {})
  };
  const where = {
    ...(query.includeArchived === 'true' ? {} : {archivedAt: null}),
    bookings: {
      some: {booking: {...bookingFilter, startsAt: {lt: cutoff}}},
      none: {booking: {deletedAt: null, startsAt: {gte: reference}}}
    }
  };
  if (query.includeArchived !== undefined && !['true', 'false'].includes(query.includeArchived)) {
    badRequest('includeArchived must be true or false.');
  }
  const [total, patients] = await Promise.all([
    client.clinikoPatient.count({where}),
    client.clinikoPatient.findMany({
      where, skip, take: pageSize, orderBy: [{lastName: 'asc'}, {firstName: 'asc'}, {clinikoId: 'asc'}],
      select: {
        ...patientSelect,
        bookings: {
          where: {booking: {...bookingFilter, startsAt: {lt: reference}}},
          take: 1, orderBy: {booking: {startsAt: 'desc'}}, select: {booking: {select: bookingSelect}}
        }
      }
    })
  ]);
  const results = patients.map(({bookings, ...patient}) => {
    const last = bookings[0]?.booking;
    return {
      patient,
      lastBooking: last ? publicBooking(last) : null,
      daysSinceLastBooking: last ? Math.floor((reference - last.startsAt) / 86400000) : null,
      noFutureBooking: true
    };
  }).sort((a, b) => (b.daysSinceLastBooking || 0) - (a.daysSinceLastBooking || 0) ||
    a.patient.lastName.localeCompare(b.patient.lastName) || a.patient.clinikoId.localeCompare(b.patient.clinikoId));
  return {
    referenceDate, timeZone: clinic.timeZone,
    signalBasis: 'Appointment timing and absence of a future non-deleted booking only; attendance and discharge are not inferred.',
    patients: results, pagination: {page, pageSize, total, totalPages: Math.ceil(total / pageSize)}
  };
}

export async function getCancellations(query = {}, {client = prisma, now = new Date()} = {}) {
  const clinic = await context(client, query.businessId);
  const range = rangeParams(query, {today: todayIn(clinic.timeZone, now)});
  const start = clinicDayBounds(range.startDate, clinic.timeZone).start;
  const end = clinicDayBounds(addDays(range.endDate, 1), clinic.timeZone).start;
  const previousStart = clinicDayBounds(addDays(range.startDate, -range.days), clinic.timeZone).start;
  const base = periodWhere(start, end, query);
  const previous = periodWhere(previousStart, start, query);
  const [total, cancelled, priorTotal, priorCancelled, practitioners, types, cancelledRows] = await Promise.all([
    client.clinikoBooking.count({where: base}),
    client.clinikoBooking.count({where: {...base, cancelledAt: {not: null}}}),
    client.clinikoBooking.count({where: previous}),
    client.clinikoBooking.count({where: {...previous, cancelledAt: {not: null}}}),
    client.clinikoBooking.groupBy({
      by: ['practitionerId'], where: {...base, cancelledAt: {not: null}}, _count: {_all: true}
    }),
    client.clinikoBooking.groupBy({
      by: ['appointmentTypeClinikoId', 'appointmentTypeName'],
      where: {...base, cancelledAt: {not: null}}, _count: {_all: true}
    }),
    client.clinikoBooking.findMany({
      where: {...base, cancelledAt: {not: null}}, take: OPERATIONS_LIMITS.aggregationRowLimit + 1,
      orderBy: [{startsAt: 'desc'}, {clinikoId: 'asc'}], select: bookingSelect
    })
  ]);
  enforceAggregationLimit(cancelledRows);
  const map = await practitionerMap(client, practitioners.map(({practitionerId}) => practitionerId));
  const weekday = new Map();
  for (const row of cancelledRows) {
    const name = new Intl.DateTimeFormat('en-AU', {timeZone: clinic.timeZone, weekday: 'long'}).format(row.startsAt);
    weekday.set(name, (weekday.get(name) || 0) + 1);
  }
  const rate = total ? cancelled / total : 0;
  const priorRate = priorTotal ? priorCancelled / priorTotal : 0;
  return {
    ...range, timeZone: clinic.timeZone, totalBookings: total, totalCancelledBookings: cancelled,
    cancellationRate: rate, comparison: {
      currentRate: rate, previousRate: priorRate, percentagePointChange: (rate - priorRate) * 100
    },
    cancellationsByPractitioner: groupedPractitioners(practitioners, map),
    cancellationsByAppointmentType: types.map((row) => ({
      appointmentType: {clinikoId: row.appointmentTypeClinikoId, name: row.appointmentTypeName},
      count: row._count._all
    })),
    cancellationsByWeekday: [...weekday].map(([day, count]) => ({day, count})),
    recentCancellations: cancelledRows.slice(0, OPERATIONS_LIMITS.recentCancellationLimit).map(publicBooking),
    signal: (rate - priorRate) * 100 >= SIGNAL_THRESHOLDS.cancellationRateIncreasePoints
      ? 'ELEVATED_CANCELLATION_EXPOSURE' : null
  };
}

export async function getTrends(query = {}, {client = prisma, now = new Date()} = {}) {
  const clinic = await context(client, query.businessId);
  const range = rangeParams(query, {defaultDays: 30, today: todayIn(clinic.timeZone, now)});
  const groupBy = query.groupBy || 'day';
  if (!['day', 'week', 'practitioner', 'appointmentType'].includes(groupBy)) {
    badRequest('groupBy must be day, week, practitioner or appointmentType.');
  }
  const start = clinicDayBounds(range.startDate, clinic.timeZone).start;
  const end = clinicDayBounds(addDays(range.endDate, 1), clinic.timeZone).start;
  const previousStart = clinicDayBounds(addDays(range.startDate, -range.days), clinic.timeZone).start;
  const trendSelect = {
      clinikoId: true, startsAt: true, cancelledAt: true,
      appointmentTypeClinikoId: true, appointmentTypeName: true,
      practitioner: {select: {clinikoId: true, displayName: true}},
      patients: {select: {patient: {select: {clinikoId: true}}}}
  };
  const [rows, previousRows] = await Promise.all([
    client.clinikoBooking.findMany({
      where: periodWhere(start, end, query), take: OPERATIONS_LIMITS.aggregationRowLimit + 1,
      orderBy: [{startsAt: 'asc'}, {clinikoId: 'asc'}], select: trendSelect
    }),
    client.clinikoBooking.findMany({
      where: periodWhere(previousStart, start, query), take: OPERATIONS_LIMITS.aggregationRowLimit + 1,
      orderBy: [{startsAt: 'asc'}, {clinikoId: 'asc'}], select: trendSelect
    })
  ]);
  enforceAggregationLimit(rows, previousRows);
  const aggregate = (source) => {
    const groups = new Map();
    for (const row of source) {
    let key;
    let label;
    if (groupBy === 'practitioner') [key, label] = [row.practitioner?.clinikoId || 'unassigned', row.practitioner?.displayName || 'Unassigned'];
    else if (groupBy === 'appointmentType') [key, label] = [row.appointmentTypeClinikoId || row.appointmentTypeName || 'unknown', row.appointmentTypeName || 'Unknown'];
    else {
      const day = todayIn(clinic.timeZone, row.startsAt);
      key = groupBy === 'week' ? addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7)) : day;
      label = key;
    }
    const item = groups.get(key) || {key, label, bookingCount: 0, cancellationCount: 0, patients: new Set()};
    item.bookingCount += 1;
    if (row.cancelledAt) item.cancellationCount += 1;
    row.patients.forEach(({patient}) => item.patients.add(patient.clinikoId));
    groups.set(key, item);
    }
    return groups;
  };
  const groups = aggregate(rows);
  const previousGroups = aggregate(previousRows);
  const previousByLabel = new Map([...previousGroups.values()].map((item) => [item.label, item]));
  return {
    ...range, groupBy, timeZone: clinic.timeZone,
    trends: [...groups.values()].map(({patients, ...item}) => {
      const previous = previousByLabel.get(item.label)?.bookingCount || 0;
      const volumeComparison = comparison(item.bookingCount, previous);
      const signal = groupBy === 'appointmentType' &&
        Math.max(item.bookingCount, previous) >= SIGNAL_THRESHOLDS.appointmentTypeMinimumVolume &&
        Math.abs(volumeComparison.percentChange || 0) >= SIGNAL_THRESHOLDS.appointmentTypeChangePercent
        ? 'MATERIAL_APPOINTMENT_TYPE_CHANGE' : null;
      return {...item, uniquePatientCount: patients.size, comparison: volumeComparison, signal};
    })
  };
}

export async function searchPatients(query = {}, {client = prisma} = {}) {
  const term = String(query.q || '').trim();
  if (term.length < 2) badRequest('q must contain at least two characters.');
  const {page, pageSize, skip} = pagination(query);
  const where = {OR: [
    {firstName: {contains: term, mode: 'insensitive'}}, {lastName: {contains: term, mode: 'insensitive'}},
    {email: {contains: term, mode: 'insensitive'}}, {mobilePhone: {contains: term}}, {homePhone: {contains: term}}
  ]};
  const [total, patients] = await Promise.all([
    client.clinikoPatient.count({where}),
    client.clinikoPatient.findMany({
      where, skip, take: pageSize, orderBy: [{lastName: 'asc'}, {firstName: 'asc'}, {clinikoId: 'asc'}],
      select: patientSelect
    })
  ]);
  return {patients, pagination: {page, pageSize, total, totalPages: Math.ceil(total / pageSize)}};
}

export async function getPatient(clinikoId, {client = prisma, now = new Date()} = {}) {
  const patient = await client.clinikoPatient.findUnique({where: {clinikoId}, select: patientSelect});
  if (!patient) throw new AppError('Patient not found.', 404);
  const base = {deletedAt: null, patients: {some: {patient: {clinikoId}}}};
  const recentStart = new Date(now.getTime() - 90 * 86400000);
  const [past, upcoming, cancellationCount] = await Promise.all([
    client.clinikoBooking.findMany({
      where: {...base, startsAt: {lt: now}}, take: OPERATIONS_LIMITS.patientHistoryLimit,
      orderBy: [{startsAt: 'desc'}, {clinikoId: 'asc'}], select: bookingSelect
    }),
    client.clinikoBooking.findMany({
      where: {...base, startsAt: {gte: now}}, take: OPERATIONS_LIMITS.patientHistoryLimit,
      orderBy: [{startsAt: 'asc'}, {clinikoId: 'asc'}], select: bookingSelect
    }),
    client.clinikoBooking.count({where: {...base, startsAt: {gte: recentStart, lt: now}, cancelledAt: {not: null}}})
  ]);
  const history = [...past, ...upcoming];
  const practitioners = [...new Map(history.filter((row) => row.practitioner)
    .map((row) => [row.practitioner.clinikoId, row.practitioner])).values()];
  const appointmentTypes = [...new Map(history.map((row) => [
    row.appointmentTypeClinikoId || row.appointmentTypeName,
    {clinikoId: row.appointmentTypeClinikoId, name: row.appointmentTypeName}
  ])).values()].filter(({clinikoId, name}) => clinikoId || name);
  return {
    patient, recentPastBookings: past.map(publicBooking), upcomingBookings: upcoming.map(publicBooking),
    practitionerHistory: practitioners, appointmentTypeHistory: appointmentTypes,
    noFutureBooking: upcoming.length === 0, cancellationCountLast90Days: cancellationCount
  };
}

export async function listPractitioners(query = {}, {client = prisma} = {}) {
  if (query.includeInactive !== undefined && !['true', 'false'].includes(query.includeInactive)) {
    badRequest('includeInactive must be true or false.');
  }
  return client.clinikoPractitioner.findMany({
    where: query.includeInactive === 'true' ? {} : {active: true}, take: 100,
    orderBy: [{displayName: 'asc'}, {clinikoId: 'asc'}], select: practitionerSelect
  });
}
