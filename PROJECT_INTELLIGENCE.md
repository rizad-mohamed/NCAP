# NCAP Project Intelligence, PRD, Architecture, and Gap Audit

**Audit snapshot:** 2026-09-19  
**Repository state reviewed:** `main` at `7e08fd4`, 12 local commits ahead of `origin/main`  
**Primary evidence:** application source, routes, state, repository adapters, Supabase migration, tests, build/deployment configuration, seed data, and existing documentation  
**Status legend:** **Implemented**, **Partial**, **Frontend Only**, **Backend Only**, **Mocked**, **Hardcoded**, **Placeholder**, **Missing**, **Unverified**

This is a point-in-time, code-based handoff document. “Implemented” means the inspected code supports the claim. It does not imply that an external service has been configured or that a production operation has been completed. In particular, the Supabase migration exists in source control but a read-only check against the configured project returned HTTP 404 for `public.profiles`; the live database installation is therefore **not complete at this snapshot**.

## 1. Executive Project Summary

NCAP is the **National Cybersecurity Awareness Platform**, a Sri Lanka-oriented public-service learning application. It presents plain-language cybersecurity awareness resources, structured learning modules, lessons, timed quizzes, learner progress, certificates, and a broad administration workspace.

The application currently has two very different maturity levels:

- The **frontend is a mature Foundation Release demonstration**. Public, learner, and administration experiences are broad, responsive, accessibility-conscious, and behaviorally rich. Content CRUD, learner progress, quiz execution, reporting, certificate workflows, and media handling work inside one browser.
- The **backend is narrowly focused on authentication and profile authorization**. TanStack Start server functions integrate Supabase Auth, server-managed cookies, the `profiles` table, and authoritative `learner`/`super_admin` roles. No production backend exists for learning content, progress, quizzes, awareness content, users, reports, announcements, media, or certificates.

The primary architecture is:

```text
Browser / React UI
  ├─ TanStack Router + Start SSR
  ├─ Supabase auth calls through TanStack server functions
  │    └─ Supabase Auth + public.profiles + RLS
  └─ Domain features through NcapRepository
       └─ LocalDemoRepository
            ├─ React state + versioned localStorage JSON
            └─ IndexedDB media blobs
```

The product is therefore best classified as **production-oriented frontend + real authentication foundation + browser-local domain prototype**. It is not yet a multi-user learning management backend or a production content-management system.

## 2. Product and Domain Understanding

### Confirmed business problem and purpose

The repository confirms a public cybersecurity education product intended to help people:

- understand common online risks;
- learn safer habits through structured lessons;
- test applied knowledge through quizzes;
- track progress, bookmarks, badges, and certificates;
- access awareness articles, tips, updates, practices, posters, infographics, and videos;
- allow administrators to curate content and inspect demonstration learning outcomes.

Evidence includes `src/data/learning.ts`, `src/data/quizzes.ts`, `src/data/awareness.ts`, `src/features/learning/LearningPages.tsx`, and the administration feature files.

### Confirmed user/persona types

| Persona                      | Confirmed behavior                                                                                                                | Current authority source                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Anonymous visitor            | Browses home, awareness, learning catalogue, module descriptions, quiz catalogue/instructions, accessibility, and privacy content | No account                                                               |
| Learner                      | Uses dashboard, protected lesson workspace, bookmarks, quiz runner/results, profile, and certificates                             | Supabase profile role `learner`                                          |
| Super Admin                  | Opens all `/admin/*` routes                                                                                                       | Supabase profile role `super_admin`, mapped to presentation role `admin` |
| Demonstration learner record | Appears in the admin Users screen with status, progress, roles, scores, and certificates                                          | Static/local `DemoUser`; not a Supabase identity                         |

There is no confirmed instructor, reviewer, editor, organisation administrator, tenant administrator, or support role. The only authoritative application roles are `learner` and `super_admin` (`src/auth/types.ts`, Supabase migration).

### Confirmed core entities and relationships

- `LearningModule` has a topic, difficulty, objectives, display order, publication status, optional image, and `quizId`.
- `Lesson` belongs to a module through `moduleId`; contains ordered typed content blocks and an optional external/uploaded video.
- `Quiz` belongs to a module, but quizzes are static code data rather than repository-managed records.
- `QuizQuestion` belongs to a module, and the quiz runner selects published questions by module.
- `QuizAttempt` references both quiz and module and records score, timing, and topic breakdown.
- `TopicRecord` is a managed taxonomy record, while most domain records store the human-readable topic name rather than a topic ID.
- Awareness entities include `Article`, `CyberTip`, `NewsUpdate`, `BestPractice`, `Poster`, `Infographic`, and `VideoResource`.
- `Announcement` has an audience and active date range.
- `CertificateRecord` references a demonstration user and module; learners also have a separate lightweight `issuedCertificates` collection.
- `MediaAsset`/`VideoAsset` metadata points to an IndexedDB `storageKey`.
- Supabase `profiles.id` has a one-to-one foreign key to `auth.users.id`.

### Confirmed workflows

1. A user registers through a server function; Supabase creates the identity and the database trigger creates a default learner profile.
2. The user verifies email through Supabase PKCE callback handling, signs in, and receives HTTP-only session cookies.
3. A learner views published modules/lessons, records local completion/bookmarks, completes timed quizzes, and may issue a demo certificate when locally eligible.
4. A Super Admin manages browser-local content, taxonomy, announcements, user records, reports, and certificate records.
5. Public pages immediately consume published records from the same browser-local repository, demonstrating a content publication lifecycle on one device.

### Domain inference, clearly separated

The following are reasonable inferences from the UI and data, not implemented production behavior:

- NCAP is intended to become a national or public-sector learning platform rather than a single-organisation LMS.
- Administrators will eventually need durable authoring, review/publishing, learner administration, reporting, and certificate governance.
- Sinhala and Tamil are intended interface languages, but most learning content will require a separate localization/content translation workflow.
- Media will eventually need managed object storage, processing, and authenticated delivery.
- The current certificate policy (100% module lessons and best quiz score of at least 80%) is a demo assumption, not verified national policy.

## 3. Technology Stack

