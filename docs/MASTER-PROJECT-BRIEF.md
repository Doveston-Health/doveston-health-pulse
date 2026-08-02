# Pulse Master Project Brief

| Field | Value |
| --- | --- |
| Product | Pulse by Doveston Health |
| Work item | PUL-007 |
| Document status | Living project brief |
| Baseline | Team Preview v0.2 |
| Last updated | 30 July 2026 |
| Owner | Doveston Health |

## 1. Purpose

This document is the canonical product and delivery brief for Pulse. It aligns product, clinical operations, engineering and delivery stakeholders on:

- the problem Pulse is intended to solve;
- the current implemented baseline;
- the capabilities that are in and out of scope;
- the architectural, security and privacy principles that govern delivery;
- the staged path from demonstration software to an approved operational service; and
- the decisions and evidence required before real patient information is introduced.

This is a living document. Approved changes to product scope, architecture or delivery policy must update this brief through the repository's normal review process.

## 2. Product vision

Pulse will give Doveston Health a trusted, role-appropriate view of clinic performance and operational priorities. It should help the team understand what needs attention, act on referrals and workflow exceptions, and make decisions from consistent information without replacing the clinical and financial systems of record.

The intended outcome is a calm, useful operating picture: the right information, for the right team member, at the right time.

## 3. Problem statement

Clinic information is distributed across operational, clinical, financial and communication systems. Manual reconciliation makes it difficult to:

- see emerging operational risks early;
- understand referral progress and ownership;
- distinguish urgent work from routine activity;
- present role-appropriate information consistently;
- trace important administrative actions; and
- assess clinic performance without assembling multiple reports.

Pulse is intended to consolidate approved operational signals and workflows while preserving clear ownership of source data.

## 4. Product objectives

Pulse should:

1. Present a concise clinic-wide operating picture.
2. Make high-priority work and exceptions visible.
3. Support safe, traceable referral administration.
4. Apply least-privilege access to staff capabilities and data.
5. Integrate incrementally with approved source systems.
6. Provide observable, recoverable and maintainable service operation.
7. Keep clinical and financial systems of record authoritative.
8. Support evidence-based rollout from fictional demonstration data to approved production data.

## 5. Non-goals

Unless an approved future brief explicitly changes these boundaries, Pulse is not intended to:

- replace an electronic medical record or practice-management system;
- replace Xero as the financial system of record;
- provide clinical diagnosis, clinical decision support or emergency triage;
- store real patient information in the current preview;
- perform unsupervised writes to an external source system;
- introduce live Cliniko or Xero synchronisation before its security and data contracts are approved; or
- claim regulatory compliance solely because a technical control exists.

## 6. Delivery principles

### 6.1 Preserve working behaviour

Changes should extend the existing application. Existing routes, response contracts and frontend behaviour must remain stable unless an approved work item explicitly authorizes a change.

### 6.2 Modular monolith first

Pulse uses a modular monolith so that domain boundaries remain explicit without introducing premature distributed-system complexity. Modules communicate through documented application interfaces rather than by reaching into one another's internals.

### 6.3 Configuration is centralized

Environment variables are loaded and validated through the central configuration module. Secrets must not appear in source control, logs, browser assets or API responses.

### 6.4 Source systems remain authoritative

Pulse may aggregate, interpret and display approved data, but ownership of clinical and financial records remains with the nominated source system.

### 6.5 Security and privacy are release gates

Technical implementation does not by itself authorize real patient data. Privacy assessment, access design, operational procedures, hosting approval, backup and recovery evidence, and incident response readiness are separate release gates.

### 6.6 Incremental, reversible delivery

New integrations and data flows should begin read-only, use fictional or synthetic data where practical, be observable, and have a documented rollback or disable path.

## 7. Current implemented baseline

The repository currently provides the following foundations.

### 7.1 User experience

- Responsive application shell and workspace navigation.
- Executive Pulse homepage with fictional clinic metrics.
- Operational priorities, KPI cards and diary-health summaries.
- Referral Hub search, filters, detail drawer and demonstration add-referral workflow.
- Light and dark appearance.
- Fictional demonstration data only.

### 7.2 Service foundation

- Node.js and Express service with a modular monolith structure.
- Cross-platform configuration and startup workflow.
- Structured Pino logging and request IDs.
- Central error handling.
- Security headers, API rate limiting and response compression.
- Liveness and readiness endpoints.
- Graceful shutdown handling.

### 7.3 Persistence foundation

- PostgreSQL local-development service through Docker Compose.
- Prisma schema, migrations, client generation and seed workflow.
- Baseline models for users, roles, settings, audit records, integrations, credentials and sync jobs.
- Database connectivity included in readiness.

### 7.4 Identity and access foundation

- Staff sign-in and sign-out.
- Server-side session handling.
- Baseline role-based access control.
- Protected API and page access.
- Authentication event auditing.

The baseline roles are:

- `DIRECTOR`
- `PRACTICE_MANAGER`
- `ADMIN`
- `CLINICIAN`

These roles are implementation primitives, not a final authorization policy. Permission changes require explicit product and privacy review.

### 7.5 Integration scaffolds

- Cliniko health and practitioner endpoint scaffolding.
- Xero OAuth connection scaffolding.
- Integration and credential persistence placeholders.

Live integration synchronisation and production credential handling are not part of the current baseline.

## 8. Capability map

