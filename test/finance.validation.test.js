import assert from 'node:assert/strict';import test from 'node:test';import {pagination,range} from '../src/modules/finance/finance.validation.js';
test('finance pagination is bounded',()=>{assert.equal(pagination({pageSize:'100'}).pageSize,100);assert.throws(()=>pagination({pageSize:'101'}),/100/)});
test('finance ranges reject malformed, reversed and excessive periods',()=>{assert.throws(()=>range({startDate:'bad'}),/YYYY/);assert.throws(()=>range({startDate:'2026-02-02',endDate:'2026-01-01'}),/between/);assert.throws(()=>range({startDate:'2020-01-01',endDate:'2026-01-01'}),/730/)});
