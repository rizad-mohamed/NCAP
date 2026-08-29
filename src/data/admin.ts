import type { ActivityItem, Announcement, Badge, DemoUser } from "./types";

export const demoUsers: DemoUser[] = [
  { id: "u-01", name: "Nadeesha Perera", email: "nadeesha.perera@example.lk", status: "Active", language: "si", progressPercent: 82, quizAverage: 88, lessonsCompleted: 14, attempts: 6, certificates: 2, lastActivity: "2026-08-28", joinedAt: "2026-03-11" },
  { id: "u-02", name: "Roshan Fernando", email: "roshan.fernando@example.lk", status: "Active", language: "en", progressPercent: 64, quizAverage: 74, lessonsCompleted: 11, attempts: 5, certificates: 1, lastActivity: "2026-08-27", joinedAt: "2026-02-04" },
  { id: "u-03", name: "Thilini Jayasuriya", email: "thilini.j@example.lk", status: "Active", language: "en", progressPercent: 96, quizAverage: 93, lessonsCompleted: 17, attempts: 8, certificates: 3, lastActivity: "2026-08-29", joinedAt: "2026-01-19" },
  { id: "u-04", name: "Ahamed Rizvi", email: "a.rizvi@example.lk", status: "Inactive", language: "ta", progressPercent: 22, quizAverage: 51, lessonsCompleted: 4, attempts: 2, certificates: 0, lastActivity: "2026-06-14", joinedAt: "2026-04-22" },
  { id: "u-05", name: "Kavindi Wickramasinghe", email: "kavindi.w@example.lk", status: "Active", language: "si", progressPercent: 48, quizAverage: 69, lessonsCompleted: 8, attempts: 4, certificates: 0, lastActivity: "2026-08-25", joinedAt: "2026-05-02" },
  { id: "u-06", name: "Dinesh Kumar", email: "dinesh.kumar@example.lk", status: "Active", language: "ta", progressPercent: 71, quizAverage: 81, lessonsCompleted: 12, attempts: 5, certificates: 1, lastActivity: "2026-08-26", joinedAt: "2026-02-27" },
  { id: "u-07", name: "Sanduni Alwis", email: "sanduni.alwis@example.lk", status: "Suspended", language: "en", progressPercent: 35, quizAverage: 58, lessonsCompleted: 6, attempts: 3, certificates: 0, lastActivity: "2026-07-30", joinedAt: "2026-03-30" },
  { id: "u-08", name: "Malith Gunaratne", email: "malith.g@example.lk", status: "Active", language: "en", progressPercent: 58, quizAverage: 77, lessonsCompleted: 10, attempts: 4, certificates: 1, lastActivity: "2026-08-24", joinedAt: "2026-06-08" },
  { id: "u-09", name: "Fathima Nazreen", email: "f.nazreen@example.lk", status: "Active", language: "ta", progressPercent: 88, quizAverage: 90, lessonsCompleted: 15, attempts: 7, certificates: 2, lastActivity: "2026-08-29", joinedAt: "2026-01-06" },
  { id: "u-10", name: "Chamara Silva", email: "chamara.silva@example.lk", status: "Active", language: "si", progressPercent: 12, quizAverage: 40, lessonsCompleted: 2, attempts: 1, certificates: 0, lastActivity: "2026-08-20", joinedAt: "2026-08-11" },
  { id: "u-11", name: "Ishara Bandara", email: "ishara.b@example.lk", status: "Inactive", language: "en", progressPercent: 44, quizAverage: 66, lessonsCompleted: 7, attempts: 3, certificates: 0, lastActivity: "2026-05-28", joinedAt: "2026-02-15" },
  { id: "u-12", name: "Praveen Rajapaksha", email: "praveen.r@example.lk", status: "Active", language: "si", progressPercent: 76, quizAverage: 84, lessonsCompleted: 13, attempts: 6, certificates: 2, lastActivity: "2026-08-28", joinedAt: "2026-04-03" },
];