| Capability | Intended value | Current state |
| --- | --- | --- |
| Executive Pulse | Summarize clinic health and priorities | Demonstration UI |
| Referral Hub | Track and action referral workflow | Demonstration UI |
| Patients | Present approved patient context | Future; no real patient data |
| Team | Support role-appropriate staff workflows | Authentication foundation |
| Finance | Present approved financial indicators | Xero scaffold only |
| Marketing | Understand approved acquisition signals | Future |
| Operations | Surface workflow exceptions and ownership | Demonstration foundation |
| Knowledge | Provide governed operational guidance | Future |
| Settings | Manage approved service configuration | Persistence foundation |
| Audit | Trace security and material administrative events | Authentication events only |
| Integrations | Connect approved source systems | Scaffolds only |

## 9. Users and access

### 9.1 Primary user groups

- Directors need clinic-wide performance, risk and trend visibility.
- Practice managers need operational oversight, workload and exception handling.
- Administrative staff need safe, focused workflows for referrals and coordination.
- Clinicians need appropriate operational context without unnecessary administrative or financial access.

### 9.2 Access principles

- Deny access by default.
- Grant the minimum permissions required for a role.
- Enforce authorization on the server, not only in the interface.
- Avoid exposing sensitive fields in list responses, logs or error messages.
- Record security-sensitive and material administrative events.
- Review dormant accounts and role assignments through an approved operational process.
- Require a documented owner for each permission and privileged workflow.

## 10. Data domains and ownership

| Domain | Purpose | Authority |
| --- | --- | --- |
| Identity and roles | Staff identity and access | Pulse administration |
| Sessions | Authenticated browser sessions | Pulse |
| Settings | Application configuration | Pulse administration |
| Audit events | Trace material system activity | Pulse |
| Integrations and sync jobs | Connection state and processing history | Pulse |
| Clinical and appointment data | Patient and clinical record | Cliniko, when approved |
| Financial data | Accounting record | Xero, when approved |
| Demonstration metrics | Preview and design validation | Fictional local data |

Before a new data category is introduced, its owner, purpose, lawful handling basis, sensitivity, retention period, deletion process and access policy must be documented.

## 11. Architecture direction

### 11.1 Runtime shape

Pulse is a server-rendered/static frontend and Express API deployed as one service, backed by PostgreSQL. The modular monolith is organized around core platform concerns, domain modules and shared presentation assets.

### 11.2 Module boundaries

Each module should own its routes, service logic and persistence interactions. Cross-cutting concerns such as configuration, logging, database lifecycle, authentication, errors and request metadata belong in core infrastructure.

### 11.3 Database access

Prisma is the supported application data-access layer. Schema changes require migrations, review and a recovery plan. Application code must use the shared database client and lifecycle rather than creating independent clients.

### 11.4 API stability

Existing success response payloads should remain compatible. Error responses should be consistent and must not disclose stack traces or secrets in production.

### 11.5 Observability

Requests, startup, readiness failures, integration failures and shutdown events should be represented in structured logs. Logs must carry useful correlation identifiers without containing credentials, session values or unnecessary personal information.

## 12. Integration direction

### 12.1 Cliniko

Cliniko is the anticipated authority for approved patient, practitioner, appointment and clinical workflow data. Any live implementation must define:

- exact data fields and purposes;
- read and write boundaries;
- API rate and retry behaviour;
- incremental synchronisation and reconciliation;
- deletion and retention handling;
- patient identity matching;
- error ownership; and
- audit and rollback requirements.

### 12.2 Xero

Xero is the anticipated authority for approved accounting data. Any live implementation must define:

- the minimum financial fields required;
- tenant selection and consent handling;
- token lifecycle and encryption;
- accounting period and reconciliation rules;
- read-only versus write scope;
- failure and reauthorization workflows; and
- access restrictions for financial information.

### 12.3 Credential handling

The existing `encryptedValue` field is a storage placeholder. It does not mean encryption has been implemented. Production credentials must not be stored until an approved encryption and key-management design is in place.

## 13. Security, privacy and safety requirements

Before production use with sensitive or patient information, Pulse requires documented evidence for:

- threat modelling and security review;
- privacy impact assessment and data-flow mapping;
- production secret storage and rotation;
- encryption in transit and at rest;
- session security and privileged-access controls;
- complete authorization rules and negative tests;
- audit coverage, protection and retention;
- dependency and credential scanning;
- backup, restore and disaster-recovery testing;
- vulnerability and patch-management processes;
- incident detection, response and notification procedures;
- secure onboarding and offboarding;
- data retention, deletion and subject-request procedures; and
- hosting, supplier and contractual approval.

Sensitive information must never be added to seed data, fixtures, screenshots, test logs, source control or documentation examples.

## 14. Non-functional requirements

### 14.1 Availability and readiness

- Liveness should indicate that the service process is operating.
- Readiness should reflect dependencies required to serve traffic, including the database.
- Failed dependencies should produce an actionable, non-secret diagnostic log.
- Shutdown should stop accepting work and release resources cleanly.

### 14.2 Performance

Performance budgets should be established from measured workflows before production launch. API pagination, bounded queries and integration rate limits should be designed before real datasets are introduced.

### 14.3 Accessibility

Core workflows should target WCAG 2.2 AA. Keyboard navigation, focus management, colour contrast, readable status messaging and assistive-technology testing must be included in acceptance criteria.

### 14.4 Compatibility

Local development must remain supported on Windows, macOS and Linux using documented Node.js, npm, Docker Compose and environment setup.

### 14.5 Maintainability

- Keep modules cohesive and dependencies explicit.
- Validate inputs at trust boundaries.
- Add automated tests in proportion to risk.
- Document operationally significant decisions.
- Avoid major framework or architecture changes without an approved decision record.

### 14.6 Recovery

Recovery point and recovery time objectives must be agreed before production launch. Database restoration and credential recovery procedures must be tested, not merely documented.

## 15. Environments and release gates

### 15.1 Local development

