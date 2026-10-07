# Registration throttle and email-quota verification — 7 October 2026

## Root cause

The registration action previously translated **every** Supabase HTTP 429 into “Too many registration attempts.” With confirmation enabled, the confirmed `NCAP_V1.0` staging project returned `over_email_send_rate_limit` on the third disposable signup. That was an upstream email quota, not the application's registration counter.

The first two disposable `.invalid` recipients returned `email_address_invalid`; the third returned HTTP 429. These responses demonstrate that failed provider requests can consume email quota. They do not demonstrate delivered email. No recipient, password, token, raw source or throttle digest is included in this report.

Inspection found no duplicate counter consumption in the shared throttle or automatic action retries. `authAction` invokes its operation once; registration calls the throttle once. React Strict Mode does not replay event handlers. A synchronous registration ref guard now additionally rejects overlapping submit events before React commits the disabled button state.

## Effective policies and correction

The atomic database function and its service-only permissions are unchanged; no migration is required.

| Bucket | Limit |
| --- | --- |
| Source aggregate, across actions | 120 attempts / 600 seconds |
| Source + registration action + normalized identity | 5 attempts / 300 seconds |
| Source + verification resend action + normalized identity | 5 attempts / 300 seconds, independent of registration |
| Source + login action + normalized identity | 10 attempts / 300 seconds |
| Source + privileged administrative action + identity | 30 attempts / 300 seconds |
| Recovery and password actions | 5 attempts / 300 seconds |

One valid registration request consumes one source event and one registration event. These are intentional different buckets, not two registration increments. Attempt six in the same registration bucket is denied; expiry restores the allowance. Failed upstream requests still consume one application attempt. The shared source ceiling can independently deny an already-abusive source. Changing an email selects another identity bucket but cannot bypass the source ceiling. Accounts are not globally locked solely by email.

Registration now distinguishes actual counter denial from unavailable throttle infrastructure. Both fail closed. Only actual application denial uses “Too many registration attempts.” Provider email quota uses “Verification email requests are temporarily limited”; other provider 429 responses identify service request pressure. Provider/network failures and invalid/existing-account errors remain generic, without forwarding provider details or revealing account existence. Other actions retain their existing boolean throttle interface and policies.

## Staging configuration and email delivery

Staging inspection on October 7 found `mailer_autoconfirm=true`, built-in email quota `rate_limit_email_sent=2`, no custom SMTP and CAPTCHA disabled. This differs from the historical October 4 configuration record. Tests temporarily set auto-confirmation false, wait for `/auth/v1/settings` to confirm runtime propagation, and restore the original true value afterward. No rate limits, CAPTCHA configuration, password protections, redirect allowlist or SMTP settings are changed.

The management configuration and running Auth service converge asynchronously; an immediate PATCH response alone does not prove that confirmation is enabled. The first probe before runtime convergence auto-confirmed three disposable users; those users were removed, and the subsequent converged probe reproduced the email quota.

Five **application attempts** are supported. Five verification-email deliveries within five minutes are **not** supported by the configured two-email-per-hour built-in provider, whose quota is shared by email-sending endpoints and may already be exhausted by other requests. Raising this built-in quota is not a supported replacement for configuring custom delivery. Production requires a properly configured SMTP provider or supported send-email integration, reviewed quotas, approved recipients and real delivered-link verification. No delivery success is claimed from disposable invalid addresses or preconfirmed fixtures.

Official references: [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes).

## Reproducible verification

`node scripts/registration-live.mjs --staging-project=zsaefnfgauqvstptetdw` explicitly checks the confirmed project and current built-in-provider preconditions. It temporarily enables confirmation, reproduces safe upstream error codes, verifies the live service-only 5/300 counter, expiry and twelve concurrent calls, then runs the configured browser profiles serially. Use `--project=chromium` for a focused run.

Each browser submits one random disposable identity six times, with two synchronous submit events per attempt. Attempts one through five must display the **real provider email-quota** response; the sixth must display the application throttle response. Each stored counter must equal the attempt number and each attempt must produce exactly one POST. The form must leave its loading state and remain usable after errors. No Auth response or browser route is mocked. Owned accounts/counters are cleaned, original confirmation configuration is restored, and shared source counters are deliberately retained.

Run `npm run check`, targeted authentication/PGlite tests, `npm audit --audit-level=moderate`, and `node scripts/security-review.mjs`. CI retains the ordinary browser matrix; privileged staging checks require explicit opt-in.

Verification results:

- `npm run check`: passed, including typecheck, lint, 287 Vitest tests (two existing hosted opt-in skips), secret scan and production build.
- Final targeted authentication/throttle/PGlite run: 40 passed across three files, including all six administrator-users database contract tests. The two throttle cases verify service-only permissions/table denial, exact increments, five/six threshold, expiry and queued concurrency. Real PostgreSQL concurrency was verified separately.
- Hosted database: attempts 1–5 allowed, attempt 6 denied, stored count exactly 6; expiry restored allowance; 12 concurrent HTTP RPC requests allowed exactly 5 with stored count exactly 12; anonymous RPC execution denied.
- Real staging signup repro after quota exhaustion: three HTTP 429 `over_email_send_rate_limit` responses, with confirmation enabled in the running Auth service.
- Chromium, Firefox, WebKit, mobile Chrome and mobile Safari: one staging browser workflow passed each, five passed total, zero failures. Each checks six attempts, duplicate submit protection, exact database consumption, real provider/application messages and form recovery.
- Dependency audit: zero vulnerabilities.

Final commits, security-review results and passing CI URL are recorded in the completion report. These checks do not certify production email delivery, CAPTCHA or public deployment.
