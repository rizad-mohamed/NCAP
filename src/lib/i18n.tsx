import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LanguageCode } from "@/data/types";

export const LANGUAGES: { code: LanguageCode; label: string; english: string }[] = [
  { code: "en", label: "English", english: "English" },
  { code: "si", label: "සිංහල", english: "Sinhala" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
];

const en = {
  "nav.awareness": "Awareness",
  "nav.learn": "Learn",
  "nav.quizzes": "Quizzes",
  "nav.search": "Search",
  "nav.dashboard": "Dashboard",
  "nav.bookmarks": "Bookmarks",
  "nav.certificates": "Certificates",
  "nav.profile": "Profile",
  "nav.admin": "Administration",
  "nav.menu": "Menu",
  "nav.language": "Language",
  "nav.skip": "Skip to main content",
  "auth.login": "Log in",
  "auth.register": "Register",
  "auth.getStarted": "Get started",
  "auth.logout": "Log out",
  "auth.email": "Email address",
  "auth.password": "Password",
  "auth.fullName": "Full name",
  "auth.forgot": "Forgot password?",
  "auth.remember": "Remember me on this device",
  "action.continue": "Continue",
  "action.cancel": "Cancel",
  "action.save": "Save changes",
  "action.back": "Back",
  "action.retry": "Try again",
  "action.startLearning": "Start learning",
  "action.testKnowledge": "Test your knowledge",
  "dashboard.greeting": "Welcome back",
  "dashboard.progress": "Overall learning progress",
  "dashboard.quizAverage": "Quiz average",
  "dashboard.lessonsCompleted": "Completed lessons",
  "dashboard.hours": "Learning hours",
  "dashboard.continue": "Continue learning",
  "validation.required": "This field is required.",
  "validation.email": "Enter a valid email address, for example name@example.lk.",
  "validation.password": "Use at least 8 characters, including a number.",
};

type Key = keyof typeof en;
type Dict = Partial<Record<Key, string>>;

const si: Dict = {
  "nav.awareness": "දැනුවත්භාවය",
  "nav.learn": "ඉගෙනුම",
  "nav.quizzes": "ප්‍රශ්නාවලි",
  "nav.search": "සොයන්න",
  "nav.dashboard": "පුවරුව",
  "nav.bookmarks": "සුරැකි පාඩම්",
  "nav.certificates": "සහතික",
  "nav.profile": "පැතිකඩ",
  "nav.admin": "පරිපාලනය",
  "nav.menu": "මෙනුව",
  "nav.language": "භාෂාව",
  "nav.skip": "ප්‍රධාන අන්තර්ගතයට යන්න",
  "auth.login": "පිවිසෙන්න",
  "auth.register": "ලියාපදිංචි වන්න",
  "auth.getStarted": "ආරම්භ කරන්න",
  "auth.logout": "ඉවත් වන්න",
  "auth.email": "විද්‍යුත් තැපැල් ලිපිනය",
  "auth.password": "මුරපදය",
  "auth.fullName": "සම්පූර්ණ නම",
  "auth.forgot": "මුරපදය අමතකද?",
  "auth.remember": "මෙම උපාංගයේ මතක තබා ගන්න",
  "action.continue": "ඉදිරියට",
  "action.cancel": "අවලංගු කරන්න",
  "action.save": "වෙනස්කම් සුරකින්න",
  "action.back": "ආපසු",
  "action.retry": "නැවත උත්සාහ කරන්න",
  "action.startLearning": "ඉගෙනීම අරඹන්න",
  "action.testKnowledge": "දැනුම පරීක්ෂා කරන්න",
  "dashboard.greeting": "නැවත සාදරයෙන් පිළිගනිමු",
  "dashboard.progress": "සමස්ත ඉගෙනුම් ප්‍රගතිය",
  "dashboard.quizAverage": "ප්‍රශ්නාවලි සාමාන්‍යය",
  "dashboard.lessonsCompleted": "සම්පූර්ණ කළ පාඩම්",
  "dashboard.hours": "ඉගෙනුම් පැය",
  "dashboard.continue": "ඉගෙනීම දිගටම",
  "validation.required": "මෙම ක්ෂේත්‍රය අවශ්‍යයි.",
  "validation.email": "වලංගු විද්‍යුත් තැපැල් ලිපිනයක් ඇතුළත් කරන්න.",
  "validation.password": "අවම වශයෙන් අකුරු 8ක් සහ අංකයක් භාවිත කරන්න.",
};

const ta: Dict = {
  "nav.awareness": "விழிப்புணர்வு",
  "nav.learn": "கற்றல்",
  "nav.quizzes": "வினாடி வினா",
  "nav.search": "தேடல்",
  "nav.dashboard": "டாஷ்போர்டு",
  "nav.bookmarks": "சேமித்தவை",
  "nav.certificates": "சான்றிதழ்கள்",
  "nav.profile": "சுயவிவரம்",
  "nav.admin": "நிர்வாகம்",
  "nav.menu": "பட்டியல்",
  "nav.language": "மொழி",
  "nav.skip": "முதன்மை உள்ளடக்கத்திற்குச் செல்",
  "auth.login": "உள்நுழை",
  "auth.register": "பதிவு செய்",
  "auth.getStarted": "தொடங்கு",
  "auth.logout": "வெளியேறு",
  "auth.email": "மின்னஞ்சல் முகவரி",
  "auth.password": "கடவுச்சொல்",
  "auth.fullName": "முழுப் பெயர்",
  "auth.forgot": "கடவுச்சொல் மறந்ததா?",
  "auth.remember": "இந்த சாதனத்தில் நினைவில் வை",
  "action.continue": "தொடர்",
  "action.cancel": "ரத்து",
  "action.save": "மாற்றங்களைச் சேமி",
  "action.back": "பின்",
  "action.retry": "மீண்டும் முயற்சி",
  "action.startLearning": "கற்க தொடங்கு",
  "action.testKnowledge": "அறிவைச் சோதி",
  "dashboard.greeting": "மீண்டும் வருக",
  "dashboard.progress": "மொத்த கற்றல் முன்னேற்றம்",
  "dashboard.quizAverage": "வினாடி வினா சராசரி",
  "dashboard.lessonsCompleted": "நிறைவு பாடங்கள்",
  "dashboard.hours": "கற்றல் மணிநேரம்",
  "dashboard.continue": "கற்றலைத் தொடர்",
  "validation.required": "இந்தப் புலம் தேவை.",
  "validation.email": "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.",
  "validation.password": "குறைந்தது 8 எழுத்துகள் மற்றும் ஒரு எண் பயன்படுத்தவும்.",
};

const dictionaries: Record<LanguageCode, Dict> = { en, si, ta };

interface I18nValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: Key) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "ncap.language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && stored in dictionaries) setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
  }, []);

  const t = useCallback(
    (key: Key) => dictionaries[language][key] ?? en[key],
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