Local development uses fictional data, local environment configuration and PostgreSQL through Docker Compose or an equivalent PostgreSQL 16 service.

### 15.2 Pre-production

A pre-production environment should use production-like infrastructure, synthetic data and separate credentials. It is the proving ground for migrations, integration contracts, observability, access rules and recovery exercises.

### 15.3 Production

Production release requires:

- approved hosting and database configuration;
- production secret management;
- completed privacy and security gates;
- tested migration and rollback procedures;
- tested backup and restoration;
- operational ownership and alerting;
- access provisioning and support procedures; and
- explicit approval to process each sensitive data category.

Passing automated tests is necessary but does not replace these approvals.

## 16. Completed milestones

The following milestone records describe the accepted foundation on which the roadmap depends.

### PUL-001 — Cross-platform configuration foundation

**Objective:** Make local and production startup predictable across Windows, macOS and Linux while centralizing validated configuration.

**Delivered:**

- Cross-platform npm startup commands.
- `dotenv` loading and a placeholder-only `.env.example`.
- Central configuration object for `PORT`, `NODE_ENV`, session and integration settings.
- Environment-specific validation and documented Node.js support.

**Acceptance criteria:**

- The existing application starts through the documented npm workflow on supported operating systems.
- Production fails fast when required configuration is absent.
- Application code does not read `process.env` outside the configuration module.
- Secret values are not logged, returned or committed.

**Status:** Completed.

### PUL-002 — Production server foundation

**Objective:** Harden the Express service for observable, secure and graceful production operation without changing frontend or successful API contracts.

**Delivered:**

- Structured Pino application and request logging.
- Request IDs, response timing and secret redaction.
- Central error middleware.
- Helmet, compatible CSP, rate limiting, compression and proxy configuration.
- Liveness, readiness and graceful shutdown.

**Acceptance criteria:**

- `/api/health` and `/api/ready` report service state without leaking secrets.
- Unhandled route errors use consistent JSON and production responses hide stacks.
- API traffic is correlated by request ID.
- `SIGINT` and `SIGTERM` close the HTTP server cleanly.

**Status:** Completed.

### PUL-003 — Modular monolith architecture

**Objective:** Organize the existing service into explicit modules and core infrastructure while preserving all behaviour and contracts.

**Delivered:**

- Modular application composition and route ownership.
- Core boundaries for configuration, logging, middleware and lifecycle.
- Module scaffolds for current Pulse capabilities and integrations.
- Reduced server entry-point responsibility.

**Acceptance criteria:**

- Existing pages, routes, endpoints and payloads remain compatible.
- Modules own their routes and services rather than accumulating logic in the entry point.
- Cross-cutting infrastructure is reusable and centrally composed.
- The application starts and the dashboard remains functional.

**Status:** Completed.

### PUL-004 — PostgreSQL and Prisma database foundation

**Objective:** Add durable PostgreSQL persistence and a clean Prisma lifecycle to the modular monolith.

**Delivered:**

- PostgreSQL 16 Docker Compose development service.
- Prisma schema, migration, generation, seed and administration workflows.
- Baseline identity, role, setting, audit, integration, credential and sync-job models.
- Startup connection, readiness check and graceful disconnection.

**Acceptance criteria:**

- The schema validates, the client generates, migrations apply and non-sensitive seeds run.
- Readiness returns success with a connected database and `503` when it is unavailable.
- Database access uses the shared client and centralized `DATABASE_URL`.
- No plaintext credentials, patient information or production data are seeded.

**Status:** Completed.

### PUL-005 — Authentication data and session preparation

**Objective:** Prepare the persistence, configuration and operational controls required for secure staff authentication.

**Delivered:**

- Database-backed user and role foundations.
- Session-secret validation and environment-aware cookie configuration.
- Baseline role seed definitions and bootstrap workflow prerequisites.
- Audit and lifecycle foundations used by authentication.

**Acceptance criteria:**

- Identity records can be created without introducing real patient data.
- Role identifiers are consistent and seedable.
- Production cannot start with unsafe session-secret configuration.
- Authentication prerequisites integrate with existing database and logging lifecycles.

**Status:** Completed as a foundation incorporated into the PUL-004/PUL-006 implementation history.

### PUL-006 — Authentication and role-based access control

**Objective:** Protect Pulse with database-backed staff authentication, secure sessions and baseline role authorization.

**Delivered:**

- Staff sign-in, sign-out and current-session handling.
- Password hashing and server-side session persistence.
- Protected page and API access.
- Baseline `DIRECTOR`, `PRACTICE_MANAGER`, `ADMIN` and `CLINICIAN` roles.
- Bootstrap administrator workflow and authentication audit events.

**Acceptance criteria:**

- Unauthenticated users cannot access protected application content.
- Valid staff can sign in and sign out without changing existing authorized-user behaviour.
- Authorization is enforced on the server.
- Passwords, session identifiers and authentication tokens are not logged or returned.

**Status:** Completed and merged.

## 17. Future milestone roadmap

Every future milestone is a discrete, reviewable delivery unit. A milestone may be re-sequenced only through an approved brief change; dependencies and privacy gates still apply.

### PUL-007 — Master project brief

- **Milestone number:** PUL-007
- **Name:** Master project brief and roadmap
- **Objective:** Establish the canonical product, architecture, governance and delivery reference.
- **Main features:** Completed-milestone record; PUL-007–PUL-040 roadmap; module roadmap; AI capability roadmap; Windows workflow; risks and release gates.
- **Dependencies:** PUL-001–PUL-006 and approved product direction.
- **Acceptance criteria:** This document explicitly contains every required milestone and capability; README links to it; only documentation files change.

### PUL-008 — Automated quality foundation