| Area                 | Confirmed technology                                   | Role in the system                                                 |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Language             | TypeScript 5.8, strict mode                            | Application and test implementation                                |
| UI runtime           | React 19                                               | Component rendering and contexts                                   |
| Full-stack framework | TanStack Start 1.168                                   | SSR, server functions, request middleware                          |
| Routing              | TanStack Router 1.170, generated file route tree       | Typed routes, route context, guards, metadata                      |
| Server state         | TanStack Query 5.101                                   | Repository list/read/mutation hooks and cache invalidation         |
| Build                | Vite 8.1 + Rolldown override                           | Client and SSR builds                                              |
| Server/deployment    | Nitro 3 beta, Cloudflare module preset, Wrangler 4.135 | Cloudflare Worker output and local production-worker tests         |
| Authentication       | Supabase JS 2.116 + `@supabase/ssr` 0.12               | Email/password auth, PKCE, cookie session refresh                  |
| Database             | Supabase PostgreSQL                                    | Currently only managed auth schema plus proposed `public.profiles` |
| Validation           | Zod 3.24                                               | Auth inputs, domain forms, persisted-state recovery                |
| Styling              | Tailwind CSS 4, custom CSS tokens                      | Responsive design system and utility styling                       |
| UI primitives        | Radix UI/shadcn-style local wrappers                   | Dialogs, menus, tooltips, controls                                 |
| Icons/charts         | Lucide React, Recharts                                 | Consistent icons and admin charts                                  |
| Notifications        | Sonner                                                 | User feedback/toasts                                               |
| Fonts                | Self-hosted Atkinson Hyperlegible                      | Accessibility-oriented typography                                  |
| Unit/component tests | Vitest 4, Testing Library, jsdom                       | Domain, adapters, media, auth contracts, editor behavior           |
| Browser tests        | Playwright 1.62, axe-core                              | Cross-browser workflows, responsive/a11y checks                    |

Architecture-relevant dependency observations:

