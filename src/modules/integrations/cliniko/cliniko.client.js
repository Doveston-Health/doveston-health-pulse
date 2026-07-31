import {ClinikoError} from './cliniko.errors.js';

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function rateLimitDelay(response) {
  const raw = Number(response.headers.get('x-ratelimit-reset'));
  if (!Number.isFinite(raw)) return 1000;
  const milliseconds = raw > 1_000_000_000 ? (raw * 1000) - Date.now() : raw * 1000;
  return Math.max(250, Math.min(milliseconds, 5000));
}

export function createClinikoClient({
  apiKey,
  userAgent,
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = 10000,
  sleep = defaultSleep,
  maxRetries = 2
}) {
  const root = new URL(baseUrl);
  const approvedHost = root.hostname;
  const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

  function approvedUrl(pathOrUrl) {
    const value = String(pathOrUrl);
    const url = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(`${root.toString().replace(/\/$/, '')}/${value.replace(/^\/+/, '')}`);
    if (url.protocol !== 'https:' || url.hostname !== approvedHost) {
      throw new ClinikoError('Cliniko returned an unsafe pagination URL.', {
        code: 'CLINIKO_UNSAFE_PAGINATION',
        statusCode: 502
      });
    }
    return url;
  }

  async function request(pathOrUrl, retryCount = 0) {
    const url = approvedUrl(pathOrUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {Authorization: authorization, Accept: 'application/json', 'User-Agent': userAgent},
        signal: controller.signal
      });
    } catch (error) {
      const code = error?.name === 'AbortError' ? 'CLINIKO_TIMEOUT' : 'CLINIKO_UNAVAILABLE';
      throw new ClinikoError('Cliniko is temporarily unavailable.', {code, statusCode: 502});
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429 && retryCount < maxRetries) {
      await sleep(rateLimitDelay(response));
      return request(url, retryCount + 1);
    }
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403
        ? 'CLINIKO_AUTHENTICATION_FAILED'
        : `CLINIKO_HTTP_${response.status}`;
      throw new ClinikoError(
        response.status === 401 || response.status === 403
          ? 'Cliniko authentication failed.'
          : 'Cliniko is temporarily unavailable.',
        {code, statusCode: 502}
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new ClinikoError('Cliniko returned an invalid response.', {code: 'CLINIKO_INVALID_JSON'});
    }
    try {
      return await response.json();
    } catch {
      throw new ClinikoError('Cliniko returned an invalid response.', {code: 'CLINIKO_INVALID_JSON'});
    }
  }

  async function getAll(resource, query = {}) {
    const url = approvedUrl(resource);
    url.searchParams.set('per_page', String(Math.min(Number(query.perPage) || 100, 100)));
    const records = [];
    let next = url;
    while (next) {
      const page = await request(next);
      const pageRecords = page[resource.replace(/^\//, '')];
      if (!Array.isArray(pageRecords)) {
        throw new ClinikoError('Cliniko returned an invalid response.', {code: 'CLINIKO_INVALID_JSON'});
      }
      records.push(...pageRecords);
      next = page.links?.next ? approvedUrl(page.links.next) : null;
    }
    return records;
  }

  return {
    getAll,
    testConnection: () => getAll('/businesses', {perPage: 1})
  };
}