- **Milestone number:** PUL-008
- **Name:** Automated testing and CI quality gates
- **Objective:** Protect established behaviour before feature expansion.
- **Main features:** ESLint flat configuration; expanded unit and isolated route-contract testing for health, readiness, liveness, authentication, authorization, security headers and errors; Prisma generation and clean-database migration validation; Gitleaks credential scanning; GitHub Actions CI on Pull Requests and pushes to `main`.
- **Dependencies:** PUL-001–PUL-007.
- **Acceptance criteria:** Local lint, test and combined quality commands pass; committed migrations deploy to clean PostgreSQL in CI; credential findings fail CI; the stable `PUL-008 quality workflow` check is configured by a repository administrator as required for `main`; no runtime route, authentication or database-model contracts change.
- **Status:** Implemented for local review; not complete or merged until local verification, the first GitHub Actions run and required-status-check configuration are verified.

### PUL-009 — Cliniko read-only integration and initial sync

- **Milestone number:** PUL-009
- **Name:** Cliniko read-only integration and initial sync
- **Objective:** Establish Cliniko as the authoritative operational source through a governed, read-only and source-attributed local projection.
- **Main features:** Safe connection test; HTTPS client and pagination; bounded rate-limit retry; minimum-data business, practitioner, patient and booking sync; idempotent persistence; multi-patient booking relationships; audit, status, counts, sync history and management UI.
- **Dependencies:** PUL-004, PUL-006 and PUL-008 plus approved Cliniko credentials and data-minimisation rules.
- **Acceptance criteria:** Directors and Practice Managers can test and run one non-overlapping read-only sync; failures are sanitised; no clinical/free-text fields, credentials or raw upstream bodies are persisted or returned; all quality and migration checks pass.
- **Status:** Implemented for review; not completed until local verification and merge.

### PUL-010 — Live clinic operations intelligence

- **Milestone number:** PUL-010
- **Name:** Live clinic operations intelligence using Cliniko data
- **Objective:** Give clinic leaders governed visibility, prioritisation and investigation using the PUL-009 local Cliniko projection without recreating Cliniko's operational diary.
- **Main features:** Timezone-correct daily overview; forward-booking momentum; timing-based rebooking opportunities; cancellation intelligence; bounded trends; transparent priority signals; approved patient investigation; source freshness.
- **Dependencies:** PUL-009 and approved Cliniko contract.
- **Acceptance criteria:** All four approved roles can access source-labelled local insights; Cliniko remains the source of truth; no request-time Cliniko calls or write-back occur; no attendance, discharge, capacity, utilisation, revenue or clinical inference is made; thresholds, timezone, privacy, bounded-query and failure paths are tested.
- **Status:** Implemented for review; not completed until local verification and merge.

### PUL-011 — Xero read-only integration

- **Milestone number:** PUL-011
- **Name:** Xero read-only integration and finance snapshot
- **Objective:** Establish a governed, read-only financial projection while preserving Xero as the accounting source of truth.
- **Main features:** OAuth/token lifecycle; encrypted credential storage; tenant selection; read-only finance snapshot; sync status; reconciliation.
- **Dependencies:** PUL-009, approved Xero scopes and production credential encryption.
- **Acceptance criteria:** Restricted financial views reconcile to approved Xero samples; credentials are encrypted; no unauthorized accounting writes occur.
- **Status:** Implemented for review with OAuth, authenticated token encryption, explicit tenant selection, staged local sync and read-only finance intelligence. Live consent still requires user-owned Xero credentials and approval.

The original PUL-011 patient-workspace identity is retained historically in the PUL-007 brief. The approved resequencing assigns PUL-011 to Xero; later milestones retain their existing identities unless a separately approved roadmap revision explicitly moves the displaced patient workspace. This exception avoids silently renumbering PUL-012–PUL-040.

### PUL-012 — Practitioners

- **Milestone number:** PUL-012
- **Name:** Practitioner management
- **Objective:** Model practitioners, availability and operational ownership consistently.
- **Main features:** Practitioner directory; disciplines; locations; availability; workload indicators; Cliniko mapping.
- **Dependencies:** PUL-010–PUL-011.
- **Acceptance criteria:** Practitioner records reconcile with the approved source; access and data ownership are documented; duplicate mappings are detectable.

### PUL-013 — Staff

- **Milestone number:** PUL-013
- **Name:** Staff administration
- **Objective:** Govern staff lifecycle, roles and operational responsibilities.
- **Main features:** Staff directory; activation and deactivation; role assignment; onboarding; offboarding; access review.
- **Dependencies:** PUL-006, PUL-008 and PUL-012.
- **Acceptance criteria:** Privileged changes require authorization and audit; deactivation removes access; role assignment has negative tests.

### PUL-014 — Clinical operations

- **Milestone number:** PUL-014
- **Name:** Clinical operations oversight
- **Objective:** Surface approved operational exceptions around clinical service delivery.
- **Main features:** Caseload overview; overdue actions; handover status; service exceptions; escalation ownership.
- **Dependencies:** PUL-010–PUL-013 and approved clinical-data boundaries.
- **Acceptance criteria:** Views disclose only role-appropriate minimum data; every indicator has provenance, freshness and ownership.

### PUL-015 — Clinical notes

- **Milestone number:** PUL-015
- **Name:** Clinical note access and governance
- **Objective:** Support explicitly approved note workflows without displacing the clinical record.
- **Main features:** Read-only note summaries or links; access reason; sensitivity controls; audit; source-system handoff.
- **Dependencies:** PUL-011, PUL-014, clinical governance and privacy approval.
- **Acceptance criteria:** Cliniko remains authoritative; every note access is authorized and auditable; sensitive content is excluded from logs.

