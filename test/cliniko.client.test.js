import assert from 'node:assert/strict';
import test from 'node:test';
import {createClinikoClient} from '../src/modules/integrations/cliniko/cliniko.client.js';
import {ClinikoError} from '../src/modules/integrations/cliniko/cliniko.errors.js';

const jsonResponse = (body, {status = 200, headers = {}} = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json', ...headers}
});

test('Cliniko client sends Basic auth, Accept and identifying User-Agent to the configured base URL', async () => {
  let captured;
  const client = createClinikoClient({
    apiKey: 'test-placeholder-key',
    userAgent: 'Pulse Test (test@example.test)',
    baseUrl: 'https://api.example.cliniko.com/v1',
    fetchImpl: async (url, options) => {
      captured = {url: url.toString(), options};
      return jsonResponse({businesses: [], links: {}});
    }
  });
  await client.testConnection();
  assert.equal(captured.url, 'https://api.example.cliniko.com/v1/businesses?per_page=1');
  assert.equal(captured.options.headers.Accept, 'application/json');
  assert.equal(captured.options.headers['User-Agent'], 'Pulse Test (test@example.test)');
  assert.equal(captured.options.headers.Authorization, `Basic ${Buffer.from('test-placeholder-key:').toString('base64')}`);
  assert.equal(JSON.stringify(captured).includes('test-placeholder-key'), false);
});

test('Cliniko pagination follows the exact safe links.next URL', async () => {
  const calls = [];
  const next = 'https://api.example.cliniko.com/v1/patients?page=2&per_page=100';
  const client = createClinikoClient({
    apiKey: 'placeholder',
    userAgent: 'Pulse Test (test@example.test)',
    baseUrl: 'https://api.example.cliniko.com/v1',
    fetchImpl: async (url) => {
      calls.push(url.toString());
      return calls.length === 1
        ? jsonResponse({patients: [{id: '1'}], links: {next}})
        : jsonResponse({patients: [{id: '2'}], links: {next: null}});
    }
  });
  assert.deepEqual(await client.getAll('/patients'), [{id: '1'}, {id: '2'}]);
  assert.equal(calls[1], next);
});

test('Cliniko pagination rejects non-HTTPS and foreign hosts', async () => {
  for (const next of ['http://api.example.cliniko.com/v1/patients?page=2', 'https://attacker.example/patients']) {
    const client = createClinikoClient({
      apiKey: 'placeholder',
      userAgent: 'Pulse Test (test@example.test)',
      baseUrl: 'https://api.example.cliniko.com/v1',
      fetchImpl: async () => jsonResponse({patients: [], links: {next}})
    });
    await assert.rejects(client.getAll('/patients'), (error) => error instanceof ClinikoError && error.code === 'CLINIKO_UNSAFE_PAGINATION');
  }
});

test('Cliniko timeout becomes a sanitised typed error', async () => {
  const client = createClinikoClient({
    apiKey: 'placeholder',
    userAgent: 'Pulse Test (test@example.test)',
    baseUrl: 'https://api.example.cliniko.com/v1',
    timeoutMs: 1,
    fetchImpl: async (_url, {signal}) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), {name: 'AbortError'})));
    })
  });
  await assert.rejects(client.testConnection(), (error) => error.code === 'CLINIKO_TIMEOUT' && !error.message.includes('placeholder'));
});

test('429 retries are bounded and do not expose upstream bodies', async () => {
  let calls = 0;
  const client = createClinikoClient({
    apiKey: 'placeholder',
    userAgent: 'Pulse Test (test@example.test)',
    baseUrl: 'https://api.example.cliniko.com/v1',
    maxRetries: 2,
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({secret: 'raw-upstream-body'}, {status: 429, headers: {'x-ratelimit-reset': '0'}});
    }
  });
  await assert.rejects(client.testConnection(), (error) => error.message === 'Cliniko is temporarily unavailable.' && !error.message.includes('raw-upstream-body'));
  assert.equal(calls, 3);
});

test('401, 403 and malformed JSON become sanitised errors', async () => {
  for (const status of [401, 403]) {
    const client = createClinikoClient({
      apiKey: 'placeholder',
      userAgent: 'Pulse Test (test@example.test)',
      baseUrl: 'https://api.example.cliniko.com/v1',
      fetchImpl: async () => jsonResponse({raw: 'do-not-return'}, {status})
    });
    await assert.rejects(client.testConnection(), (error) => error.message === 'Cliniko authentication failed.');
  }
  const malformed = createClinikoClient({
    apiKey: 'placeholder',
    userAgent: 'Pulse Test (test@example.test)',
    baseUrl: 'https://api.example.cliniko.com/v1',
    fetchImpl: async () => new Response('{', {headers: {'content-type': 'application/json'}})
  });
  await assert.rejects(malformed.testConnection(), (error) => error.code === 'CLINIKO_INVALID_JSON');
});
