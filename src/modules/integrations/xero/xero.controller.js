import {createAuthorization,consumeOAuthState} from './xero.oauth.js';
import {completeOAuth,disconnect,selectTenant,status} from './xero.service.js';
import {runXeroSync} from './xero.sync.service.js';
export async function getStatus(_request,response){response.json(await status());}
export async function connect(request,response){const url=createAuthorization(request);await request.session.save?.(()=>{});response.redirect(url);}
export async function callback(request,response){if(request.query.error){delete request.session.xeroOAuth;return response.redirect('/?view=settings&xero=denied');}consumeOAuthState(request,request.query.state);if(!request.query.code)return response.redirect('/?view=settings&xero=failed');const result=await completeOAuth(request.query.code,request.authenticatedUser.id);if(!result.requiresSelection){await selectTenant(result.pendingId,result.tenants[0].tenantId,request.authenticatedUser.id);return response.redirect('/?view=settings&xero=connected');}request.session.xeroPendingId=result.pendingId;response.redirect('/?view=settings&xero=select-tenant');}
export async function tenant(request,response){response.json(await selectTenant(request.session.xeroPendingId,request.body.tenantId,request.authenticatedUser.id));delete request.session.xeroPendingId;}
export async function remove(request,response){response.json(await disconnect(request.authenticatedUser.id));}
export async function sync(request,response){response.status(202).json(await runXeroSync(request.authenticatedUser.id));}
