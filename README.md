# Doveston Health Pulse — Version 0.1

**Always keep your finger on the pulse.**

This is an interactive product prototype for the Doveston Health-owned clinic analytics and operations platform. It uses demonstration data so the interface can be reviewed safely before real Cliniko and Xero credentials are connected.

## What is included

- Executive Pulse dashboard and clinic health score
- Revenue, utilisation, rebooking and revenue-recovery KPIs
- Practitioner scorecards
- Patient retention action centre
- Referral network reporting
- Finance and Cliniko/Xero reconciliation concept
- Marketing campaign dashboard
- Targets and accountability
- Cliniko API test endpoint structure
- Xero OAuth connection structure
- Light and dark appearance
- Responsive desktop, tablet and mobile layout

## Open the app

### Easiest method

1. Install the current LTS version of Node.js from the official Node.js website.
2. Extract this ZIP file.
3. Open Terminal (Mac) or PowerShell (Windows) inside the extracted `doveston-health-pulse` folder.
4. Run:

```bash
npm install
npm start
```

5. Open `http://localhost:3000` in your browser.

## Optional Cliniko configuration

Copy `.env.example` to `.env` and enter the dedicated Cliniko API key. Do not use a personal API key in production.

## Important

Version 0.1 is a clickable prototype, not yet a production clinical system. Before live use it requires authentication, encrypted database storage, role permissions, audit logs, validated KPI definitions, production-grade Xero token storage and Australian-region hosting.
