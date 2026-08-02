import assert from 'node:assert/strict';import test from 'node:test';import crypto from 'node:crypto';import {decryptToken,encryptToken,parseEncryptionKey} from '../src/modules/integrations/xero/xero.crypto.js';
const key=crypto.randomBytes(32).toString('base64');
test('Xero token encryption round trip works',()=>assert.equal(decryptToken(encryptToken('secret',key),key),'secret'));
test('Xero token encryption uses unique IVs',()=>assert.notEqual(encryptToken('secret',key),encryptToken('secret',key)));
test('tampered Xero token ciphertext fails closed',()=>{const value=encryptToken('secret',key);assert.throws(()=>decryptToken(`${value.slice(0,-1)}x`,key),/authenticated/)});
test('invalid Xero encryption keys fail safely',()=>assert.throws(()=>parseEncryptionKey('bad'),/32-byte/));
