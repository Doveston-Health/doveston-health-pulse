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

## Run locally

1. Install the current Node.js LTS release.
2. Open a terminal in this project folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` for local integration development. Never commit real API keys or secrets.

## Preview deployment

The `public` directory can be deployed as a static preview. The Express server will also serve the application when deployed to a Node-compatible host.

## Current limitations

This is not yet a production clinical system. Live patient documents, referral file uploads, Cliniko synchronisation, Xero data, authentication, permissions, database persistence and audit history are future development stages.
