import type { Quiz } from "./types";

export const quizzes: Quiz[] = [
  {
    id: "q-fundamentals",
    moduleId: "m-fundamentals",
    title: "Digital Safety Fundamentals",
    description: "Everyday risk, safe habits and verifying unexpected requests.",
    topic: "Safe Browsing",
    difficulty: "Beginner",
  },
  {
    id: "q-passwords",
    moduleId: "m-passwords",
    title: "Passwords & MFA",
    description: "Passphrases, password managers, reuse and second factors.",
    topic: "Password Security",
    difficulty: "Beginner",
  },
  {
    id: "q-phishing",
    moduleId: "m-phishing",
    title: "Phishing & Social Engineering",
    description: "Links, attachments, OTP scams and influence tactics.",
    topic: "Phishing",
    difficulty: "Intermediate",
  },
  {
    id: "q-devices",
    moduleId: "m-devices",
    title: "Safe Devices & Browsing",
    description: "Updates, public Wi-Fi, mobile hardening and backups.",
    topic: "Device Security",
    difficulty: "Intermediate",
  },
  {
    id: "q-privacy",
    moduleId: "m-privacy",
    title: "Privacy & Online Safety",
    description: "Privacy settings, social media exposure and banking safety.",
    topic: "Privacy",
    difficulty: "Beginner",
  },
];

export const getQuiz = (id: string) => quizzes.find((q) => q.id === id);