- `@hookform/resolvers` is not referenced. `react-hook-form`, `react-day-picker`, `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, and `react-resizable-panels` currently appear only in generic `src/components/ui/*` wrappers and not in product feature code. They look like scaffold/template capacity rather than active feature dependencies.
- Feature forms primarily use controlled React state and Zod/manual validation, not React Hook Form.
- Nitro is a pinned beta build, which increases upgrade and operational compatibility risk.

## 4. Repository and Architecture Overview

| Path                       | Responsibility                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/routes/`              | Typed file routes, metadata, server handlers, and route guards                                      |
| `src/features/public/`     | Home, awareness resources, articles, informational pages                                            |
| `src/features/learning/`   | Catalogue, modules, lessons, dashboard, quiz, bookmarks, certificates, profile                      |
| `src/features/admin/`      | Dashboard, users, content, awareness, modules/topics, reports, certificates, announcements, profile |
| `src/auth/`                | Auth server functions, context, redirect validation, route guards, auth tests                       |
| `src/server/auth/`         | Validated server environment and server-only Supabase client                                        |
| `src/state/ncap-store.tsx` | Browser demo state, local persistence, learner calculations/actions                                 |
| `src/services/`            | Repository contracts, local adapter, Query hooks, IndexedDB media                                   |
| `src/domain/`              | Validation schemas and reusable business rules                                                      |
| `src/data/`                | Static seed catalogue, question bank, awareness data, demo users/analytics                          |
| `src/components/`          | Layout, shared product components, authoring/video components, UI primitives                        |
| `supabase/`                | Profile/RBAC migration and deployment instructions                                                  |
| `e2e/`                     | Browser journeys and cross-browser accessibility/responsive tests                                   |
| `public/`                  | Static images, posters, crawler policy, fallback security headers                                   |
| `design-system/`           | Design-system source guidance                                                                       |

### Actual request/data flow

```text
Request → Cloudflare/Nitro server entry
        → security headers + SSR error normalization
        → TanStack Start root beforeLoad
        → getAuthState server function
        → Supabase getUser + public.profiles query
        → route authorization
        → React providers
             ├─ AuthProvider (authoritative identity)
             ├─ NcapProvider (browser demo domain state)
             └─ NcapRepositoryProvider (local repository adapter)
        → route/page component
```

The repository contract is intentionally injectable and could support an HTTP adapter, but only `createLocalDemoRepository` exists. There are no domain controllers, API handlers, ORM models, queues, or backend services beyond auth.

## 5. Frontend Architecture

### Routing and layouts

TanStack Router generates `src/routeTree.gen.ts` from 45 route files. `src/routes/__root.tsx` performs auth-state loading and provides Query, i18n, auth, demo state, repository, tooltip, and toast providers. `AppShell` selects public, learner, or admin navigation based on the authenticated session. `RouteShell` provides a second presentation-level role check and access-denied UI.

The `/admin` parent route has an authoritative `requireSuperAdmin` `beforeLoad`, so all admin descendants inherit server-aware authorization. Major learner-private routes use `requireLearner`, except `/learn/lessons/$lessonId`, which currently relies only on `RouteShell requiredRole="learner"`. That hides the page UI but is architecturally inconsistent with the other learner routes.

### State and data fetching

- `NcapProvider` initializes seed data, restores `ncap.demo.v2`, independently validates persisted sections, and rewrites state to localStorage.
- Auth identity fields are deliberately cleared before local persistence and reconstructed from `AuthUser`.
- `NcapRepositoryProvider` adapts the store to the `NcapRepository` interface.
- TanStack Query hooks consume repository snapshots and support a future asynchronous adapter.
- Most older feature code still uses the broad, deprecated `useNcap()` context directly; repository adoption is partial.
- Media blobs use IndexedDB (`ncap-demo-media`), while metadata remains in localStorage state.

### Forms and validation

Auth inputs and some profile/content rules use Zod. Other complex admin forms use controlled state and explicit validation branches. Lesson blocks use a typed discriminated union and schema; rendered content is structured text rather than arbitrary HTML. Images and video receive client-side MIME, extension, size, dimension/duration, URL, and transcript checks.

### Error/loading/caching behavior

- Root pending, not-found, and recoverable error screens exist.
- Server errors are normalized to a generic HTML error page while detailed errors go to console logs.
- Repository errors have typed categories and user-safe normalization.
- Query hooks expose loading/error states, though local snapshots usually resolve immediately.
- Auth pages provide busy and inline error states, but server-function network exceptions are not consistently wrapped in page-level `try/finally` blocks.

### Accessibility and responsive design

Evidence includes semantic landmarks, a skip link, visible focus rings, minimum control sizes, screen-reader labels, reduced-motion CSS, responsive navigation/tables, transcript requirements, alt-text requirements, and Playwright/axe checks. This is strong evidence of accessibility-conscious implementation, not certification of WCAG 2.2 AA compliance. Physical-device testing, assistive-technology audits, and complete 400% zoom testing remain unverified.

### Localization

The `I18nProvider` supports English, Sinhala, and Tamil for a limited navigation dictionary and updates `document.documentElement.lang`. Most page and educational content is English and explicitly labelled that way. This is **Partial**, not full multilingual support.

## 6. Complete Screen and Route Inventory

| Route(s)                                                   | Screen/purpose                                                                              | Audience and guard                                           | Data source                                                                | Status                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/`                                                        | Landing page, featured learning, topic/resource highlights, demo impact indicators          | Public                                                       | Local repository/seeds                                                     | **Implemented / Mocked data**                         |
| `/awareness`                                               | Awareness hub with category cards and published highlights                                  | Public                                                       | Local repository                                                           | **Implemented / Mocked**                              |
| `/awareness/articles`                                      | Search/filter/sort article listing                                                          | Public                                                       | Local articles                                                             | **Implemented / Mocked**                              |
| `/awareness/articles/$slug`                                | Published article detail                                                                    | Public                                                       | Local articles                                                             | **Implemented / Mocked**                              |
| `/awareness/$kind`                                         | Tips, news, best practices, posters, infographics, or videos; filtering, previews/downloads | Public                                                       | Local repository + IndexedDB media                                         | **Implemented / Mocked**                              |
| `/learn`                                                   | Search/filter learning catalogue and bookmarks                                              | Public catalogue; learner actions remain local               | Local modules/lessons                                                      | **Implemented / Mocked**                              |
| `/learn/search`                                            | Cross-lesson/module search with topic filter                                                | Public                                                       | Local state                                                                | **Implemented / Mocked**                              |
| `/learn/modules/$moduleId`                                 | Module overview, objectives, progress, lesson list, quiz link                               | Public                                                       | Local modules/lessons/progress                                             | **Implemented / Mocked**                              |
| `/learn/lessons/$lessonId`                                 | Lesson blocks, knowledge checks, optional video/transcript, bookmark/completion             | `RouteShell` learner UI guard only; lacks route `beforeLoad` | Local state + IndexedDB media                                              | **Partial guard / Mocked persistence**                |
| `/quizzes`                                                 | Quiz catalogue, best local scores, question availability                                    | Public                                                       | Static quizzes + local questions/attempts                                  | **Implemented / Mocked**                              |
| `/quizzes/$quizId`                                         | Instructions, timing and thresholds                                                         | Public                                                       | Static quiz config/local question count                                    | **Implemented / Mocked**                              |
| `/quizzes/$quizId/run`                                     | Randomized timed quiz, immediate feedback, resumable draft, submission                      | `requireLearner`                                             | Local question bank/localStorage                                           | **Implemented / Mocked**                              |
| `/quizzes/$quizId/results`                                 | Latest score, pass state, topic breakdown, certificate readiness                            | `requireLearner`                                             | Local attempts/progress                                                    | **Implemented / Mocked**                              |
| `/dashboard`                                               | Learner summary, next lesson, statistics, announcements, activity, recommendations          | `requireLearner`                                             | Browser-local state                                                        | **Implemented / Mocked**                              |
| `/bookmarks`                                               | Search/filter/remove bookmarked lessons                                                     | `requireLearner`                                             | Browser-local state                                                        | **Implemented / Mocked**                              |
| `/certificates`                                            | Eligibility, local issue action, preview, print/PDF                                         | `requireLearner`                                             | Browser-local state                                                        | **Implemented / Demo-only**                           |
| `/profile`, `/profile/edit`                                | Profile summary/edit, interests, notifications, language                                    | `requireLearner`                                             | Supabase for name/language/phone/notifications; local for interests/avatar | **Partial mixed persistence**                         |
| `/login`                                                   | Email/password login, redirect return path                                                  | Redirects authenticated users                                | Supabase server function                                                   | **Implemented; remember-me control is nonfunctional** |
| `/register`                                                | Learner registration, validation, language, terms checkbox                                  | Redirects authenticated users                                | Supabase server function                                                   | **Implemented; external configuration unverified**    |
| `/verify-email`                                            | Verification instructions and resend                                                        | Public                                                       | Supabase server function                                                   | **Implemented**                                       |
| `/forgot-password`                                         | Enumeration-resistant recovery request UI                                                   | Public                                                       | Supabase server function                                                   | **Implemented**                                       |
| `/reset-password`                                          | Recovery-session password update                                                            | `requireAuthenticated`                                       | Supabase server function                                                   | **Implemented**                                       |
| `/auth/callback`                                           | PKCE code exchange and safe internal redirect                                               | Server GET handler                                           | Supabase                                                                   | **Implemented**                                       |
| `/accessibility`, `/privacy`                               | Informational statements                                                                    | Public                                                       | Hardcoded content                                                          | **Implemented / static**                              |
| `/sitemap.xml`, `robots.txt`                               | Public crawling metadata                                                                    | Public                                                       | Server handler/static file                                                 | **Implemented**                                       |
| `/$` and root not-found                                    | Friendly not-found handling                                                                 | Public                                                       | Static                                                                     | **Implemented**                                       |
| `/admin`                                                   | Metrics, charts, activity and content overview                                              | Inherited `requireSuperAdmin`                                | Local users/content plus static chart/activity seeds                       | **Implemented UI / Mocked analytics**                 |
| `/admin/users`                                             | Search/filter/page demo users; edit status and demo roles                                   | Super Admin                                                  | Local `DemoUser[]`                                                         | **Frontend Only / Mocked; not Supabase user admin**   |
| `/admin/topics`                                            | Tabs for module and topic CRUD, ordering, publication, references, previews                 | Super Admin                                                  | Local repository                                                           | **Implemented / Mocked persistence**                  |
| `/admin/lessons`                                           | Lesson CRUD, typed block editor, media/video/transcript, publication                        | Super Admin                                                  | Local state + IndexedDB                                                    | **Implemented / Mocked persistence**                  |
| `/admin/questions`                                         | Question CRUD, choices, correct answer, explanations, publication                           | Super Admin                                                  | Local state                                                                | **Implemented / Mocked persistence**                  |
| `/admin/awareness/$kind`                                   | CRUD/publication for seven awareness collections                                            | Super Admin                                                  | Local repository + IndexedDB                                               | **Implemented / Mocked persistence**                  |
| `/admin/awareness`                                         | Redirect to awareness articles                                                              | Super Admin                                                  | N/A                                                                        | **Implemented**                                       |
| `/admin/articles`, `/admin/posters`, `/admin/infographics` | Legacy redirects into unified awareness workspace                                           | Super Admin                                                  | N/A                                                                        | **Implemented redirect**                              |
| `/admin/reports`                                           | Filtered summaries, computed charts/tables, print and local CSV                             | Super Admin                                                  | Local attempts/progress/users                                              | **Implemented / Mocked, mixed aggregates**            |
| `/admin/certificates`                                      | Synthetic eligibility registry, issue/revoke, template editor, print                        | Super Admin                                                  | Local demo users and certificate records                                   | **Implemented / Mocked**                              |
| `/admin/announcements`                                     | CRUD, activate/deactivate, audience/date validation                                         | Super Admin                                                  | Local state                                                                | **Implemented / Mocked**                              |
| `/admin/profile`                                           | Auth profile update, password change, local avatar/preferences                              | Super Admin                                                  | Supabase + browser state                                                   | **Partial mixed persistence**                         |

## 7. Complete Functional Feature Inventory

| Capability                          | Classification                                 | Evidence and limitation                                                      |
| ----------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Public responsive site/navigation   | **Implemented**                                | `AppShell`, `HomePage`, public route set                                     |
| Awareness discovery/filtering       | **Implemented / Mocked**                       | Reads published browser-local collections                                    |
| Learning catalogue/modules          | **Implemented / Mocked**                       | Published local records; no server catalogue                                 |
| Structured lesson rendering         | **Implemented / Mocked**                       | Typed blocks; no arbitrary HTML                                              |
| Video upload/playback/resume        | **Implemented locally**                        | IndexedDB uploads and localStorage positions; no shared delivery/transcoding |
| Learner bookmarks/progress/activity | **Implemented locally**                        | Browser local and shared across accounts on that browser                     |
| Timed quiz engine                   | **Implemented locally**                        | Random selection, draft recovery, timer, scoring, feedback                   |
| Badges/recommendations              | **Hardcoded/deterministic**                    | Calculated from local demo rules, not AI                                     |
| Learner certificates                | **Demo-only**                                  | Local issuance/reference/print; not verifiable                               |
| Admin content CRUD                  | **Implemented locally**                        | Full client behavior, no backend authorization/persistence                   |
| Admin module/topic CRUD             | **Implemented locally**                        | Referential checks and cascades in browser only                              |
| Admin users/roles/status            | **Frontend Only / Mocked**                     | Does not touch Supabase identities or authoritative roles                    |
| Reports and CSV                     | **Implemented locally**                        | Generated in browser from local/synthetic data                               |
| Admin certificate registry          | **Mocked**                                     | Synthetic eligibility from demo aggregates                                   |
| Announcements                       | **Implemented locally**                        | Date/audience logic exists; no delivery service                              |
| Authentication                      | **Implemented in code; live setup incomplete** | Supabase server functions/cookies; migration absent remotely                 |
| Authorization                       | **Implemented for app routes/profile DB**      | Server-aware guards + RLS; domain mutations have no backend                  |
| Profile preferences                 | **Partial**                                    | Core profile fields in Supabase; interests/avatar local                      |
| Multilingual interface              | **Partial**                                    | Core navigation dictionary only; content English                             |
| Notifications                       | **Placeholder**                                | Bell reports no notifications; preferences are stored only                   |
| Search                              | **Implemented locally**                        | Client filtering only; no full-text service/index                            |
| Pagination                          | **Implemented locally**                        | Client-side admin pagination                                                 |
| Analytics                           | **Mocked/Partial**                             | Static dashboard trends plus locally computed reports                        |
| Telemetry/observability             | **Placeholder**                                | No-op telemetry; console error expansion only                                |

## 8. Backend Architecture

There is no separate backend project. The backend is TanStack Start server code compiled by Nitro for a Cloudflare Worker.

### Implemented backend responsibilities

- SSR request handling and route loading.
- Auth server functions in `src/auth/auth.functions.ts`.
- Supabase server client/cookie adaptation in `src/server/auth/supabase.ts`.
- Auth callback and sitemap route handlers.
- CSRF middleware for TanStack server functions (`src/start.ts`).
- Security headers and catastrophic SSR error normalization (`src/server.ts`).
- Zod validation for server auth inputs.

### Not present

- Domain HTTP/REST/GraphQL APIs.
- Domain controllers/services running on the server.
- Learning/content database queries.
- Object storage integration.
- Background jobs, scheduled work, queues, or email/notification service beyond Supabase Auth email.
- Production reporting/analytics pipeline.
- Audit-event persistence.
- Central application logging, tracing, or metrics provider.

The repository abstraction is client-side architecture, not a backend. `NcapRepository` describes future data access, and `LocalDemoRepository` currently fulfills it from React state.

## 9. Authentication and Authorization

### Authentication flow

1. Root route `beforeLoad` invokes `getAuthState()` on every route load/invalidation.
2. `createSupabaseServerClient()` reads validated `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` per request.
3. Supabase SSR reads and writes server response cookies with `httpOnly`, `sameSite=lax`, path `/`, and HTTPS-dependent `secure`.
4. `getAuthState` calls `supabase.auth.getUser()` rather than trusting decoded local claims, then loads the corresponding profile.
5. `AuthProvider` makes the result available to React; `NcapProvider` maps `super_admin` to its UI-only `admin` role and sanitizes identity before local persistence.
6. Login uses `signInWithPassword`; registration uses `signUp` with display name/language metadata and a callback URL.
7. `/auth/callback` exchanges the PKCE code for a session and validates the `next` path to prevent external redirects.
8. Recovery requests use a generic response; the callback establishes a recovery session and `/reset-password` updates the password.
9. Profile update and password change revalidate the current user on the server.
10. Logout uses Supabase local-scope sign-out and invalidates the router.

Session refresh is delegated to `@supabase/ssr`; calling `getUser()` through a cookie-aware client allows refreshed cookies to be written.

### Authorization flow

- `requireLearner` permits only authoritative learner profiles and redirects a Super Admin to `/admin`.
- `requireSuperAdmin` protects the `/admin` parent and redirects learners to `/dashboard`.
- `redirectAuthenticated` prevents signed-in users from returning to login/registration.
- PostgreSQL role is not accepted from registration metadata. The trigger always creates `learner`.
- RLS allows authenticated users to select their own profile; Super Admins may select profiles through a hardened security-definer helper.
- Column-level grants allow users to update only `display_name`, `language`, `phone`, and `notifications`; clients cannot update `role`, `email`, or identity fields.

Authentication is real in source code; authorization of domain content is not, because content mutations never reach a server. The configured live Supabase project still requires migration installation and live account verification.

## 10. API Inventory

TanStack server functions generate framework-managed internal endpoints, so stable public URL paths are not declared. Their callable contracts are:

| Operation              | Method | Input                                        | Auth                  | Purpose/status                                   |
| ---------------------- | ------ | -------------------------------------------- | --------------------- | ------------------------------------------------ |
| `getAuthState`         | GET    | None                                         | Cookie optional       | Validate user and load profile; **implemented**  |
| `signIn`               | POST   | email, password                              | Anonymous             | Supabase login; **implemented**                  |
| `register`             | POST   | name, email, password, language              | Anonymous             | Create learner identity; **implemented**         |
| `resendVerification`   | POST   | email                                        | Anonymous             | Resend signup verification; **implemented**      |
| `requestPasswordReset` | POST   | email                                        | Anonymous             | Send recovery email; **implemented**             |
| `updatePassword`       | POST   | new password                                 | Recovery/auth session | Complete reset; **implemented**                  |
| `updateProfile`        | POST   | display name, language, phone, notifications | Authenticated         | Update own safe profile fields; **implemented**  |
| `changePassword`       | POST   | current and new password                     | Authenticated         | Reauthenticated password change; **implemented** |
| `signOut`              | POST   | None                                         | Cookie session        | Local sign-out; **implemented**                  |
| `/auth/callback`       | GET    | `code`, optional `next`                      | PKCE code             | Exchange code and redirect; **implemented**      |
| `/sitemap.xml`         | GET    | None                                         | Public                | Generate origin-aware sitemap; **implemented**   |

Missing APIs required by the current frontend include CRUD/query endpoints for modules, lessons, quizzes, questions, topics, every awareness type, announcements, users, progress, bookmarks, attempts/drafts, reports, certificate templates/records, and media upload/delivery.

## 11. Data Model and Database Design

### Existing database model

The only application table defined is `public.profiles`:

- `id uuid` PK/FK to `auth.users`, cascading delete;
- `email`, `display_name`;
- `role app_role` (`learner`, `super_admin`), default learner;
- `language` (`en`, `si`, `ta`), phone, notifications;
- creation/update timestamps;
- checks for display-name length, language, and phone length;
- triggers for profile creation, email synchronization, and `updated_at`;
- RLS and restricted column grants.

No ORM is used. The migration is hand-written PostgreSQL SQL and database types are represented manually in `src/types/database.ts`.

### Required but not yet persisted domain data

The frontend implies future tables/collections for topics, modules, lessons, lesson blocks, quizzes, questions/options, awareness resources, media metadata, user learning profiles/preferences, bookmarks, lesson completions, quiz attempts/answers/drafts, badges/achievements, announcements, certificates/templates, content revisions/publication workflow, and audit events.

These are **proposed requirements**, not existing database tables. A future design should normalize stable relationships by IDs; current topic strings and embedded nested blocks are convenient demo structures but need deliberate storage/versioning decisions.

## 12. Dummy / Mock Data Analysis

Static seed data currently contains:

- 5 learning modules;
- 18 lessons;
- 5 quizzes and 48 question-bank entries;
- 16 articles, 12 tips, 6 updates, 8 best practices, 6 posters, 6 infographics, and 6 videos;
- 12 demo users and 4 announcements;
- hardcoded badges, recent admin activity, quiz trends, completion trends, and topic engagement.

`NcapProvider` enriches this with 11 generated topics, seeded learner completions/bookmarks/attempts/activity, certificate configuration, and local mutations. The data establishes intended statuses (`Published`/`Draft`, `Active`/`Inactive`/`Suspended`), audiences, learning difficulty, publication metadata, assessment feedback, eligibility rules, and content relationships.

Important implications:

- The seeded learner history is inserted for a learner whenever corresponding local arrays are empty; it is demonstration content, not that authenticated user’s history.
- Local domain state is stored under one browser-wide key, not namespaced by authenticated user ID. Different accounts on the same browser can therefore see the same demo progress, drafts, interests, and admin changes.
- Admin users are disconnected from Supabase profiles. Their `roles`, status, metrics, and certificates are fictional records.
- Dashboard activity and trend series are static; admin reports recompute from a different mixture of local attempts, completions, and demo-user aggregates.
- Learner-issued certificates and administrator `certificateRecords` are separate state models and are not a single authoritative registry.

Every local collection should eventually be replaced by authenticated, server-authorized persistence or be deliberately retained as sample content/fixtures.

## 13. Frontend-to-Backend Integration Matrix

| Feature                    | Frontend                    | Backend                            | Data source                     | Integration status                       | Missing work                                         |
| -------------------------- | --------------------------- | ---------------------------------- | ------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Registration/login/session | Complete UI                 | Supabase server functions          | Supabase Auth/profile           | **Code complete; deployment unverified** | Apply migration, configure URLs/email, live test     |
| Profile core fields        | Learner/admin forms         | Own-profile update function + RLS  | Supabase profile                | **Partial**                              | Live migration/test, stronger failure handling       |
| Interests/avatar           | Complete UI                 | None                               | localStorage/IndexedDB          | **Frontend Only**                        | Profile/media persistence API                        |
| Public awareness           | Complete                    | None                               | Local repository                | **Mocked**                               | Public content query API/cache                       |
| Awareness admin            | Complete CRUD               | None                               | Local repository                | **Frontend Only**                        | Authorized CMS API, revisions, storage               |
| Modules/topics             | Complete CRUD               | None                               | Local repository                | **Frontend Only**                        | DB model, transactional reference handling           |
| Lessons/authoring          | Complete                    | None                               | Local state/IndexedDB           | **Frontend Only**                        | Server validation, revisions, object storage         |
| Learner progress/bookmarks | Complete                    | None                               | Shared browser localStorage     | **Frontend Only**                        | Per-user progress service and DB                     |
| Quiz catalogue/engine      | Complete                    | None                               | Static quizzes/local questions  | **Frontend Only**                        | Secure attempt lifecycle and authoritative scoring   |
| Quiz drafts/results        | Complete                    | None                               | localStorage                    | **Frontend Only**                        | Per-user durable attempt/draft API                   |
| Users/roles/status         | Complete demo UI            | Profile RLS only; no admin actions | Demo users                      | **Disconnected**                         | Admin identity APIs and policy model                 |
| Announcements              | Complete CRUD/display rules | None                               | Local state                     | **Frontend Only**                        | Persistence, delivery/read state                     |
| Reports/analytics          | Complete local UI/export    | None                               | Local/synthetic records         | **Mocked**                               | Event model, aggregation jobs/APIs, authorization    |
| Certificates               | Complete demo UI            | None                               | Two local certificate models    | **Mocked**                               | Unified registry, issuance authority, verification   |
| Image/video media          | Complete local workflows    | None                               | IndexedDB/local/external URLs   | **Local only**                           | Object storage, scanning, transforms, access control |
| Notifications              | Preference and empty bell   | None                               | Profile boolean/local message   | **Placeholder**                          | Channel/provider, events, delivery/read model        |
| Localization               | Core navigation             | None                               | Bundled dictionary/localStorage | **Partial**                              | Full strings/content localization and governance     |

## 14. Implemented Functionality

Genuinely implemented today:

- Typed responsive public, learner, auth, and admin navigation and route rendering.
- Broad local demonstration workflows for awareness, learning, quizzes, progress, authoring, taxonomy, reports, announcements, and certificates.
- Repository contracts and a complete local repository adapter.
- Robust browser persistence recovery that retains valid state sections when a sibling section is corrupt.
- IndexedDB-backed local image/video storage with metadata and cleanup handling.
- Structured lesson authoring and safe rendering without executable HTML.
- Supabase email/password auth server functions and PKCE callback handling.
- HTTP-only cookie session handling, safe redirects, route role guards, profile RLS model, and CSRF middleware.
- Security response headers, generic SSR error pages, crawler metadata, and a secret scanner.
- Responsive/accessibility-conscious design behavior and substantial automated tests.

## 15. Partially Implemented Functionality

- **Authentication deployment:** code exists, but the live `profiles` endpoint returned 404; production behavior cannot be claimed.
- **Profile management:** name, language, phone, and notifications target Supabase; interests and avatar remain local.
- **Role administration:** route authorization uses real roles, but the admin Users screen edits unrelated demo roles.
- **Localization:** navigation basics are translated; feature and educational content is predominantly English.
- **Analytics:** report calculations exist, but dashboard trends/activity are static and all data is non-authoritative.
- **Certificates:** policy and print experiences exist, but records are local, split across two models, and not cryptographically verifiable.
- **Media:** validation/playback are functional locally, but storage and delivery are not production services.
- **Repository architecture:** the abstraction is sound enough for replacement, but feature code still frequently bypasses it through `useNcap`.
- **Route protection:** most sensitive routes use `beforeLoad`; lesson access uses only the UI shell role check.
- **Remember me:** visible on login but not wired to session duration or persistence behavior.
- **Terms acceptance:** required in UI but no consent record/version/timestamp is persisted.

## 16. Missing Backend Functionality

### Domain APIs and persistence

- Durable CRUD/query services for all learning, assessment, awareness, announcement, and certificate entities.
- Per-user progress, bookmark, activity, draft, attempt, achievement, and preference persistence.
- Transactional relationship and deletion policies.
- Content revision/history, review/approval, publishing, scheduling, and rollback if required by governance.

### Identity administration

- Authorized listing/searching of real profiles.
- Account suspension/activation enforcement.
- Server-controlled role assignment/removal with last-admin safeguards.
- Audit logs for privileged identity and content actions.

### Assessment and certificates

- Server-authoritative question delivery and attempt timing.
- Server scoring and immutable attempt records.
- Retake policy, question exposure controls, and integrity rules.
- Unified certificate registry, signed/verifiable references, revocation, public verification, and PDF generation strategy.

### Media and integrations

- Object storage, signed URLs, malware/content scanning, metadata persistence, lifecycle cleanup, and quotas.
- Video processing, adaptive formats, captions, thumbnails, and access control if required.
- Notification/email provider and templates beyond Supabase Auth messages.

### Operations

- Structured logs, tracing, metrics, alerting, rate limits, audit retention, backups, restore testing, and data export/deletion workflows.

## 17. Missing or Incomplete Frontend Functionality

- Replace browser-shared domain state with authenticated, per-user server data.
- Connect the Users screen to real identities and remove misleading local role mutation once backend administration exists.
- Unify learner/admin certificate views around one authoritative record model.
- Add server-backed conflict/version handling and optimistic mutation UX.
- Add complete localization and a content-language strategy.
- Implement notification behavior or remove/clearly label placeholder controls.
- Make “Remember me” functional or remove it.
- Add a dedicated terms document and consent representation if legally required.
- Apply consistent route-level guards to all intended learner-only content.
- Add durable upload progress, retry, failure recovery, and remote media states.
- Break very large feature files into bounded modules to reduce maintenance risk.

## 18. Functional Requirements

### FR-AUTH — Identity and account access

- Users shall register with name, email, password, and preferred language. **Implemented in code; live setup incomplete.**
- New registrations shall receive learner authority only. **Implemented in migration.**
- Users shall verify email, sign in/out, recover/reset passwords, and change passwords. **Implemented.**
- The system shall derive route access from an authoritative server/database role. **Implemented for learner/Super Admin routes.**
- Super Admin provisioning shall be privileged and never controlled by registration metadata. **Implemented as a manual database operation.**

### FR-AWARENESS — Public awareness content

- Visitors shall browse/search/filter published awareness resources. **Implemented with mock data.**
- Administrators shall create, edit, publish/unpublish, preview, order, and delete supported awareness types. **Implemented locally; backend missing.**
- Visual resources shall have accessible descriptions and downloadable assets. **Implemented locally.**

### FR-LEARNING — Modules and lessons

- Visitors shall discover modules; authenticated learners shall consume protected lessons and record progress. **UI implemented; persistence backend missing.**
- Lessons shall support structured paragraphs, headings, lists, callouts, examples, knowledge checks, and optional video/transcript. **Implemented locally.**
- Administrators shall manage modules, lessons, ordering, objectives, taxonomy, and publication status. **Implemented locally.**

### FR-ASSESSMENT — Quizzes

- Learners shall receive a bounded randomized set of published questions, a time limit, immediate feedback, and result breakdown. **Implemented locally.**
- Draft attempts shall survive reload. **Implemented in localStorage.**
- Attempts and scoring shall eventually be authoritative and tamper-resistant. **Inferred requirement; missing.**

### FR-PROGRESS — Learner workspace

- Learners shall see progress, next activity, attempts, badges, bookmarks, announcements, and activity history. **Implemented locally.**
- Data shall be isolated by learner and available across devices. **Implied production requirement; missing.**

### FR-ADMIN — Administration

- Super Admins shall manage content, taxonomy, learners, announcements, reports, certificates, and their profile. **UI implemented; only profile/auth has backend.**
- Privileged mutations shall be server-authorized and audited. **Missing for domain actions.**

### FR-CERT — Certificates

- Eligibility shall use a consistent policy and explain unmet requirements. **Implemented locally.**
- Authorized issuance/revocation and third-party verification shall use durable records. **Missing.**

## 19. Non-Functional Requirements

### Currently implemented or evidenced

- Strict TypeScript settings and typed route/repository/domain contracts.
- Production build targeting Cloudflare Workers.
- Client/server import protection for server modules.
- Auth input validation and database constraints.
- HTTP-only/same-site cookies, CSRF middleware, safe redirects, RLS, restricted grants.
- CSP and common security headers.
- Responsive layouts from 320px upward and reduced-motion handling.
- Accessibility-conscious semantics, focus, touch targets, transcripts, and alt-text validation.
- Unit, component, adapter, and browser testing.
- Secret scanning and ignored local environment files.
- Generic user-safe error pages and normalized repository errors.

### Required/recommended but not evidenced

- Availability/SLO targets, capacity estimates, and performance budgets.
- Production observability, structured logging, distributed tracing, and alerting.
- CI/CD workflows and protected deployment environments.
- Database backup, point-in-time recovery, restore drills, and migration rollback.
- Data retention, privacy impact assessment, consent/version tracking, and subject-rights workflows.
- Application-specific abuse controls and rate limiting.
- Full WCAG audit with assistive technologies and physical devices.
- Browser support policy and macOS/iOS native-video validation.
- Disaster recovery, incident response, support escalation, and operational ownership.
- Coverage thresholds and production integration-test environments.

## 20. Security Assessment

### Positive controls evidenced

- Supabase use is isolated to server functions; configured URL/key were verified absent from built browser assets.
- Session cookies are HTTP-only, same-site, path-scoped, and secure in HTTPS environments.
- `getUser()` verifies the session with Supabase instead of trusting local token claims.
- Open redirects reject external, protocol-relative, and backslash-based paths.
- Registration metadata cannot assign roles; new profiles default to learner.
- Profile RLS and column grants prevent client role/email changes.
- Security-definer functions set an empty search path and have restricted execution grants.
- CSRF middleware covers server functions.
- Passwords are handled by Supabase and cleared from relevant form state; demo persistence intentionally strips identity.
- Lesson content is typed text; video embeds use an HTTPS/provider allowlist.
- CSP, frame denial, nosniff, referrer policy, permissions policy, and HTTPS HSTS are present.
- The final dependency audit reported zero vulnerabilities at this snapshot.

### Concerns and verification gaps

| Priority | Finding                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | The live Supabase profile schema/RLS was not installed when checked. Until applied, registration/profile loading and role authorization cannot function end-to-end. |
| High     | All non-auth admin mutations are client-local; production authorization, validation, audit, and integrity do not exist.                                             |
| High     | Domain state is browser-wide rather than user-ID scoped, allowing cross-account sharing of demo progress/data on a shared device.                                   |
| Medium   | Authenticated E2E scenarios skip without real test-account environment variables; full live auth/RLS behavior is not continuously proven.                           |
| Medium   | No application audit log or operational monitoring exists; console logs are the only real error sink.                                                               |
| Medium   | No app-specific throttling/abuse control is evidenced. Supabase provider behavior/configuration requires verification.                                              |
| Medium   | CSP permits `'unsafe-inline'` for scripts/styles. This may be framework-driven, but nonce/hash hardening should be assessed.                                        |
| Medium   | Email verification settings, password policy, SMTP deliverability, CAPTCHA/bot protection, and redirect allowlists are external and unverified.                     |
| Low      | Verification email is carried in a query parameter for display, which can expose an address in browser history/logs.                                                |
| Low      | Auth operations do not consistently catch transport exceptions at the UI boundary; generic middleware prevents detail leakage but UX may degrade.                   |

No evidence supports claiming SQL injection, XSS, or credential leakage in the inspected code. The table identifies missing controls and verification gaps rather than confirmed exploits.

## 21. Testing and Quality Assurance Status

### Current automated coverage

The latest local quality gate passed TypeScript, lint, 46 Vitest tests, secret scan, and production build. Unit/component coverage includes:

- certificate eligibility, quiz scoring, announcement visibility, and topic duplicates;
- email/password/phone, lesson blocks/video, and corrupt persisted-section recovery;
- image/video validation and safe filenames;
- repository behavior and complete awareness/module lifecycle behavior;
- repository error normalization;
- lesson content authoring and literal-text rendering;
- safe redirects;
- static Supabase migration security contracts.

Playwright suites cover public navigation, responsive behavior, axe scans, auth form validation, anonymous route redirects, learner recovery, admin CRUD, content propagation, media downloads, modules/topics, lesson/video authoring, reports, and navigation consistency. Authenticated scenarios now require real Supabase test credentials and skip when absent. The most recent focused auth run passed two anonymous tests and skipped the admin account test because no test admin was configured.

### Material gaps

- No live Supabase integration test proves registration → verification → login → refresh → logout → recovery.
- No disposable database test proves RLS denial/allow behavior using learner/admin tokens.
- No server-function unit tests mock Supabase error/network cases.
- No load, performance, visual regression, penetration, or chaos tests.
- Coverage reporting is configured mainly for `src/domain/**`; no enforced thresholds exist.
- Existing `IMPLEMENTATION_STATUS.md` predates the real auth migration and contains stale claims/test counts; it should not be treated as the current authority.

## 22. Deployment and Operational Readiness

### Available evidence

- `npm run check` provides typecheck, lint, unit tests, secret scan, and production build.
- Nitro produces a Cloudflare module Worker and generated Wrangler configuration.
- Playwright runs against the built Worker rather than a development server.
- `.env.local` and Wrangler local state are ignored; `.env.example` documents required server variables.
- Runtime and static security headers are defined.
- Supabase migration and manual first-admin instructions exist.
- Robots and origin-aware sitemap behavior exist.

### Missing readiness work

- `.github` contains no workflow files; no CI/CD is implemented.
- No checked-in environment promotion/deployment pipeline, preview environment, or rollback process exists.
- No infrastructure-as-code, Docker image, service ownership, monitoring, alerts, or runbooks exist.
- No automatic Supabase migration deployment/verification exists.
- No production data backup/restore strategy exists.
- No domain backend or storage infrastructure exists.
- Supabase Site URL, redirect URLs, email templates/provider, auth policies, and live migration are external manual steps and currently unverified.

The frontend artifact is deployable, but the complete product is not production-operational.

## 23. Technical Debt and Architectural Risks

### High

1. **Browser-local domain architecture:** every core business record is non-authoritative, device-local, and mutable by the user.
2. **Cross-account local-state sharing:** one storage key is reused across authenticated identities.
3. **Disconnected identity models:** Supabase profiles and demo admin users/roles are unrelated, creating misleading user-management behavior.
4. **No domain backend:** content, progress, attempts, reports, and certificates have no server enforcement or durable shared data.
5. **Live auth schema absent:** code and environment alone do not make the authentication system operational.

### Medium

1. **Monolithic feature files:** `AdminPages.tsx` and `LearningPages.tsx` contain many unrelated screens and workflows, increasing regression and ownership cost.
2. **Partial repository migration:** widespread direct `useNcap()` usage bypasses the intended adapter boundary.
3. **Duplicated/legacy admin paths:** `AdminTopicsPage` remains beside the active `AdminModulesTopicsPage`; generic `AdminContentPage` retains awareness modes now redirected to another workspace.
4. **Two certificate models:** learner and administrator issuance are not one source of truth.
5. **Mixed analytics semantics:** static trend data, demo-user aggregates, and current-browser attempts are displayed together.
6. **String taxonomy relationships:** rename/cascade integrity is enforced procedurally in the browser rather than through stable IDs/transactions.
7. **Incomplete localization:** preference and navigation language imply more coverage than exists.
8. **Operational error handling:** no persistent telemetry or structured production logs.

### Low

1. Generic UI wrapper dependencies add bundle/maintenance surface despite no current feature usage.
2. The login remember-me checkbox has no behavior.
3. Some existing documentation is stale relative to the auth implementation.
4. Route protection style is inconsistent for the lesson route.

## 24. Gap Analysis

| Area              | Current state                       | Intended state                | Gap                          | Dependency                         |
| ----------------- | ----------------------------------- | ----------------------------- | ---------------------------- | ---------------------------------- |
| Auth deployment   | Complete source, migration not live | Verified production auth      | Apply/configure/test         | Supabase project administration    |
| Identity admin    | Demo user table                     | Real user/profile lifecycle   | APIs, policies, audit        | Auth schema and privileged service |
| Content           | Browser-local CRUD                  | Shared governed CMS           | DB/API/revisions             | Domain model, storage              |
| Learning progress | Shared browser key                  | Per-user cross-device history | Progress API/schema          | Authenticated domain backend       |
| Assessment        | Client questions/scoring            | Authoritative attempts        | Server attempt engine        | Question/attempt schema            |
| Media             | IndexedDB/external URLs             | Durable managed delivery      | Object storage/pipeline      | Storage/security design            |
| Reports           | Local/synthetic calculations        | Authoritative analytics       | Events/aggregation/API       | Durable activity data              |
| Certificates      | Demo print records                  | Verifiable issuance           | Unified registry/signing     | Authoritative progress/identity    |
| Localization      | Navigation dictionary               | Complete localized product    | Translation/content workflow | Product language policy            |
| Notifications     | Preference + empty UI               | Delivery and read state       | Event/provider integration   | Notification design                |
| Observability     | Console/no-op telemetry             | Logs/metrics/traces/alerts    | Provider and instrumentation | Privacy/operations decisions       |
| Delivery          | Manual build/deploy capability      | Automated controlled releases | CI/CD/migrations/rollback    | Hosting and environment strategy   |

## 25. Recommended Next Development Areas

### Phase 1 — Foundation / Blocking Work

1. Apply and verify the Supabase migration; configure Site URL, redirect allowlist, SMTP/email verification, and password/bot policies.
2. Provision disposable learner/Super Admin test identities and execute live auth/RLS tests.
3. Decide production ownership, hosting environments, CI/CD, secrets, logs, monitoring, backups, and migration process.
4. Define the authoritative domain data model and API conventions before replacing local state.
5. Decide tenant/organisation scope, role model, content approval rules, retention, privacy, and certificate authority requirements.

### Phase 2 — Core Backend and Data Integration

1. Implement topics, modules, lessons, quizzes/questions, and awareness content persistence.
2. Build a server/HTTP repository adapter behind the existing `NcapRepository` contract.
3. Implement object storage and media metadata/access controls.
4. Implement per-user preferences, bookmarks, completions, drafts, and attempts keyed by auth user ID.
5. Replace demo Users with real profile administration and audited role/status operations.

### Phase 3 — Complete Business Workflows

1. Add content revisions, review/approval, scheduling, and safe deletion/reference rules.
2. Make quiz attempts/timing/scoring authoritative.
3. Unify certificate eligibility, issuance, revocation, PDF generation, and verification.
4. Implement announcement delivery/read state and any approved notification channels.
5. Replace synthetic reports with authorized queries/aggregations.

### Phase 4 — Quality, Security, and Testing

1. Add database/RLS integration tests, server-function tests, and full real-account E2E flows.
2. Add abuse controls, audit logs, security review, and CSP hardening assessment.
3. Add performance/accessibility budgets, coverage thresholds, browser policy, and physical-device/assistive-technology testing.
4. Refactor large feature files and complete repository-boundary adoption.

### Phase 5 — Production Readiness

1. Add automated environment promotion, migrations, rollback, and smoke tests.
2. Establish SLOs, dashboards, alerts, incident response, backup/restore exercises, and support ownership.
3. Complete privacy/legal/content-governance reviews and full localization.
4. Run load, resilience, security, and operational acceptance testing.

## 26. Open Questions and Unverified Assumptions

- Who legally owns/operates NCAP, and is “national” official branding or prototype positioning?
- Is the system single-tenant, multi-agency, institution-based, or open public enrollment?
- Are additional roles (editor, reviewer, instructor, analyst, support) required?
- Should learning content and module descriptions be public while lessons/quizzes require login?
- What are the approved pass/fail, retake, completion, certificate, and expiry policies?
- Must certificates be publicly verifiable or digitally signed?
- What data retention, consent, child-safety, privacy, and data-residency rules apply?
- Which notification channels are required?
- Who approves Sinhala/Tamil translations and cybersecurity content?
- Are reports operational, programme-level, sector-level, or national indicators?
- What media providers/formats and upload limits are acceptable in production?
- Is learner progress expected across devices and organisations?
- Which Supabase region, plan, SMTP configuration, password policy, and backup features are configured?
- Has the migration been applied since the HTTP 404 verification recorded by this audit?
- Are authenticated Playwright test accounts available in a non-production project?

## 27. Context for the Next AI/Developer

NCAP is a polished Sri Lanka-focused cybersecurity awareness and learning Foundation Release built with React 19, TypeScript, TanStack Start/Router/Query, Tailwind, Radix UI, and Cloudflare/Nitro. The UI includes a public awareness library, five-module learning catalogue, 18 structured lessons, five quizzes backed by 48 questions, learner progress/bookmarks/badges/certificates, and a comprehensive Super Admin workspace for users, modules/topics, lessons, questions, seven awareness content types, reports, certificates, announcements, and profile settings.

Do not mistake UI completeness for backend completion. Supabase Auth is the only real backend integration. Server functions implement registration, verification, login, cookie session refresh, logout, recovery/reset, password change, and own-profile updates. A SQL migration defines a secure `profiles` table, learner default, `super_admin` role, triggers, grants, and RLS. The `/admin` parent and key learner routes use authoritative route guards. However, at the audit snapshot the configured project still returned 404 for `public.profiles`, so the migration and live end-to-end auth remain incomplete.

Every non-auth domain feature is browser-local. `NcapProvider` persists JSON under `ncap.demo.v2`; images/videos use IndexedDB. `NcapRepository` is a useful injectable boundary, but only a local adapter exists and many features still read `useNcap()` directly. The same local state is shared across authenticated accounts in one browser. The admin Users screen edits fictional users/roles, not Supabase profiles. Analytics mix static and computed demo data. Learner/admin certificates use separate local models. No domain APIs, domain database tables, object storage, audit logs, notification service, background jobs, CI/CD, or observability provider exist.

The immediate priority is to make authentication operational and verified, define the production domain/authorization model, then implement a real backend and HTTP repository adapter in dependency order: content/taxonomy, media, per-user progress/attempts, real user administration, certificates, and analytics. Preserve the existing accessible design, typed content model, repository boundary, explicit demo labels, and security properties while replacing local behavior incrementally.
