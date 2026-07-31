import {AppError} from '../../shared/errors/app-error.js';

export const OPERATIONS_LIMITS = Object.freeze({
  defaultPageSize: 25,
  maxPageSize: 100,
  maxPage: 10000,
  defaultHorizonDays: 14,
  maxHorizonDays: 90,
  maxRangeDays: 90,
  aggregationRowLimit: 10000,
  patientHistoryLimit: 10,
  recentCancellationLimit: 25
});

export const SIGNAL_THRESHOLDS = Object.freeze({
  rebookingMinimumDays: 14,
  cancellationRateIncreasePoints: 5,
  forwardBookingDeclinePercent: 25,
  appointmentTypeMinimumVolume: 5,
  appointmentTypeChangePercent: 25
});

export function badRequest(message) {
  throw new AppError(message, 400);
}

export function dateParam(value, name, {required = true, fallback} = {}) {
  if ((value === undefined || value === '') && !required) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) badRequest(`${name} must use YYYY-MM-DD.`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    badRequest(`${name} must be a valid calendar date.`);
  }
  return value;
}

export function integerParam(value, name, {fallback, min = 1, max} = {}) {
  const result = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(result) || result < min || (max !== undefined && result > max)) {
    badRequest(`${name} must be an integer between ${min} and ${max}.`);
  }
  return result;
}

export function pagination(query) {
  const page = integerParam(query.page, 'page', {fallback: 1, max: OPERATIONS_LIMITS.maxPage});
  const pageSize = integerParam(query.pageSize, 'pageSize', {
    fallback: OPERATIONS_LIMITS.defaultPageSize,
    max: OPERATIONS_LIMITS.maxPageSize
  });
  return {page, pageSize, skip: (page - 1) * pageSize};
}

export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function inclusiveDays(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

export function rangeParams(query, {defaultDays = 14, today = new Date().toISOString().slice(0, 10)} = {}) {
  const startDate = dateParam(query.startDate, 'startDate', {required: false, fallback: addDays(today, -(defaultDays - 1))});
  const endDate = dateParam(query.endDate, 'endDate', {required: false, fallback: addDays(startDate, defaultDays - 1)});
  const days = inclusiveDays(startDate, endDate);
  if (days < 1) badRequest('endDate must not be before startDate.');
  if (days > OPERATIONS_LIMITS.maxRangeDays) badRequest(`Date ranges may not exceed ${OPERATIONS_LIMITS.maxRangeDays} days.`);
  return {startDate, endDate, days};
}