export const announcements: Announcement[] = [
  { id: "an-01", title: "New module available: Safe Devices & Browsing", body: "Four new lessons cover updates, public Wi-Fi, mobile hardening and backups. The related quiz is open to all learners.", audience: "All Learners", active: true, startsAt: "2026-08-14", endsAt: "2026-09-30" },
  { id: "an-02", title: "Start with Digital Safety Fundamentals", body: "New to NCAP? The Fundamentals module takes under an hour and covers the habits that prevent most everyday incidents.", audience: "New Learners", active: true, startsAt: "2026-08-01", endsAt: "2026-12-31" },
  { id: "an-03", title: "Certificate threshold reminder", body: "In this demonstration release, certificate eligibility requires module completion and a quiz score of 80% or higher.", audience: "All Learners", active: true, startsAt: "2026-07-20", endsAt: "2026-10-31" },
  { id: "an-04", title: "Content review window opens Monday", body: "Draft lessons and articles should be submitted for review before the end of the week.", audience: "Administrators", active: false, startsAt: "2026-06-10", endsAt: "2026-06-30" },
];

export const adminActivity: ActivityItem[] = [
  { id: "aa-01", kind: "admin", label: "Thilini Jayasuriya registered as a learner", at: "2026-08-29 09:14" },
  { id: "aa-02", kind: "quiz", label: "Phishing & Social Engineering attempt completed — 90%", at: "2026-08-29 08:52" },
  { id: "aa-03", kind: "lesson", label: "Lesson “Passphrases beat clever passwords” updated", at: "2026-08-28 17:31" },
  { id: "aa-04", kind: "certificate", label: "Certificate issued for Passwords & MFA", at: "2026-08-28 15:02" },
  { id: "aa-05", kind: "admin", label: "Article “How a phishing message is built” published", at: "2026-08-28 11:48" },
  { id: "aa-06", kind: "lesson", label: "Nadeesha Perera completed “A backup routine you will keep”", at: "2026-08-27 20:10" },
  { id: "aa-07", kind: "admin", label: "Announcement “Certificate threshold reminder” activated", at: "2026-08-27 10:05" },
  { id: "aa-08", kind: "quiz", label: "Safe Devices & Browsing attempt completed — 70%", at: "2026-08-26 19:22" },
];

export const quizTrend = [
  { period: "Mar", average: 62, attempts: 48 },
  { period: "Apr", average: 66, attempts: 71 },
  { period: "May", average: 69, attempts: 96 },
  { period: "Jun", average: 72, attempts: 118 },
  { period: "Jul", average: 76, attempts: 152 },
  { period: "Aug", average: 79, attempts: 184 },
];

export const completionTrend = [
  { period: "Mar", completions: 34 },
  { period: "Apr", completions: 52 },
  { period: "May", completions: 61 },
  { period: "Jun", completions: 88 },
  { period: "Jul", completions: 104 },
  { period: "Aug", completions: 131 },
];

export const topicEngagement = [
  { topic: "Phishing", learners: 142 },
  { topic: "Passwords", learners: 128 },
  { topic: "MFA", learners: 96 },
  { topic: "Devices", learners: 84 },
  { topic: "Privacy", learners: 73 },
  { topic: "Backups", learners: 51 },
];

export const badges: Badge[] = [
  { id: "b-first-lesson", name: "First Lesson", description: "Completed your first NCAP lesson.", icon: "BookOpen" },
  { id: "b-phishing", name: "Phishing Spotter", description: "Scored 80% or higher on the phishing quiz.", icon: "Fish" },
  { id: "b-mfa", name: "MFA Champion", description: "Completed the Passwords & MFA module.", icon: "KeyRound" },
  { id: "b-explorer", name: "Security Explorer", description: "Completed lessons in three different modules.", icon: "Compass" },
  { id: "b-streak", name: "Learning Streak", description: "Completed lessons on three separate days.", icon: "Flame" },
];
