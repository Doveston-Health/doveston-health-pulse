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
- PostgreSQL and Prisma persistence foundation
- Cliniko API health/practitioner endpoint scaffold
- Xero OAuth connection scaffold

## Important data notice

All patient, referrer and performance information in this preview is fictional demonstration data. Do not add genuine patient information until authentication, permissions, encrypted storage, audit logging and appropriate production hosting are implemented.

## Requirements

- Node.js 20, 22 or 24
- npm
- Docker Desktop, Docker Engine with the Compose plugin, or another PostgreSQL 16 instance

## Local development

1. Open a terminal in this project folder and install dependencies:

```bash
npm install
```

2. Create a local `.env` file from the committed template.

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

3. Start PostgreSQL and wait for it to become healthy:

```bash
docker compose up -d postgres
docker compose ps
```

4. Apply the committed migrations and seed the non-sensitive baseline data:

```bash
npm run db:migrate:deploy
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

Development defaults to port `3000`, PostgreSQL on `localhost:5432`, and development-only database and session credentials. Never use those defaults outside local development.

## Production-style start

`npm start` works consistently on Windows, macOS and Linux and sets `NODE_ENV=production` when it has not already been provided. Production startup requires a non-empty `SESSION_SECRET` and a production `DATABASE_URL`. Set secrets through the hosting platform rather than committing them:

Windows PowerShell:

```powershell
$env:SESSION_SECRET = '<generate-a-long-random-secret>'
$env:DATABASE_URL = '<managed-postgresql-url>'
npm start
```

Windows Command Prompt:

```bat
set SESSION_SECRET=<generate-a-long-random-secret>
set DATABASE_URL=<managed-postgresql-url>
npm start
```

macOS or Linux:

```bash
SESSION_SECRET='<generate-a-long-random-secret>' DATABASE_URL='<managed-postgresql-url>' npm start
```

Before production startup, apply migrations with `npm run db:migrate:deploy`.

## Environment variables

The application loads local values from `.env`. Environment variables already supplied by the operating system take precedence. Never commit real API keys or secrets.

- `PORT`: listening port; defaults to `3000` and must be between `1` and `65535`.
- `NODE_ENV`: `development`, `test`, or `production`; defaults to `development` outside `npm start`.
- `LOG_LEVEL`: Pino log level; defaults to `info`.
- `TRUST_PROXY`: Express proxy trust setting; defaults to `loopback`.
- `SESSION_SECRET`: required in production; optional for local development.
- `DATABASE_URL`: PostgreSQL connection URL used by the application and Prisma; defaults to the local Compose database in development.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `POSTGRES_PORT`: configure the local Compose service. Keep them aligned with `DATABASE_URL`.
- `CLINIKO_ENABLED`: `true` or `false`. If omitted, Cliniko is enabled when `CLINIKO_API_KEY` is present.
- `CLINIKO_API_KEY`: required whenever Cliniko is enabled.
- `CLINIKO_USER_AGENT`: optional Cliniko request identity.
- `XERO_ENABLED`: `true` or `false`. If omitted, Xero is enabled when either Xero credential is present.
- `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET`: both required whenever Xero is enabled.
- `XERO_REDIRECT_URI`: OAuth callback URL; defaults to the local callback URL.

## Service endpoints

- `GET /api/health` reports service status, uptime, version, environment and configured integrations.
- `GET /api/ready` returns HTTP `200` while the process and database are ready. It returns HTTP `503` during startup, shutdown, or a database outage and includes `databaseReady`.

Every request receives an `X-Request-ID` response header and produces a structured JSON completion log. API routes are rate limited to 100 requests per minute per client by default.

## Architecture

Pulse uses a modular monolith structure under `src/`:

```text
src/
  app.js                         Express application composition
  server.js                      HTTP listener and infrastructure startup
  core/
    config/index.js              Environment loading and validation
    database/                    Prisma client, readiness and disconnection
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

Modules own their HTTP and status behaviour. `core` contains application-wide infrastructure and may not depend on feature modules. `shared` contains small framework-level primitives without business ownership. Only `src/core/config/index.js` reads environment variables. The root `app.js` and `server.js` remain compatibility entry points, and `public/` remains the frontend asset root.

## Database and Prisma workflow

The Compose service stores PostgreSQL data in the named `pulse_postgres_data` volume. Stopping the container does not remove it:

```bash
docker compose stop postgres
docker compose start postgres
```

Database commands:

- `npm run db:generate` regenerates Prisma Client after schema changes.
- `npm run db:migrate -- --name <migration-name>` creates and applies a development migration.
- `npm run db:migrate:deploy` applies committed migrations without creating new ones.
- `npm run db:seed` upserts baseline roles and Cliniko/Xero integration records.
- `npm run db:studio` opens Prisma Studio for local inspection.
- `npm run db:reset` drops and recreates the configured schema, reapplies migrations and seeds it.

> **Warning:** `npm run db:reset` destroys all data in the configured database. Use it only against a disposable local development database.

The seed contains only role definitions and unconfigured integration records. It contains no credentials, patients, or production data. `IntegrationCredential.encryptedValue` is a storage placeholder for a future encryption implementation; do not store plaintext secrets there.

### Database troubleshooting

- If port `5432` is already in use, change `POSTGRES_PORT` in `.env` and update the port in `DATABASE_URL`.
- If `/api/ready` returns `503`, check `docker compose ps` and `docker compose logs postgres`, then confirm that `DATABASE_URL` matches the Compose credentials and port.
- If Prisma Client is stale after a schema change, run `npm run db:generate`.
- Do not edit a migration that has already been deployed. Correct the schema and create a new migration.
- For managed PostgreSQL, store `DATABASE_URL` in the platform secret manager and run `npm run db:migrate:deploy` as a release step.

## Preview deployment

The `public` directory can be deployed as a static preview. The Express server will also serve the application when deployed to a Node-compatible host.

## Current limitations

This is not yet a production clinical system. Live patient documents, referral file uploads, Cliniko synchronisation, Xero data, authentication, permissions, credential encryption and populated audit history are future development stages.