### PUL-016 — Tasks

- **Milestone number:** PUL-016
- **Name:** Task and follow-up management
- **Objective:** Make operational actions assignable, visible and traceable.
- **Main features:** Tasks; owners; due dates; priorities; status; reminders; links to permitted records.
- **Dependencies:** PUL-009, PUL-013 and PUL-014.
- **Acceptance criteria:** Tasks respect linked-record permissions; state transitions are audited; overdue and unassigned work is visible.

### PUL-017 — Internal communication

- **Milestone number:** PUL-017
- **Name:** Internal communication
- **Objective:** Provide secure, contextual team communication for operational work.
- **Main features:** Threads; mentions; announcements; task linking; retention controls; notification preferences.
- **Dependencies:** PUL-013 and PUL-016.
- **Acceptance criteria:** Participants are authorized for linked context; retention is enforced; communications are searchable and auditable as approved.

### PUL-018 — Reporting

- **Milestone number:** PUL-018
- **Name:** Operational reporting
- **Objective:** Deliver consistent, exportable operational reports with known definitions.
- **Main features:** Report catalogue; filters; scheduling; export; provenance; access controls.
- **Dependencies:** PUL-010–PUL-017 and approved metric definitions.
- **Acceptance criteria:** Reports reconcile to source samples; exports obey permissions; definition, owner and freshness accompany each report.

### PUL-019 — KPIs

- **Milestone number:** PUL-019
- **Name:** KPI framework
- **Objective:** Establish governed clinic performance measures.
- **Main features:** KPI dictionary; targets; trends; thresholds; drill-down; data-quality signals.
- **Dependencies:** PUL-018 and executive approval of definitions.
- **Acceptance criteria:** Every KPI has a formula, source, owner, cadence and threshold; calculations have automated tests.

### PUL-020 — Finance

- **Milestone number:** PUL-020
- **Name:** Finance operations
- **Objective:** Present approved financial indicators while retaining Xero as authority.
- **Main features:** Revenue and receivables views; reconciliation status; period filters; Xero read-only pilot; financial RBAC.
- **Dependencies:** PUL-008, PUL-018–PUL-019 and approved Xero credential design.
- **Acceptance criteria:** Values reconcile to Xero samples; access is restricted; token handling is encrypted; Pulse performs no unauthorized accounting writes.

### PUL-021 — Marketing

- **Milestone number:** PUL-021
- **Name:** Marketing performance
- **Objective:** Connect approved acquisition activity to referral and service outcomes.
- **Main features:** Campaign and channel tracking; attribution; lead funnel; consent-aware segmentation; trend reports.
- **Dependencies:** PUL-018–PUL-020 and marketing data-governance approval.
- **Acceptance criteria:** Attribution rules are documented; consent restrictions are enforced; patient information is excluded unless explicitly approved.

### PUL-022 — Referrals

- **Milestone number:** PUL-022
- **Name:** Referral workflow
- **Objective:** Replace demonstration-only referral interactions with governed persistence and workflow.
- **Main features:** Referral intake; triage; assignment; status history; source documents; referrer context; ageing.
- **Dependencies:** PUL-011–PUL-016 and document-security controls.
- **Acceptance criteria:** Referral state is durable and audited; uploads are scanned and access-controlled; existing Referral Hub behaviour remains compatible.

### PUL-023 — NDIS

- **Milestone number:** PUL-023
- **Name:** NDIS workflows
- **Objective:** Support approved NDIS administration and service tracking.
- **Main features:** Plan context; service agreements; budgets; claims readiness; document checklist; expiry alerts.
- **Dependencies:** PUL-011, PUL-018, PUL-020, PUL-022 and NDIS policy review.
- **Acceptance criteria:** Rules are configurable and dated; calculations reconcile to approved examples; access and audit requirements pass review.

### PUL-024 — WorkCover

- **Milestone number:** PUL-024
- **Name:** WorkCover workflows
- **Objective:** Coordinate WorkCover administrative requirements and claim status.
- **Main features:** Claim details; insurer and employer contacts; approvals; certificates; billing status; reminders.
- **Dependencies:** PUL-011, PUL-020, PUL-022 and jurisdictional policy review.
- **Acceptance criteria:** Required fields and deadlines are configurable; sensitive claim information is restricted; sample workflows reconcile.

### PUL-025 — DVA

- **Milestone number:** PUL-025
- **Name:** DVA workflows
- **Objective:** Support approved Department of Veterans' Affairs administration.
- **Main features:** Eligibility context; referral validity; service rules; claim readiness; document tracking; alerts.
- **Dependencies:** PUL-011, PUL-020 and PUL-022.
- **Acceptance criteria:** Current approved rules are versioned; eligibility is not inferred beyond source evidence; workflows and permissions are tested.

### PUL-026 — Medicare

- **Milestone number:** PUL-026
- **Name:** Medicare workflows
- **Objective:** Support approved Medicare referral and claiming administration.
- **Main features:** Referral and plan tracking; visit counts; eligibility evidence; billing readiness; expiry alerts.
- **Dependencies:** PUL-011, PUL-020, PUL-022 and Medicare policy review.
- **Acceptance criteria:** Visit and validity logic matches approved examples; rules are versioned; Pulse does not make unsupported eligibility decisions.

### PUL-027 — Home Care

- **Milestone number:** PUL-027
- **Name:** Home Care workflows
- **Objective:** Coordinate approved home-care funding and service administration.
- **Main features:** Package context; provider contacts; service approvals; budget visibility; documents; review alerts.
- **Dependencies:** PUL-011, PUL-020, PUL-022 and home-care governance review.
- **Acceptance criteria:** Funding context is source-attributed; access is role-restricted; sample budget and service workflows reconcile.

