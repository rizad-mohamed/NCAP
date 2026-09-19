/**
 * Central demo configuration for the NCAP Foundation Release.
 *
 * Every value here is a DEMO ASSUMPTION for the frontend prototype — not a
 * national policy, and not backed by any server. Replace these with values
 * supplied by a real backend during integration.
 */
export const NCAP_CONFIG = {
  questionsPerAttempt: 10,
  quizTimeLimitSeconds: 10 * 60,
  quizLowTimeWarningSeconds: 60,
  passingScorePercent: 70,
  certificateThresholdPercent: CERTIFICATE_POLICY.minimumBestQuizScore,
  mockLatencyMs: 320,
  pageSize: 8,
  adminPageSize: 8,
} as const;

export const DEMO_DISCLAIMER =
  "Demo data — this Foundation Release runs entirely in the browser with mock services.";
import { CERTIFICATE_POLICY } from "@/domain/rules";
