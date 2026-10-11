# Production launch checklist

Repository rehearsal date: 11 October 2026 (Asia/Colombo).

This checklist separates repository verification from production acceptance. The
Foundation Release remains blocked for public production launch. Existing evidence
and limitations in [Application hardening](APPLICATION_HARDENING.md),
[Authentication verification](../supabase/AUTHENTICATION_VERIFICATION.md) and
[Full-stack verification](../supabase/FULL_STACK_VERIFICATION.md) remain applicable.

**Temporary Render deployment for supervisor review is the next task after this
repository cleanup.** No Render deployment, production deployment, DNS change or
production configuration change is included in this rehearsal. The current build
targets a Cloudflare Worker; Render runtime compatibility must be assessed during
the separate supervisor-review deployment task.

## Deferred until after supervisor review

- [ ] Cloudflare/public HTTPS deployment.
- [ ] Production `APP_URL`, Supabase Site URL and redirect URLs.
- [ ] Production SMTP and delivered verification/recovery email testing.
- [ ] CAPTCHA/bot protection.
- [ ] Trusted ingress/proxy configuration.
- [ ] Monitoring, logging and alerts.
- [ ] Database backup/PITR.
- [ ] Supabase Storage backup strategy.
- [ ] Restore/disaster-recovery drill covering database and Storage.
- [ ] Production load/scalability testing.
- [ ] Production-origin security acceptance.
- [ ] Strict security-audit completion or explicit owner disposition of limitations.
- [ ] Native Safari/physical-device checks.
- [ ] Manual assistive-technology/accessibility review.
- [ ] Final approved localization/content review.
- [ ] Final production end-to-end acceptance.

Automated test passes, browser emulation and a green GitHub workflow do not close
these production gates. Skipped opt-in tests are exclusions, not passing coverage.