### PUL-028 — Document generation

- **Milestone number:** PUL-028
- **Name:** Governed document generation
- **Objective:** Produce consistent operational letters and reports from approved templates and data.
- **Main features:** Template library; merge fields; preview; approval; PDF generation; versioning; audit.
- **Dependencies:** PUL-011, PUL-015 and PUL-022–PUL-027.
- **Acceptance criteria:** Generated documents identify source and template version; approval is recorded; unauthorized fields cannot be merged.

### PUL-029 — Platform administration and integrations

- **Milestone number:** PUL-029
- **Name:** Settings, inventory, assets and integration administration
- **Objective:** Centralize governed platform configuration, physical-resource registers and connection operations.
- **Main features:** Settings UI; feature flags; inventory and asset register; maintenance dates; integration status; sync history; credential rotation.
- **Dependencies:** PUL-008, PUL-013, PUL-020 and approved encryption/key management.
- **Acceptance criteria:** Privileged changes are validated and audited; credentials are encrypted and never returned; asset and integration failure states are visible.

### PUL-030 — AI platform and governance

- **Milestone number:** PUL-030
- **Name:** AI safety and platform foundation
- **Objective:** Establish approved, observable and human-controlled AI infrastructure.
- **Main features:** Model gateway; prompt/version registry; redaction; evaluation harness; consent controls; cost and latency monitoring; kill switch.
- **Dependencies:** PUL-008, PUL-011, PUL-018–PUL-019 and formal AI/privacy governance.
- **Acceptance criteria:** No AI capability processes unapproved data; outputs are labelled; evaluations and human review are mandatory; the platform can be disabled safely.

### PUL-031 — AI morning briefing and business alerts

- **Milestone number:** PUL-031
- **Name:** Intelligent morning briefing
- **Objective:** Summarize verified operational priorities and proactively surface business exceptions.
- **Main features:** Morning briefing; business alerts; source citations; freshness; severity; acknowledgement.
- **Dependencies:** PUL-019 and PUL-030.
- **Acceptance criteria:** Every statement links to source evidence; stale or incomplete data is disclosed; users can correct and acknowledge alerts.

### PUL-032 — Attendance and retention prediction

- **Milestone number:** PUL-032
- **Name:** Patient drop-off, DNA and cancellation prediction
- **Objective:** Identify attendance risks for supportive, human-approved intervention.
- **Main features:** Drop-off risk; DNA prediction; cancellation prediction; explanations; thresholds; intervention tracking; fairness monitoring.
- **Dependencies:** PUL-010–PUL-011, PUL-019 and PUL-030.
- **Acceptance criteria:** Models meet approved validation and fairness thresholds; predictions do not automate adverse decisions; outcomes and drift are monitored.

### PUL-033 — Referral prediction and intelligence

- **Milestone number:** PUL-033
- **Name:** Referral prediction and intelligence
- **Objective:** Forecast referral flow and surface actionable referral patterns.
- **Main features:** Volume forecast; conversion risk; source trends; ageing intelligence; explainable alerts; scenario views.
- **Dependencies:** PUL-021–PUL-022 and PUL-030.
- **Acceptance criteria:** Forecast performance is baselined; source attribution is visible; recommendations require human action and are monitored.

### PUL-034 — Revenue forecasting

- **Milestone number:** PUL-034
- **Name:** Revenue forecasting
- **Objective:** Provide explainable financial scenarios from approved operational and Xero data.
- **Main features:** Revenue forecast; cash and capacity scenarios; confidence ranges; variance analysis; assumptions.
- **Dependencies:** PUL-020, PUL-023–PUL-027 and PUL-030.
- **Acceptance criteria:** Forecasts reconcile to historical samples; uncertainty and assumptions are displayed; access remains finance-restricted.

### PUL-035 — Staff workload balancing

- **Milestone number:** PUL-035
- **Name:** AI-assisted workload balancing
- **Objective:** Suggest fair, capacity-aware allocation of operational work.
- **Main features:** Workload signals; capacity forecast; assignment suggestions; constraints; explanation; manager override.
- **Dependencies:** PUL-012–PUL-016, PUL-019 and PUL-030.
- **Acceptance criteria:** Suggestions never assign automatically; constraints and fairness measures are tested; overrides and outcomes are recorded.

### PUL-036 — AI receptionist

- **Milestone number:** PUL-036
- **Name:** AI receptionist
- **Objective:** Assist with approved routine enquiries while escalating safely to staff.
- **Main features:** Approved knowledge answers; intake assistance; scheduling handoff; identity boundaries; escalation; transcript controls.
- **Dependencies:** PUL-009–PUL-011, PUL-017 and PUL-030.
- **Acceptance criteria:** The assistant cannot provide clinical advice; identity and escalation paths are tested; consent, transcript retention and monitoring are approved.

### PUL-037 — Clinical summaries

- **Milestone number:** PUL-037
- **Name:** AI-assisted clinical summaries
- **Objective:** Draft source-grounded summaries for clinician review.
- **Main features:** Structured summaries; source citations; missing-information warnings; clinician edit and approval; version history.
- **Dependencies:** PUL-015 and PUL-030 plus clinical-safety approval.
- **Acceptance criteria:** Nothing is written to the clinical record without clinician approval; citations are complete; hallucination and omission evaluations meet approved thresholds.

### PUL-038 — Letter and report drafting

- **Milestone number:** PUL-038
- **Name:** AI-assisted letter and report drafting
- **Objective:** Draft governed communications from approved templates and evidence.
- **Main features:** Draft generation; template constraints; source citations; tone options; review workflow; document export.
- **Dependencies:** PUL-028, PUL-030 and PUL-037.
- **Acceptance criteria:** Human approval is mandatory; unsupported statements are flagged; final documents retain provenance and approval history.

