# User / Authentication verification — 4 October 2026

Overall release status: **BLOCKED** until production email, HTTPS origin/redirects, bot protection, operational monitoring, and the email-delivered lifecycle are verified. No production deployment was performed.

The work started on `main`, with HEAD and `origin/main` both at `83f9ed1c0b32e6d93a7bf814063dc26914807478` and a clean working tree. Scope is authentication, account profiles, and the existing Users account-management dependency. Other module behavior is preserved.

## Existing implementation retained

Registration/login/logout, PKCE email callback, password recovery/reset screens, server-validated Supabase sessions, HttpOnly/SameSite cookies, database profile ownership, authoritative learner/Super Admin roles, CSRF middleware, secure redirects, and security headers already existed. Users RPCs already independently authorize active administrators, reject self-access changes, require restriction reasons, audit role/status changes, ban restricted Auth users, and protect the final active Super Admin. The PostgREST request hook rejects inactive accounts even with an older JWT.

## Changes

- Interests and the existing administrator avatar editor now persist in `profiles`. Browser-local session preferences no longer override them or carry them between accounts. Language, name, phone and notification preferences retain their existing backend persistence.
- Avatars use bounded inline raster data in the profile: JPEG/PNG/WebP, up to 256 KiB and 1024 × 1024 pixels. Application validation checks the actual raster header, dimensions and byte length; RLS and database constraints reject other owners, oversized values and non-raster data URLs. This avoids introducing another media bucket or upload lifecycle. Removing the avatar saves `null`. Historical browser-only avatars/interests are not silently imported into a different account.
- Password mutations check active authoritative profiles. The reset action requires a cryptographically verified JWT containing a recent PKCE `recovery` authentication method (15 minutes), rather than trusting a route or URL flag. Changing a password independently verifies the current password through a separate, non-persisting Auth client. Other refresh sessions are revoked.
- Authentication and privileged account mutations use atomic shared database attempt counters. Only the server service role can consume them; ordinary clients cannot exhaust a named bucket through the RPC. Keys are HMAC digests; emails, passwords and raw IPs are not stored in the counter table.
- Auth forms and logout convert transport failures into safe errors and release loading states. Callbacks are uncached and suppress referrers. APP_URL must be an HTTPS origin, except localhost/127.0.0.1 development origins.
- The previously unconnected Remember me checkbox now selects persistent versus session cookies; refreshes preserve that choice. Cookie writes force HttpOnly/SameSite=Lax and Secure on HTTPS and forward Supabase's cache-prevention headers. Profile forms initialize from authoritative fields, and account changes restore the saved language.
- Existing account audit records gain durable actor/target UUID snapshots that survive deletion of live profile references. No duplicate role/status or audit system was added. Previously deleted/null identities cannot be reconstructed.

## Database and staging configuration

Confirmed staging: `NCAP_V1.0`, project reference `zsaefnfgauqvstptetdw`. Staging mutation/test scripts refuse another project.

Applied and recorded transactionally:

1. `202610040001_auth_finalization.sql`: safe profile fields/constraints/grants, active-owner update policy, durable audit UUIDs, private throttle table and service-only RPC.
2. `202610040002_auth_constraint_permissions.sql`: allows existing service-role writes to evaluate the profile constraint and indexes expired throttle buckets. Live testing discovered this required permission; the initial applied migration was preserved.
3. `202610040003_profile_avatar_constraints.sql`: enforces complete avatar field types, bounded sizes, raster signatures and decoded byte length for direct Data API writes as well as application updates. Invalid and null-valued shapes are rejected; the tested correction was applied separately.

No existing production data was dropped or recreated. Auth profile creation and email-sync triggers remain in place; registration metadata cannot set a privileged role. Existing final-admin safeguards, role/status RPCs, and account ban/request-hook architecture remain in use.

With explicit approval, staging now requires email confirmation and an eight-character password with a letter and a digit. Supabase also requires the current password for ordinary password updates. Staging Site URL is `http://127.0.0.1:4173`; its allowlist contains only the local worker callback and encoded recovery callback. This is a development test configuration, not a production HTTPS configuration.

SMTP is absent; built-in email quota is two per hour. CAPTCHA is disabled and no provider site key/secret was supplied. JWT expiry is 3600 seconds. Existing Supabase Auth endpoint rate limits remain enabled.

## Abuse controls and runtime requirements

The server requires `SUPABASE_SERVICE_ROLE_KEY` as a host secret for the throttle RPC. It is used only by the server throttle client; session/profile operations continue to use the publishable key and user RLS. The privileged key is never returned to a browser. Missing configuration or an unavailable throttle fails closed.

On the existing Cloudflare hosting architecture, set `AUTH_TRUST_PROXY=cloudflare` only behind trusted Cloudflare ingress, which overwrites `cf-connecting-ip`. Arbitrary forwarded headers are not trusted. Local HTTP tests use a shared development source. Other HTTPS hosts require an explicitly implemented trusted-source adapter before enabling Auth mutations.

Limits are 120 attempts per source per ten minutes, plus per-source/action/identity limits: login 10 per five minutes, privileged account changes 30 per five minutes, registration/reset/resend/password changes five per five minutes. These do not globally lock a victim's account. Counts include failed attempts and expire; the database uses atomic upserts. Test simulations cover limits, expiry and RPC permissions; twelve concurrent live calls to one disposable bucket permit exactly five attempts. Native Auth rate limits additionally protect direct Auth calls; application throttles cannot cover clients that call Supabase Auth directly. Configure CAPTCHA and review upstream rate limits before public release. Server-proxied native requests may share an egress IP; Supabase's supported forwarding configuration must be reviewed with the deployed topology.

