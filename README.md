# NCAP — National Cybersecurity Awareness Platform

[![Frontend checks](https://github.com/rizad-mohamed/NCAP/actions/workflows/ci.yml/badge.svg)](https://github.com/rizad-mohamed/NCAP/actions/workflows/ci.yml)

NCAP is an accessible cybersecurity awareness, learning, and assessment platform designed for Sri Lanka. It brings together public awareness resources, structured lessons, quizzes, learner progress, certificates, and administration tools in one responsive application.

> **Foundation Release:** Supabase provides real authentication, secure server-managed sessions, user profiles, and authoritative roles. Learning, editorial, reporting, and certificate records currently use browser-local demonstration repositories and are not yet a shared production backend.

## What is included

### Public experience

- Cybersecurity awareness articles, tips, news, posters, infographics, videos, and best practices
- Searchable and filterable awareness library
- Responsive, keyboard-accessible layouts with reduced-motion support
- English interface with an initial localization foundation

### Learner experience

- Five-module learning catalogue with 18 structured lessons
- Rich lesson content, knowledge checks, bookmarks, and video support
- Timed quizzes backed by 48 seeded questions
- Local progress, badges, achievements, and certificate previews
- Account registration, email verification, login, recovery, and password management

### Super Admin experience

- Dashboard and programme reporting views
- Module, topic, lesson, and question management
- Awareness content management across seven content types
- User, certificate, announcement, and profile interfaces
- Role-protected administration routes

## Technology stack

- **Application:** React 19, TypeScript, TanStack Start, TanStack Router, TanStack Query
- **Styling:** Tailwind CSS 4, Radix UI primitives, Lucide icons
- **Backend foundation:** TanStack server functions, Supabase Auth, PostgreSQL, Row Level Security
- **Local data layer:** typed repository interfaces, schema-validated `localStorage`, IndexedDB media
- **Validation:** Zod, TypeScript, ESLint, Prettier
- **Testing:** Vitest, Testing Library, Playwright, axe-core
- **Deployment target:** Nitro Cloudflare Module / Cloudflare Workers

## Architecture

```text
Browser
├── React UI and TanStack Router
├── TanStack Start server functions
│   └── Supabase Auth + public.profiles + RLS
└── NcapRepository
    └── LocalDemoRepository
        ├── versioned localStorage data
        └── IndexedDB media blobs
```

Authentication and authorization are server-backed. Other product domains remain intentionally isolated behind repository boundaries so they can be replaced incrementally with production APIs.

For the complete implementation inventory, architecture assessment, requirements, and gap analysis, see [PROJECT_INTELLIGENCE.md](PROJECT_INTELLIGENCE.md).

## Prerequisites

- Node.js 22 or newer
- npm
- A Supabase project for authentication
- Supabase CLI, SQL Editor access, or another approved migration workflow

## Local setup

1. Clone the repository and enter the application directory:

   ```sh
   git clone https://github.com/rizad-mohamed/NCAP.git
   cd NCAP/ncap_v1.0
   ```

2. Install the locked dependencies:

   ```sh
   npm ci
   ```

3. Create the local environment file:

   ```sh
   cp .env.example .env.local
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Configure `.env.local`:

   ```dotenv
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   APP_URL=http://localhost:8080
   ```

   Never add a Supabase service-role key to this application or commit `.env.local`.

5. Apply the migration in `supabase/migrations` and configure authentication URLs. Follow [the Supabase setup guide](supabase/README.md) for the complete procedure, including safe provisioning of the first Super Admin.

6. Start development:

   ```sh
   npm run dev
   ```

The application is served at `http://localhost:8080` by default.

## Available commands

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Start the development server on port 8080                 |
| `npm run build`         | Create the production Cloudflare/Nitro build              |
| `npm run preview`       | Preview a production build locally                        |
| `npm run typecheck`     | Run TypeScript validation                                 |
| `npm run lint`          | Run ESLint and formatting checks                          |
| `npm run test`          | Run the Vitest suite once                                 |
| `npm run test:watch`    | Run Vitest in watch mode                                  |
| `npm run test:e2e`      | Build and run Playwright browser tests                    |
| `npm run security:scan` | Check source and output for security regressions          |
| `npm run check`         | Run typecheck, lint, unit tests, security scan, and build |
| `npm run format`        | Format supported repository files                         |

Install browser binaries once before running end-to-end tests:

```sh
npx playwright install
```

## Authentication and authorization

NCAP supports:

- learner registration with profile provisioning
- email verification
- email/password login
- HTTP-only server-managed authentication cookies
- automatic session refresh
- logout
- password recovery and reset
- authenticated password changes
- learner and `super_admin` roles
- server-side route guards
- profile ownership policies enforced with PostgreSQL RLS

The browser never receives a service-role credential. Administrative access is determined from the protected `profiles.role` database field, not from browser state or user-editable metadata.

The migration must be applied before authentication can work end to end. Do not create shared credentials or commit passwords. Provision administrators through the documented Supabase process and rotate any bootstrap credential immediately.

## Data and media behavior

The current Foundation Release persists non-authentication data under a versioned browser-local key. Uploaded lesson images and videos use IndexedDB. This makes the complete product experience demonstrable without implying that the data is shared, durable, or production-ready.

Important consequences:

- learning progress does not synchronize across browsers or devices
- local demonstration state may be shared by different accounts using the same browser profile
- admin user records are demonstrations and do not modify Supabase Auth users
- reports combine seeded and locally computed data
- uploaded media disappears if the browser's site data is cleared
- certificates are demonstrations and are not cryptographically verifiable

Production work should replace these repositories with authorized APIs, database tables, object storage, audit logging, and authoritative reporting.

## Lesson authoring and video support

The admin lesson editor supports headings, paragraphs, lists, callouts, examples, knowledge checks, reordering, deletion, and undo/redo. Content is stored as typed data and rendered as escaped text rather than executable HTML.

Lessons may use:

- HTTPS YouTube or Vimeo links
- direct HTTPS MP4 or WebM URLs
- local MP4 or WebM files up to 100 MiB and four hours

Published video lessons require a transcript. Native video supports playback speed, fullscreen controls, local resume state, and completion on playback ending. Provider-hosted playback depends on the provider's availability and embedding policy.

## Repository structure

```text
.
├── .github/workflows/       CI validation
├── design-system/           design-system reference and guidance
├── e2e/                     Playwright browser tests
├── public/                  static assets and security headers
├── scripts/                 security and maintenance scripts
├── src/
│   ├── auth/                auth contracts and shared helpers
│   ├── components/          shared UI components
│   ├── data/                seed and demonstration data
│   ├── domain/              domain rules and validation
│   ├── features/            public, learner, and admin features
│   ├── routes/              typed file-based routes
│   ├── server/              server-only Supabase integration
│   ├── services/            repository interfaces and adapters
│   └── state/               application state providers
├── supabase/
│   ├── migrations/          database schema, triggers, grants, and RLS
│   └── README.md            Supabase deployment instructions
├── IMPLEMENTATION_STATUS.md validation history and delivery notes
└── PROJECT_INTELLIGENCE.md  authoritative architecture and gap audit
```

## Quality and security

The CI workflow runs the full non-browser validation gate and the Playwright browser suite on pushes and pull requests. Before opening a pull request, run:

```sh
npm run check
npm run test:e2e
```

Security-sensitive changes should preserve these boundaries:

- keep Supabase operations and environment access in server-only modules
- enforce privileged access on the server and in database policies
- treat client-side route checks as user experience, not authorization
- never commit secrets, real passwords, generated environment files, or service-role keys
- validate all data again at future production API boundaries
- preserve accessible keyboard, focus, contrast, and reduced-motion behavior

## Deployment

`npm run build` produces a Nitro Cloudflare Module build in `.output`. A production deployment must provide the three environment variables listed above, apply database migrations separately, and configure Supabase Site URL and redirect URLs for the deployed origin.

Before promoting a release:

1. Run the complete validation suite.
2. Apply and verify database migrations in the target environment.
3. Confirm Supabase authentication URLs and email delivery.
4. Test learner and Super Admin accounts through real browser flows.
5. Confirm security headers and server-side route protection.
6. Run a post-deployment smoke test without exposing credentials in logs.

## Project documentation

- [Project intelligence, PRD, architecture, and gap audit](PROJECT_INTELLIGENCE.md)
- [Supabase authentication setup](supabase/README.md)
- [Implementation status](IMPLEMENTATION_STATUS.md)
- [Design-system guidance](design-system/ncap-sri-lanka/MASTER.md)

## Current roadmap priorities

1. Apply and verify the Supabase migration in each deployment environment.
2. Implement production content, media, progress, quiz-attempt, and certificate storage.
3. Connect user administration to Supabase profiles through privileged server APIs.
4. Add authoritative analytics, audit logs, rate limiting, and operational monitoring.
5. Expand localization and complete production accessibility verification.

NCAP is not an official incident-reporting channel or a substitute for approved government cybersecurity policy.
