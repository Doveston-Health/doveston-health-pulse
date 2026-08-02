import {config} from '../../../core/config/index.js';
import {AppError} from '../../../shared/errors/app-error.js';

export class XeroClientError extends AppError {
  constructor(message='Xero request failed.', statusCode=502, code='XERO_REQUEST_FAILED'){super(message,statusCode);this.code=code;}
}
const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

export function createXeroClient({accessToken,tenantId,fetchImpl=fetch,sleep=delay,maxRetries=2}={}) {
  if (!accessToken || !tenantId) throw new Error('Xero client requires an access token and tenant.');
  const approved=new URL(config.xero.apiBaseUrl);
  async function request(path,{attempt=0}={}) {
    const url=path instanceof URL?new URL(path):new URL(String(path).replace(/^\/+/,''),`${config.xero.apiBaseUrl.replace(/\/+$/,'')}/`);
    if(url.protocol!=='https:'||url.hostname!==approved.hostname)throw new XeroClientError('Unsafe Xero pagination URL rejected.',400,'UNSAFE_XERO_URL');
    let response;
    try{response=await fetchImpl(url,{headers:{Authorization:`Bearer ${accessToken}`,'xero-tenant-id':tenantId,Accept:'application/json','User-Agent':`${config.app.name}/${config.app.version}`},signal:AbortSignal.timeout(15000)});}catch{throw new XeroClientError('Xero request timed out.',504,'XERO_TIMEOUT');}
    if((response.status===429||[502,503,504].includes(response.status))&&attempt<maxRetries){const seconds=Math.min(Number(response.headers.get('retry-after'))||2**attempt,10);await sleep(seconds*1000);return request(url,{attempt:attempt+1});}
    if(!response.ok)throw new XeroClientError(`Xero request failed with status ${response.status}.`,response.status===429?503:502,`XERO_${response.status}`);
    const body=await response.json().catch(()=>null);if(!body)throw new XeroClientError('Xero returned malformed JSON.',502,'XERO_INVALID_JSON');return body;
  }
  async function getAllPages(path,collection,{maxPages=100,pageSize=1000}={}) {
    const rows=[];
    const seen=new Set();
    let observedPageSize=null;
    const idField=collection==='Invoices'?'InvoiceID':collection==='Payments'?'PaymentID':null;

    for(let page=1;page<=maxPages;page+=1){
      const url=new URL(String(path).replace(/^\/+/,''),`${config.xero.apiBaseUrl.replace(/\/+$/,'')}/`);
      url.searchParams.set('page',String(page));
      url.searchParams.set('pageSize',String(pageSize));

      const body=await request(url);
      const pageRows=body?.[collection];

      if(!Array.isArray(pageRows)){
        throw new XeroClientError('Xero returned malformed pagination data.',502,'XERO_INVALID_JSON');
      }

      if(pageRows.length===0)return rows;
      if(observedPageSize===null)observedPageSize=pageRows.length;

      const newRows=idField
        ? pageRows.filter(row=>{
            const id=row?.[idField];
            if(!id||seen.has(id))return false;
            seen.add(id);
            return true;
          })
        : pageRows;

      if(newRows.length===0)return rows;
      rows.push(...newRows);

      if(pageRows.length<observedPageSize)return rows;
    }

    throw new XeroClientError('Xero pagination limit exceeded.',502,'XERO_PAGINATION_LIMIT');
  }
  return {request,getAllPages};
}

export async function discoverTenants(accessToken,{fetchImpl=fetch}={}){
  const response=await fetchImpl(config.xero.connectionsUrl,{headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json','User-Agent':`${config.app.name}/${config.app.version}`},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new XeroClientError('Xero tenant discovery failed.');
  const rows=await response.json().catch(()=>null);if(!Array.isArray(rows))throw new XeroClientError('Xero returned invalid tenant information.');
  return rows.map(({id,tenantId,tenantName,tenantType})=>({connectionId:id,tenantId,tenantName,tenantType})).filter(row=>row.tenantId&&row.tenantName);
}