## Verification results

- Database regression coverage: own-profile persistence, cross-user read/write denial, role/status write denial, inactive-owner update denial, duplicate interests and SVG rejection, last-admin/self-access restrictions, ban/request guard, restoration, durable audit identities after deletion, service-only throttle execution and bucket expiry.
- Authentication action coverage: registration validation and safe metadata, throttled login, generic login errors, authoritative interests, suspended-session clearing, non-enumerating reset/resend responses, recovery evidence, denied suspended password changes, denied incorrect current password, other-session revocation, safe profile updates and logout errors.
- Cookie/abuse tests cover forced security flags, session/persistent expiry, refresh preferences, cache headers, opaque shared counters, unavailable-server fail-closed behavior, trusted ingress and source denial. Callback tests cover verification/recovery destinations, external redirect rejection, and safe handling of provider-rejected or absent codes.
- `npm run check` passed: type checking, lint, 226 unit/integration tests, secret scan and production build. Two existing opt-in Awareness RLS tests were skipped. After the final avatar migration, all five database contract tests passed again. Dependency audit reported zero vulnerabilities; the extended scan found no secrets in tracked files, reachable Git history or build output.
- Live disposable staging checks passed: metadata role isolation; cross-user profile read/write denial; privileged columns/RPC denial; profile persistence; administrator role assignment/removal; suspension; old-token Data API denial; blocked sign-in; restoration; durable actor/target audit IDs; anonymous throttle denial; incorrect-current-password denial; valid password change; revocation of another refresh session. Disposable users/profiles were removed; security audit records were retained.
- Read-only staging security review passed: reviewed application tables have RLS, definer search paths are set, existing media buckets remain private, and checked parent relationships have no orphans. Anonymous Users RPC calls return 401; learner calls and suspended-token requests return 403.
- The browser test explicitly uses disposable confirmed staging accounts, checks session cookies, profile persistence in a fresh browser context, logout/account switching, learner/admin routing, suspension/restoration and avatar persistence. Ordinary registration email delivery, email-link verification and delivered recovery remain unverified because SMTP is unavailable. Provider-generated or pre-confirmed fixtures are not proof of email delivery.
- Browser results: Chromium, Firefox, WebKit, Mobile Chrome and Mobile Safari each passed three anonymous/form checks and the disposable authenticated lifecycle (four checks per project). The initial combined run passed 18/20; Safari logout-navigation races in the test were corrected and both affected lifecycle tests passed on targeted reruns. Native Windows WebKit's cookie metadata reports SameSite=None as documented by upstream Playwright; the actual issued HttpOnly/SameSite=Lax headers are asserted on every browser. No browser assertion was skipped to accept the races.
- CI runs the existing full repository pipeline on `main`: checks/build, dependency audit, extended secret review and the default Playwright suite. The privileged staging lifecycle remains explicitly opt-in; CI cannot certify delivered email or production infrastructure. See the final handoff for the exact commit/run result.

Reproduce local checks with `npm run check`, `npm audit --audit-level=moderate`, and `node scripts/security-review.mjs`. Run `node scripts/auth-deploy.mjs inspect` for redacted staging configuration/history. On the confirmed staging backend only, use `AUTH_STAGING_TESTS=1 node scripts/auth-live-check.mjs` and `AUTH_STAGING_TESTS=1 npx playwright test e2e/auth-lifecycle.spec.ts`. Test traces are disabled for the disposable credential lifecycle. Default CI skips this privileged staging workflow when the opt-in is absent; anonymous/browser form checks remain available.

## Production gates and residual risks

1. Supply and test a production SMTP provider and sender domain. Verify inbox/spam delivery, verification/resend, recovery expiry, replay denial and password reset through real delivered messages on all supported browsers. PKCE links currently require the browser that initiated the flow; cross-device email-link handling is not certified.
2. Supply the actual public HTTPS origin, set APP_URL, and replace development Site URL/redirect entries with exact production callbacks. Verify secure cookies, uncached authenticated responses, CSRF rejection, headers and redirects on that origin.
3. Supply a CAPTCHA provider/site key/secret and wire provider tokens into the existing forms before enabling the Auth CAPTCHA setting. Enabling the setting alone would block the current forms. No provider configuration was invented.
4. Verify server secrets, trusted ingress, abuse quotas, monitoring, alerting, backup/recovery and incident/session-revocation procedures. Production configuration and public deployment remain unverified.

Revoking refresh tokens does not instantly invalidate every already-issued JWT: active-account checks immediately block suspended accounts in the application/Data API, but normal logout/password change can leave an issued bearer token valid until expiry. The request hook does not cover Storage or Realtime. Future private account policies there must enforce active status. Inline avatars increase profile/session response size within the stated bound; larger media should use an owned Storage lifecycle if required later.

The application does not introduce a self-service account deletion screen. Privileged Supabase Auth deletion cascades the profile and its existing dependent user records; ordinary users lack table deletion privileges and the final active administrator remains protected. Durable account-security audit UUIDs survive. Operators must decide retention/export requirements before destructive deletion; this work did not change other modules' retention behavior. SQL access remains parameterized/typed, user text renders through React, and raster avatars exclude HTML/SVG. The existing CSP still permits inline scripts/styles; MFA and a nonce-based CSP are future hardening work, not claims made by this verification.

Code and staging core checks can pass while the overall Authentication production release remains blocked. NCAP may continue whole-system release preparation, but must not pass the final production-release gate until these outstanding requirements are verified.
