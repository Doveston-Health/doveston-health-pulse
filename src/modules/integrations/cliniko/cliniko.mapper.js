const dateOrNull = (value) => value ? new Date(value) : null;
const idFrom = (value) => {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'object' ? value.id || value.links?.self : value;
  return String(raw).split('/').filter(Boolean).at(-1) || null;
};

export function mapBusiness(source, syncedAt = new Date()) {
  return {
    clinikoId: String(source.id),
    name: source.name || '',
    timeZone: source.time_zone || null,
    archivedAt: dateOrNull(source.archived_at),
    sourceCreatedAt: dateOrNull(source.created_at),
    sourceUpdatedAt: dateOrNull(source.updated_at),
    lastSyncedAt: syncedAt
  };
}

export function mapPractitioner(source, syncedAt = new Date()) {
  const firstName = source.first_name || '';
  const lastName = source.last_name || '';
  return {
    clinikoId: String(source.id),
    active: source.active !== false,
    firstName,
    lastName,
    displayName: source.display_name || `${firstName} ${lastName}`.trim(),
    title: source.title || null,
    designation: source.designation || null,
    label: source.label || null,
    showInOnlineBookings: source.show_in_online_bookings ?? null,
    sourceCreatedAt: dateOrNull(source.created_at),
    sourceUpdatedAt: dateOrNull(source.updated_at),
    lastSyncedAt: syncedAt
  };
}

export function mapPatient(source, syncedAt = new Date()) {
  return {
    clinikoId: String(source.id),
    firstName: source.first_name || '',
    lastName: source.last_name || '',
    email: source.email || null,
    mobilePhone: source.mobile_phone || null,
    homePhone: source.home_phone || null,
    acceptedPrivacyPolicy: source.accepted_privacy_policy ?? null,
    archivedAt: dateOrNull(source.archived_at),
    sourceCreatedAt: dateOrNull(source.created_at),
    sourceUpdatedAt: dateOrNull(source.updated_at),
    lastSyncedAt: syncedAt
  };
}

export function mapBooking(source, syncedAt = new Date()) {
  const patientReferences = source.patient_ids || source.patients || (source.patient ? [source.patient] : []);
  return {
    data: {
      clinikoId: String(source.id),
      bookingType: source.booking_type || source.type || null,
      startsAt: new Date(source.starts_at),
      endsAt: new Date(source.ends_at),
      cancelledAt: dateOrNull(source.cancelled_at),
      archivedAt: dateOrNull(source.archived_at),
      deletedAt: dateOrNull(source.deleted_at),
      appointmentTypeClinikoId: idFrom(source.appointment_type),
      appointmentTypeName: source.appointment_type_name || source.appointment_type?.name || null,
      sourceCreatedAt: dateOrNull(source.created_at),
      sourceUpdatedAt: dateOrNull(source.updated_at),
      lastSyncedAt: syncedAt
    },
    practitionerClinikoId: idFrom(source.practitioner),
    businessClinikoId: idFrom(source.business),
    patientClinikoIds: patientReferences.map(idFrom).filter(Boolean)
  };
}
