# NCAP - National Cybersecurity Awareness Platform

[![Frontend checks](https://github.com/rizad-mohamed/NCAP/actions/workflows/ci.yml/badge.svg)](https://github.com/rizad-mohamed/NCAP/actions/workflows/ci.yml)

NCAP is an accessible cybersecurity awareness, learning, and assessment platform designed for Sri Lanka. It combines public awareness resources, structured lessons, learner progress, and administration tools in a responsive application.

## Current status - September 28, 2026

Authentication, Awareness, and Learning use Supabase-backed services. Awareness and Learning are deployed and verified on the configured **staging** project. Public HTTPS frontend hosting, production authentication origins, backup/restore verification, and operational alerting remain release gates.

| Area                         | Current implementation                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication               | Supabase Auth, server-managed HTTP-only session cookies, protected profiles, learner/Super Admin roles, registration, verification, login, recovery, and password management                  |
| Awareness                    | Persistent catalogue of 60 published resources across seven types; search/filtering, administration, publication, private managed media, and scheduled cleanup                                |
| Learning                     | Persistent catalogue of 11 topics, five modules, and 18 lessons; structured authoring, publication, progress, bookmarks, video resume, dashboard statistics, audit history, and managed media |
| Assessments and certificates | Demonstration quiz/question data, attempts, badges, achievements, and certificate previews; authoritative assessment and certificate services remain future work                              |
| Other administration         | User-management, announcements, and broader reporting interfaces retain demonstration behavior; they are not full Supabase Auth administration or production analytics                        |

The latest staging Learning verification recorded 163 passing unit/integration tests, two opt-in hosted Awareness tests skipped, 50 passing focused Learning tests, and nine passing live Chromium scenarios across the full run and corrected image-only rerun. See [Learning verification](supabase/LEARNING_VERIFICATION.md) and [Awareness readiness](supabase/AWARENESS_READINESS.md) for the evidence, scope, and remaining gates. These records do not certify a public production deployment.

## Features

- Awareness articles, cyber tips, news/updates, posters, infographics, videos, and best practices
- Searchable Learning catalogue with structured lessons, knowledge checks, and transcripts
- Account-scoped completion, bookmarks, activity, and video resume that persist across sessions/devices
- Super Admin topic/module/lesson and Awareness authoring, ordering, publication, and media management
- Server and database authorization, optimistic version checks, and Learning audit records
- Responsive layouts, keyboard navigation, reduced-motion support, and an English interface with a localization foundation
- Timed demonstration quizzes backed by 48 seeded questions

## Technology and architecture

- React 19, TypeScript, TanStack Start, Router, and Query
- Tailwind CSS 4, Radix UI primitives, and Lucide icons
- TanStack server functions, Supabase Auth, PostgreSQL RPCs, Row Level Security, and private Storage
- Supabase Edge Functions and scheduled media cleanup
- Zod, ESLint, Prettier, Vitest, Testing Library, PGlite, Playwright, and axe-core
- Nitro Cloudflare Module build target

```text
Browser: React UI + TanStack Router/Query
  -> TanStack Start server functions
     -> Supabase Auth + protected profiles
     -> Awareness repository -> PostgreSQL + private Storage
     -> Learning repository  -> PostgreSQL + private Storage
  -> Local demo repository for remaining demonstration domains

Scheduled maintenance -> protected Edge Functions -> retired/expired media cleanup
```

Awareness and Learning records are excluded from persisted demo state. Their backend adapters are authoritative, with caches scoped by account and administrator/public access. Other domains still use browser-local demonstration storage; clearing browser data can remove those demo records.

## Local setup

Use Node.js 22 or newer and npm. A configured Supabase project is required for working authentication, Awareness, and Learning.

```sh
git clone https://github.com/rizad-mohamed/NCAP.git
cd NCAP
npm ci
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` for the last step. The application files are at the Git repository root.

Configure the server runtime in `.env.local`:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
APP_URL=http://localhost:8080
```

Follow [authentication setup](supabase/README.md), [Awareness operations](supabase/AWARENESS.md), and [Learning operations](supabase/LEARNING.md) to apply migrations in order, provision the first Super Admin, seed content, and configure maintenance. An empty Supabase project does not contain the required schema or catalogue. Do not rerun initial schema SQL against an already migrated project.

```sh
npm run dev
```

Development runs at `http://localhost:8080`.

## Environment files and credentials

- `.env.example` is the tracked, placeholder-only runtime template.
- `.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, and local operator/test files are ignored, except `.env.example`.
- Keep service-role keys, management tokens, database passwords, cleanup tokens, and disposable test credentials in ignored operator files or the relevant service's secret configuration.
- The application runtime uses the publishable key with the caller's session and RLS. It does not require a service-role key.
- Never put privileged credentials in `VITE_` variables, browser bundles, tracked files, command arguments, or logs. Operator scripts consume process environment; follow the operations guides for loading it safely.
- CI's default checks use placeholder runtime settings and require no staging credentials. Live authenticated verification is a separate opt-in operation against disposable staging accounts.

## Commands

| Command                                                  | Purpose                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                                            | Start development on port 8080                                    |
| `npm run build`                                          | Create the production Nitro/Cloudflare build in `.output`         |
| `npm run preview`                                        | Preview a production build locally                                |
| `npm run typecheck`                                      | Validate TypeScript                                               |
| `npm run lint`                                           | Run ESLint and configured formatting rules                        |
| `npm test`                                               | Run Vitest unit and integration tests                             |
| `npm run test:watch`                                     | Run Vitest in watch mode                                          |
| `npm run security:scan`                                  | Scan tracked and unignored source files for known secret patterns |
| `npm run check`                                          | Run typecheck, lint, Vitest, secret scan, and production build    |
| `npm run test:e2e`                                       | Build and run Playwright browser tests                            |
| `npm run format`                                         | Format supported repository files                                 |
| `npm run awareness:seed` / `npm run learning:seed`       | Run documented operator catalogue imports                         |
| `npm run awareness:cleanup` / `npm run learning:cleanup` | Run documented operator media maintenance                         |

Review the operations guides before running seed or cleanup commands against a remote project.

## Verification and CI

The **Frontend checks** workflow runs on pushes and pull requests: locked dependency installation, `npm run check`, browser installation, and Playwright across Chromium, Firefox, WebKit, and mobile browser profiles. Vitest uses two workers for predictable resource use.

```sh
npm run check
npx playwright install
npm run test:e2e
```

PGlite tests exercise migrations, RLS, ownership, transactional mutations, and integrity using a local PostgreSQL harness. Browser tests run against the built Worker. Scenarios requiring a seeded hosted backend or authenticated users skip unless their documented opt-in settings are supplied; a green default CI run does not imply that live staging scenarios ran.

Use the disposable-account procedures and environment flags in [the Supabase guide](supabase/README.md), [Awareness operations](supabase/AWARENESS.md), and [Learning operations](supabase/LEARNING.md) for live verification. Authoring scenarios mutate catalogue data and must use staging fixtures.

## Learning media and authoring

The lesson editor supports typed headings, paragraphs, lists, callouts, examples, knowledge checks, reordering, deletion, and undo/redo. Content renders as escaped text.

Lessons support HTTPS YouTube/Vimeo links, direct HTTPS MP4/WebM URLs, and managed uploads. Learning images are limited to 5 MiB and 4096 by 4096 pixels; videos to **50 MiB and four hours**, matching the deployed project limit. Published video lessons require transcripts. Native playback supports speed controls, fullscreen, persisted resume, and completion on ending.

Private Storage, authorized signed URLs, server-side byte validation, and protected scheduled cleanup govern managed media. Previously issued URLs may remain usable until expiry, and CDN caching can outlast origin deletion. See the module operations guides for lifecycle and recovery details.

## Repository structure

```text
.github/workflows/       Frontend CI
 design-system/         Design reference and guidance
 e2e/                   Playwright scenarios and fixtures
 public/                Static assets and security headers
 scripts/               Secret scan, import, and maintenance tools
 src/
   auth/                Authentication contracts and helpers
   components/          Shared UI
   data/                Seed and demonstration data
   domain/              Validation and domain rules
   features/            Public, learner, and admin features
   routes/              Typed file-based routes
   server/              Server-only authentication and backend services
   services/            Repository adapters and query hooks
   state/               Application state providers
 supabase/
   functions/           Media cleanup Edge Functions
   migrations/          Versioned schema, grants, and RLS
   README.md            Authentication setup
```

## Deployment and remaining work

The backend is deployed to staging; a public HTTPS frontend has not been deployed. The configured local application origin and Supabase Auth site URL are not yet aligned for production.

Before public release:

1. Select and deploy the HTTPS frontend origin with server runtime configuration.
2. Align `APP_URL`, Supabase Site URL, and allowed authentication redirects.
3. Repeat public, learner, and administrator smoke tests on that hosted origin.
4. Establish database **and Storage object** backups, verify a staging restore, and assign an operations owner.
5. Verify cleanup-failure alerts and operational monitoring.

The ignored pre-deployment snapshot is not a full database backup. The latest deployment report recorded no listed database backups and point-in-time recovery disabled. Prefer forward corrections to destructive schema rollback; preserve data and verify recovery before any reversal.

Further product work includes authoritative assessment attempts/certificates, user administration APIs, broader analytics, localization, and continued accessibility verification.

## Documentation

- [Supabase authentication setup](supabase/README.md)
- [Awareness operations](supabase/AWARENESS.md), [verification](supabase/AWARENESS_VERIFICATION.md), and [readiness](supabase/AWARENESS_READINESS.md)
- [Learning operations](supabase/LEARNING.md) and [deployment verification](supabase/LEARNING_VERIFICATION.md)
- [Backend reference architecture](supabase/AWARENESS_REFERENCE_ARCHITECTURE.md)
- [Project intelligence and original gap audit](PROJECT_INTELLIGENCE.md) - read alongside the newer module verification reports
- [Implementation status](IMPLEMENTATION_STATUS.md)
- [Design-system guidance](design-system/ncap-sri-lanka/MASTER.md)

NCAP is not an official incident-reporting channel or a substitute for approved government cybersecurity policy.
