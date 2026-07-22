import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json());
app.use(session({secret:config.sessionSecret,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:config.isProduction}}));
app.use(express.static(path.join(__dirname, 'public')));

const clinikoHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${config.cliniko.apiKey}:`).toString('base64')}`,
  Accept: 'application/json',
  'User-Agent': config.cliniko.userAgent
});

app.get('/api/health', (_req,res)=>res.json({ok:true,clinikoConfigured:config.cliniko.enabled,xeroConfigured:config.xero.enabled}));

app.get('/api/cliniko/practitioners', async (_req,res)=>{
  if(!config.cliniko.enabled) return res.status(503).json({error:'Cliniko is not configured. Add CLINIKO_API_KEY to the server environment.'});
  try {
    const r=await fetch('https://api.au4.cliniko.com/v1/practitioners?per_page=100',{headers:clinikoHeaders()});
    if(!r.ok) return res.status(r.status).json({error:'Cliniko request failed',details:await r.text()});
    res.json(await r.json());
  } catch(e){res.status(500).json({error:'Cliniko connection error',details:e.message});}
});

app.get('/api/xero/connect', (req,res)=>{
  if(!config.xero.enabled) return res.status(503).send('Xero is not configured.');
  const state=crypto.randomBytes(24).toString('hex'); req.session.xeroState=state;
  const params=new URLSearchParams({response_type:'code',client_id:config.xero.clientId,redirect_uri:config.xero.redirectUri,scope:'openid profile email offline_access accounting.transactions.read accounting.reports.read',state});
  res.redirect(`https://login.xero.com/identity/connect/authorize?${params}`);
});

app.get('/api/xero/callback', async (req,res)=>{
  if(!req.query.code || req.query.state!==req.session.xeroState) return res.status(400).send('Invalid OAuth callback.');
  // Production: exchange code for tokens, encrypt refresh token at rest, fetch tenant connection, and persist audit metadata.
  res.redirect('/?xero=callback-received');
});

app.listen(config.port,()=>console.log(`Doveston Health Pulse running at http://localhost:${config.port}`));
