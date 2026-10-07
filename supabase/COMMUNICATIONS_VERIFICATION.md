# Communications and localization verification

Verification began 2026-10-05 and resumed 2026-10-07 (Asia/Colombo). This supplements the historical full-stack verification; production infrastructure remains deferred.

## Implemented scope

See [operations and limitations](COMMUNICATIONS_LOCALIZATION.md) for announcements, notification delivery/read state, translation governance and media validation. Existing authentication, content relationships, private buckets and administrative roles are reused.

Three migrations are applied and recorded on the confirmed staging project: `202610040004_announcements_notifications.sql`, `202610040005_content_translations.sql`, and `202610040006_notification_visibility.sql`. Five new tables have RLS enabled. The translation source table has no direct client grants; access is through bounded protected RPCs.

## Local and hosted evidence

- Typecheck and lint passed.
- Full Vitest: 268 passed, 2 existing opt-in tests skipped; 41 files passed, 1 skipped. Includes 17 new PGlite cases for communications/translation permissions, schedules, audience, audit, idempotency, optimistic versions and snapshot redaction, plus media transport/failure/retry and identity tests.
- `npm run check` passed with exit code 0, including the production build.
- Secret scan passed: 372 text files checked. Extended tracked-file/history/build review also passed without disclosing local privileged values.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- Read-only staging review: all 35 reviewed application tables use RLS; no definer function lacks a search path; Awareness/Learning buckets are private; checked parent relationships have zero orphans.
- Hosted feature API checks passed: anonymous/learner privilege denial, owner isolation, immutable notification content, duplicate suppression, withdrawal redaction through RPC and direct-table RLS, audit protection and draft isolation. Disposable fixtures were removed and 13 table digests matched baseline.

Staging feature browser matrix: Chromium, Firefox, WebKit, mobile Chrome and mobile Safari each passed 3/3 workflows (15 passed total): announcement CRUD/preview/targeting; notification counts/read state across devices; translation publication/language persistence/account switching/draft fallback. Each final profile verified the browser mutation audit sequence and all 13 original full-row cleanup digests. Chromium's transient final account deletion succeeded on recovery. WebKit exposed preview controls outside the viewport; the existing dialog now scrolls within a bounded height and the rerun passed.

A corrupt local dependency directory was isolated and the exact lockfile dependencies restored. An interrupted earlier staging run was recovered using explicit disposable IDs and source audit ownership; all 13 non-fixture table digests remained unchanged. Future runs retain ignored identifier-only recovery manifests until successful cleanup.

Chromium full-stack regressions: the first run passed 12/15; the three affected workflows passed on targeted rerun (Awareness image finalization/replacement, admin user changes, Learning malicious-image rejection/replacement/retirement). Firefox, WebKit and mobile Safari each passed both image workflows (6 additional passes), including malicious-file rejection and replacement/retirement. Final runs restored all 17 table digests. The two opt-in hosted Awareness RLS tests passed with disposable authenticated accounts.

The October 7 recovery of an interrupted October 5 WebKit run removed all fixture accounts/resources. No fixture identifier remains in any of the 17 tracked tables. Ten original table digests matched; seven differed because unrelated learner activity and an announcement were created during the two-day interruption (the announcement timestamp was October 7). That unrelated data was preserved, and the resolved manifest retained locally. Fresh runs snapshot current staging state; a historical whole-database digest mismatch is investigated, never resolved by deleting unrelated data.

The refreshed October 7 dependency audit found new high advisories in Sharp/librsvg and source-map-js. Targeted overrides select Sharp 0.35.5 and source-map-js 1.2.2 while retaining Wrangler 4.147.0. The repeated dependency audit returned zero vulnerabilities; `npm run check` passed against that lockfile and the final source. No force downgrade or audit suppression is used.

The ordinary browser matrix detected escaped JSX entity text in the localized navigation label. Both navigation labels and the extraction helper now preserve JSX entity semantics; the existing browser assertions remain unchanged. Named and numeric entity decoding was also checked directly.

Final ordinary Playwright matrix: 63 passed, 317 existing browser-scope/authenticated opt-in skips, zero failures and zero retries. Hosted feature checks above supply the privileged staging evidence; skips were not added or expanded to suppress failures.

| Profile | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 19 | 57 | 0 |
| Firefox | 11 | 65 | 0 |
| WebKit | 11 | 65 | 0 |
| Mobile Chrome | 11 | 65 | 0 |
| Mobile Safari | 11 | 65 | 0 |

GitHub's mandatory `Frontend checks` workflow validates the pushed commit with a clean dependency installation, `npm run check`, dependency/secret reviews and the ordinary five-profile browser matrix. The final run URL, exact commit and synchronized Git state are included in the completion report; CI does not deploy production infrastructure.

## Explicit limits

The English catalogue contains 758 distinct strings routed through the existing localization lookup. Many Sinhala/Tamil approved dictionary entries remain absent and use English fallback. No educational translation is fabricated or marked reviewed. Translation drafts and stale publications are excluded from learner/public results.

Header/container validation is not malware scanning or full transcoding. Public deployment, production SMTP/CAPTCHA, monitoring/alerts, backups/PITR and recovery remain future production work.