### PUL-039 — Marketing suggestions

- **Milestone number:** PUL-039
- **Name:** AI-assisted marketing suggestions
- **Objective:** Suggest ethical, consent-aware marketing actions from approved aggregate signals.
- **Main features:** Campaign ideas; content drafts; channel suggestions; audience safeguards; performance feedback; approval.
- **Dependencies:** PUL-021 and PUL-030.
- **Acceptance criteria:** No sensitive targeting or unapproved personal data is used; claims require review; suggestions and outcomes are traceable.

### PUL-040 — Owner intelligence and natural-language questions

- **Milestone number:** PUL-040
- **Name:** Owner dashboard and executive intelligence
- **Objective:** Give owners governed executive reporting and natural-language access to verified business information.
- **Main features:** Owner dashboard; executive reporting; natural-language business questions; cited answers; scenario summaries; access restrictions.
- **Dependencies:** PUL-018–PUL-021 and PUL-030–PUL-039.
- **Acceptance criteria:** Answers are permission-aware and cite source data; financial and patient boundaries are enforced; uncertainty is visible; exports are audited.

## 18. Complete module roadmap

| Module | Primary milestone(s) | Roadmap outcome |
| --- | --- | --- |
| Reception | PUL-009, PUL-036 | Governed reception queue with safe AI assistance and staff escalation. |
| Scheduling | PUL-010, PUL-032 | Source-attributed diary operations and attendance-risk intelligence. |
| Patients | PUL-011 | Minimum-data, role-scoped patient workspace. |
| Practitioners | PUL-012 | Practitioner directory, source mappings, availability and workload context. |
| Staff | PUL-013 | Staff lifecycle, roles, onboarding, offboarding and access review. |
| Clinical Operations | PUL-014 | Caseload and service-delivery exception oversight. |
| Clinical Notes | PUL-015, PUL-037 | Governed note access and clinician-approved AI summaries. |
| Tasks | PUL-016 | Assignable, auditable follow-up and reminder workflow. |
| Internal Communication | PUL-017 | Secure contextual threads, announcements and notifications. |
| Reporting | PUL-018 | Governed operational reports and exports. |
| KPIs | PUL-019 | Defined, owned, tested and drillable performance measures. |
| Finance | PUL-020, PUL-034 | Xero-grounded finance views and explainable forecasting. |
| Marketing | PUL-021, PUL-039 | Consent-aware attribution and reviewed AI suggestions. |
| Referrals | PUL-022, PUL-033 | Persistent referral workflow and explainable intelligence. |
| NDIS | PUL-023 | Versioned plan, budget and claim-readiness workflows. |
| WorkCover | PUL-024 | Claim, certificate, approval and insurer coordination. |
| DVA | PUL-025 | DVA eligibility-evidence and service-administration workflow. |
| Medicare | PUL-026 | Referral validity, visit-count and billing-readiness workflow. |
| Home Care | PUL-027 | Package, provider, budget and service approval coordination. |
| Document Generation | PUL-028, PUL-038 | Versioned templates and human-approved document drafting. |
| AI Assistant | PUL-030–PUL-040 | Governed AI gateway and role-appropriate assisted workflows. |
| Owner Dashboard | PUL-040 | Restricted, cited owner operating view. |
| Executive Reporting | PUL-018, PUL-019, PUL-040 | Governed reports, KPIs and executive narratives. |
| Staff Performance | PUL-013, PUL-019, PUL-035 | Transparent measures and fair, manager-controlled workload support. |
| Inventory and Assets | PUL-029 | Asset register, inventory levels and maintenance alerts. |
| Settings | PUL-029 | Validated, audited administrative configuration. |
| Integrations | PUL-020, PUL-029 | Encrypted credentials, observable sync and governed Cliniko/Xero connections. |

Module boundaries are logical ownership boundaries inside the modular monolith. They do not imply separate deployable services.

## 19. AI capability roadmap

| AI capability | Milestone | Required safeguards and outcome |
| --- | --- | --- |
| Morning briefing | PUL-031 | Cited, freshness-aware summary of verified priorities. |
| Patient drop-off prediction | PUL-032 | Validated risk signal used only for supportive human action. |
| DNA prediction | PUL-032 | Explainable non-attendance risk with fairness and drift monitoring. |
| Cancellation prediction | PUL-032 | Capacity-planning signal with confidence and human review. |
| Referral prediction and intelligence | PUL-033 | Source-grounded volume, conversion and ageing insights. |
| Revenue forecasting | PUL-034 | Restricted forecasts with assumptions and confidence ranges. |
| Staff workload balancing | PUL-035 | Fair, explainable suggestions with manager override; no automatic assignment. |
| AI receptionist | PUL-036 | Approved information only, identity boundaries and immediate staff escalation. |
| Clinical summaries | PUL-037 | Cited drafts requiring clinician review before record use. |
| Letter and report drafting | PUL-038 | Template-constrained drafts with mandatory human approval. |
| Marketing suggestions | PUL-039 | Consent-aware aggregate insights without sensitive targeting. |
| Business alerts | PUL-031 | Explainable severity, provenance, acknowledgement and correction. |
| Natural-language business questions | PUL-040 | Permission-aware, cited answers with visible uncertainty. |

All AI capabilities depend on PUL-030. They must use approved data only, identify AI-generated content, support human correction, record material use, undergo task-specific evaluation and provide a kill switch.

## 20. Approved development workflow

Every milestone follows this sequence:

**ChatGPT architecture → Codex implementation → ZIP → local testing → commit → push → Pull Request → merge → next PUL milestone.**

