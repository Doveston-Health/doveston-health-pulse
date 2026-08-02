import assert from 'node:assert/strict';import test from 'node:test';import {createXeroClient,discoverTenants} from '../src/modules/integrations/xero/xero.client.js';
const response=(status,body,headers={})=>({ok:status>=200&&status<300,status,headers:new Headers(headers),json:async()=>body});
test('Xero client sets bearer, tenant and identifying headers',async()=>{let request;const client=createXeroClient({accessToken:'token',tenantId:'tenant',fetchImpl:async(url,options)=>(request={url,options},response(200,{Invoices:[]}))});await client.request('/Invoices');assert.equal(request.options.headers.Authorization,'Bearer token');assert.equal(request.options.headers['xero-tenant-id'],'tenant');assert.match(request.options.headers['User-Agent'],/doveston-health-pulse/)});
test('Xero client rejects foreign and non-HTTPS links',async()=>{const client=createXeroClient({accessToken:'token',tenantId:'tenant'});await assert.rejects(client.request('https://evil.example/data'),/Unsafe/);await assert.rejects(client.request('http://api.xero.com/data'),/Unsafe/)});
test('Xero 429 retries are bounded and honour Retry-After',async()=>{let calls=0,wait;const client=createXeroClient({accessToken:'token',tenantId:'tenant',maxRetries:1,sleep:async ms=>{wait=ms},fetchImpl:async()=>{calls++;return response(calls===1?429:200,{}, {'retry-after':'2'})}});await client.request('/Invoices');assert.equal(calls,2);assert.equal(wait,2000)});
test('Xero upstream bodies and malformed JSON are sanitised',async()=>{for(const fetchImpl of [async()=>response(401,{secret:'leak'}),async()=>({...response(200,null),json:async()=>{throw new Error('raw')}})]){const client=createXeroClient({accessToken:'token',tenantId:'tenant',fetchImpl});await assert.rejects(client.request('/Invoices'),error=>!error.message.includes('leak')&&!error.message.includes('raw'))}});
test('tenant discovery handles zero, one and many safely',async()=>{for(const rows of [[],[{tenantId:'1',tenantName:'One'}],[{tenantId:'1',tenantName:'One'},{tenantId:'2',tenantName:'Two'}]])assert.equal((await discoverTenants('token',{fetchImpl:async()=>response(200,rows)})).length,rows.length)});

test('Xero pagination retrieves every numbered page and stops on an empty page',async()=>{
  const requested=[];
  const client=createXeroClient({
    accessToken:'token',
    tenantId:'tenant',
    fetchImpl:async url=>{
      requested.push(url.toString());
      const page=Number(url.searchParams.get('page'));
      const rows=page===1?[{InvoiceID:'1'}]:page===2?[{InvoiceID:'2'}]:[];
      return response(200,{Invoices:rows});
    }
  });
  const rows=await client.getAllPages('/Invoices','Invoices');
  assert.deepEqual(rows,[{InvoiceID:'1'},{InvoiceID:'2'}]);
  assert.deepEqual(requested.map(value=>new URL(value).searchParams.get('page')),['1','2','3']);
});
