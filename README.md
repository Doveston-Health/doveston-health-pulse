# Pulse by Doveston Health — Team Preview v0.2

**Always keep your finger on the pulse.**

Pulse is Doveston Health's clinic operations and intelligence platform. This repository currently contains a responsive, demonstration-only Team Preview with an Executive Pulse homepage and interactive Referral Hub.

## Included in v0.2

- Responsive application shell and workspace navigation
- Executive morning brief and Clinic Pulse score
- Operational priorities, KPI cards and diary-health summaries
- Interactive Referral Hub with search and filters
- Referral detail drawer and demonstration add-referral workflow
- Light and dark appearance
- Express server scaffold
- Cliniko API health/practitioner endpoint scaffold
- Xero OAuth connection scaffold

## Important data notice

All patient, referrer and performance information in this preview is fictional demonstration data. Do not add genuine patient information until authentication, permissions, encrypted storage, audit logging and appropriate production hosting are implemented.

## Requirements

- Node.js 20, 22 or 24
- npm

## Local development

1. Open a terminal in this project folder.
2. Install dependencies:

```bash
npm install
```

3. Create a local `.env` file from the committed template.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Windows Command Prompt:

```bat
copy .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

Development defaults to port `3000` and uses a development-only session secret when `SESSION_SECRET` is empty. Never use that default outside local development.

## Production-style start

`npm start` works consistently on Windows, macOS and Linux and sets `NODE_ENV=production` when it has not already been provided. Production startup requires a non-empty `SESSION_SECRET`:

Windows PowerShell:

```powershell
$env:SESSION_SECRET = '<generate-a-long-random-secret>'
npm start
```

Windows Command Prompt:

```bat
set SESSION_SECRET=<generate-a-long-random-secret>
npm start
```

macOS or Linux:

```bash
SESSION_SECRET='<generate-a-long-random-secret>' npm start
```

Alternatively, set `SESSION_SECRET` in a local `.env` file. The application stops during startup when production configuration is incomplete or invalid.

## Environment variables

The application loads local values from `.env`. Environment variables already supplied by the operating system take precedence. Never commit real API keys or secrets.

- `PORT`: listening port; defaults to `3000` and must be between `1` and `65535`.
- `NODE_ENV`: `development`, `test`, or `production`; defaults to `development` outside `npm start`.
- `LOG_LEVEL`: Pino log level; defaults to `info`.
- `TRUST_PROXY`: Express proxy trust setting; defaults to `loopback`. Set this to the exact proxy hop count or trusted proxy range for the production hosting topology.
- `SESSION_SECRET`: required in production; optional for local development.
- `CLINIKO_ENABLED`: `true` or `false`. If omitted, Cliniko is enabled when `CLINIKO_API_KEY` is present.
- `CLINIKO_API_KEY`: required whenever Cliniko is enabled.
- `CLINIKO_USER_AGENT`: optional Cliniko request identity.
- `XERO_ENABLED`: `true` or `false`. If omitted, Xero is enabled when either Xero credential is present.
- `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`: both required whenever Xero is enabled.
- `XERO_REDIRECT_URI`: OAuth callback URL; defaults to the local callback URL.

## Service endpoints

- `GET /api/health` reports service status, uptime, version, environment and configured integrations.
- `GET /api/ready` returns HTTP `200` while the process is ready to serve traffic and HTTP `503` during startup or shutdown.

Every request receives an `X-Request-ID` response header and produces a structured JSON completion log. API routes are rate limited to 100 requests per minute per client by default. Configure `TRUST_PROXY` for the real deployment topology so client IP detection and rate limiting remain accurate.

## Architecture

Pulse uses a modular monolith structure under `src/`:

```text
src/
  app.js                         Express application composition
  server.js                      HTTP listener startup
  core/
    config/index.js              Environment loading and validation
    logging/logger.js            Structured logging and redaction
    middleware/                  Global HTTP middleware
    server/graceful-shutdown.js  Process lifecycle handling
  modules/
    system/                      Health and readiness module
    integrations/                Existing Cliniko and Xero route scaffolds
  shared/
    errors/app-error.js          Reusable operational error
    http/async-handler.js        Async controller adapter
```

Modules own their HTTP and status behaviour. `core` contains application-wide infrastructure and may not depend on feature modules. `shared` contains small framework-level primitives without business ownership. Only `src/core/config/index.js` may read environment variables. The root `app.js` and `server.js` remain compatibility entry points, while the existing `public/` directory remains the frontend asset root.

## Preview deployment

The `public` directory can be deployed as a static preview. The Express server will also serve the application when deployed to a Node-compatible host.

## Current limitations

This is not yet a production clinical system. Live patient documents, referral file uploads, Cliniko synchronisation, Xero data, authentication, permissions, database persistence and audit history are future development stages.
