# NCAP — National Cybersecurity Awareness Platform

NCAP is a Foundation Release of a national-scale cybersecurity awareness, learning, and assessment experience for Sri Lanka. It combines plain-language awareness resources, structured lessons, quizzes, learner progress, and administrative reporting in one accessible, responsive interface.

The current release uses Supabase Auth with server-managed cookies, database-backed profiles, and
authoritative learner/Super Admin roles. Learning and editorial content still uses the existing
browser-based demonstration repositories. It is not an official incident-reporting channel or
government policy source.

## Technology

- React 19 and TypeScript
- TanStack Start, Router, and Query
- Vite and Tailwind CSS
- Radix UI primitives and Lucide icons
- Typed file-based routes and TanStack Query-ready service boundaries
- Supabase email/password authentication and PostgreSQL Row Level Security
- Versioned, schema-validated local demo data and IndexedDB demo media
- Vitest, Testing Library, and Playwright regression coverage

## Development

Install Node.js 20 or newer and npm, then run:

```sh
npm install
npm run dev
```

The local development server is available at `http://localhost:8080` by default.

## Validation

```sh
npm run typecheck
npm run lint
npm run test
npm run security:scan
npm run build
```

Run `npm run check` for the complete non-browser CI gate. Install Playwright browsers once with
`npx playwright install`, then run `npm run test:e2e` for the cross-browser critical flows.
Browser tests start their own built worker on port 4173; the development server on port 8080 is not reused.

Copy `.env.example` to `.env.local`, provide the Supabase URL and publishable key, and apply the
database migration before starting the application. Full database and test-account setup is in
[`supabase/README.md`](supabase/README.md).

## Authentication and data boundary

Identity, sessions, profile roles, email verification, and password recovery are handled by
Supabase through server functions. The publishable key is read server-side, authentication cookies
are HTTP-only, and administrator authorization comes from the protected `profiles.role` column.
No service-role key is required by the application.

All learning and editorial records remain demonstration data. Images and lesson videos selected in the admin experience are
stored in IndexedDB rather than localStorage and are explicitly labelled local demo media. Password
fields are never persisted or logged.

Production deployment still requires durable database/object storage for learning and editorial
content, server validation for those records, rate limiting, audit logs, authoritative analytics,
and cryptographically verifiable certificates.

The interface targets WCAG 2.2 AA-conscious patterns, responsive layouts from small phones through large displays, and reduced-motion preferences.

## Lesson authoring and video playback

In **Admin → Lessons**, create or edit a lesson using the content toolbar. Add headings,
paragraphs, lists, callouts, examples, and knowledge checks; move or delete blocks and undo/redo
changes. Bold, italic, underline, and alignment apply to whole paragraphs. Existing lesson
content remains compatible, and administrators no longer enter JSON. Content is rendered as
escaped text and typed formatting, not executable HTML.

Videos are optional. Choose an HTTPS YouTube/Vimeo link, a direct HTTPS MP4/WebM URL,
or an MP4/WebM file up to 100 MiB and four hours. Uploaded files must contain readable video
metadata. Add a transcript before publishing a video lesson, then save the record.

Learners see the player, transcript, and course-content navigation. Native videos have playback
speed controls, browser fullscreen controls, local resume per learner/lesson/source, and completion
on playback ending. YouTube/Vimeo retain their own player controls; use the lesson completion
button with these providers. External playback depends on the provider's availability and embedding
permissions. A transcript is a text alternative, not synchronized closed captions.

Uploads and resume positions stay in the current browser; clearing site data removes them.
This is not a complete Udemy video infrastructure: shared uploads, authenticated delivery,
adaptive-bitrate transcoding, caption tracks, and cross-device progress need backend services.

Native video upload/playback is verified in Chromium and Firefox. The Windows WebKit test
browser rejects the generated media fixtures independently of application validation, so native
Safari playback still requires verification on macOS/iOS. See [implementation status](IMPLEMENTATION_STATUS.md)
for the validation scope and remaining production requirements.