The stages mean:

1. **ChatGPT architecture:** Confirm scope, constraints, dependencies, acceptance criteria, contracts and risks.
2. **Codex implementation:** Work only on the named feature branch and preserve out-of-scope behaviour.
3. **ZIP:** Export only the files added or changed, with installation instructions, when requested for review or transfer.
4. **Local testing:** The user applies or reviews the files and runs the documented verification locally.
5. **Commit:** Commit the reviewed, verified scope with the approved message.
6. **Push:** Publish the exact commit to its remote feature branch.
7. **Pull Request:** Review the implementation, evidence, risks and limitations against the milestone acceptance criteria.
8. **Merge:** Merge only after approval and required checks.
9. **Next PUL milestone:** Start the next milestone from the updated approved base.

No step implicitly authorizes a later step. In particular, implementation does not authorize commit, push, Pull Request or merge unless the user explicitly requests it.

## 21. Windows development requirements

Windows instructions must:

- use `npm.cmd` instead of `npm`;
- use `npx.cmd` instead of `npx`;
- never instruct the user to change or bypass PowerShell execution policy; and
- use `npm.cmd run dev` for local development.

The standard Windows PowerShell sequence is:

```powershell
Copy-Item .env.example .env
npm.cmd install
docker compose up -d postgres
npm.cmd run db:generate
npm.cmd run db:migrate:deploy
npm.cmd run db:seed
npm.cmd run dev
```

If a future workflow needs an executable normally invoked through `npx`, its Windows form must be documented with `npx.cmd`. macOS and Linux instructions may continue to use `npm` and `npx`.

## 22. Definition of done for future work

A work item is complete only when:

- its scope and acceptance criteria are satisfied;
- existing routes, payloads and frontend behaviour remain compatible unless change was authorized;
- configuration remains centralized;
- secrets and sensitive data are absent from code, logs and test artifacts;
- relevant automated and manual verification has passed;
- database changes include reviewed migrations and recovery guidance;
- operational logging and failure behaviour are documented;
- user and developer documentation is current; and
- assumptions, limitations and residual risks are recorded.

## 23. Governance and decision records

The product owner approves capability scope and priority. Technical decisions that materially alter system boundaries, data ownership, security posture, deployment topology or external contracts should be recorded as architecture decisions and linked from this brief.

This brief should be reviewed when:

- a new external integration is proposed;
- a new category of sensitive data is introduced;
- a role or permission model changes;
- production infrastructure changes;
- a material risk is accepted; or
- a roadmap stage is completed.

## 24. Key risks and controls

| Risk | Current control or required response |
| --- | --- |
| Preview mistaken for a production clinical system | Prominent fictional-data notice and explicit release gates |
| Excessive staff access | Server-side RBAC foundation; complete and test fine-grained policy |
| Secrets exposed in code or logs | Central configuration, redaction and credential scanning |
| Credential placeholder treated as encryption | Explicit limitation; implement approved encryption before storage |
| Source-system divergence | Keep source authority explicit; design reconciliation before sync |
| Integration outage affects service | Dependency-aware readiness, bounded retries and degraded-mode design |
| Sensitive data enters development artifacts | Synthetic data policy and review/scanning controls |
| Database migration causes loss | Reviewed migrations, backups and tested recovery procedures |
| Dashboard metrics are misunderstood | Define provenance, calculation, freshness and owner for each metric |
| Documentation drifts from implementation | Update this brief through normal review with material decisions |

## 25. Assumptions and open decisions

Current assumptions:

- Cliniko will remain the clinical/practice-management source of truth.
- Xero will remain the accounting source of truth.
- PostgreSQL and Prisma remain the persistence foundation.
- The modular monolith remains appropriate for the foreseeable delivery stages.
- Real patient information remains prohibited until formal approval.

Open decisions to resolve before production:

- approved hosting region and service providers;
- detailed data classification and retention schedule;
- production key-management solution;
- identity recovery and stronger-authentication requirements;
- complete role-to-permission matrix;
- audit retention and review ownership;
- backup objectives and recovery responsibilities;
- integration field contracts and synchronization frequency;
- metric definitions, provenance and freshness expectations; and
- production support, alerting and incident ownership.

## 26. Success measures

Measures should be baselined before rollout and should not encourage unsafe shortcuts. Candidate measures include:

- time to identify and assign high-priority operational work;
- referral workflow completeness and ageing;
- reduction in manual reconciliation;
- data freshness and synchronization success;
- service availability and readiness;
- mean time to detect and resolve operational failures;
- access-review completion;
- audit-event coverage for defined material actions; and
- user-reported usefulness and usability.

Each production metric requires a documented definition, source, owner, refresh interval and acceptable threshold.

## 27. Glossary

- **Pulse**: Doveston Health's clinic operations and intelligence platform.
- **System of record**: The authoritative system responsible for a category of data.
- **Cliniko**: Anticipated clinical and practice-management source system.
- **Xero**: Anticipated accounting source system.
- **RBAC**: Role-based access control.
- **Readiness**: Whether the service and required dependencies can serve traffic.
- **Liveness**: Whether the service process is operating.
- **Synthetic data**: Artificial information that does not represent a real patient or person.
- **Modular monolith**: One deployable application divided into explicit internal modules.

## 28. Repository references

- [README](../README.md) — setup, operation and developer workflows.
- `prisma/schema.prisma` — current persistence model.
- `.env.example` — supported local configuration names and safe placeholders.
- `docker-compose.yml` — local PostgreSQL service.

When this brief and executable behaviour differ, treat the implementation as the current technical fact and raise a documentation correction; do not silently infer product approval from implementation.
