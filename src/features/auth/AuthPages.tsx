import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppLink, Brand, PublicFooter } from "@/components/layout/AppShell";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useSessionPreferences } from "@/state/ncap-store";
import { cn } from "@/lib/utils";
import { DemoAuthService } from "@/services/auth";
import { emailSchema, passwordSchema } from "@/domain/validation";
import { useI18n } from "@/lib/i18n";
import type { LanguageCode } from "@/data/types";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-base placeholder:text-muted-foreground focus:border-violet";
const primary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm hover:bg-violet hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-5 text-sm font-bold shadow-sm hover:border-violet hover:bg-accent hover:text-primary";
type Errors = {
  email?: string;
  password?: string;
  name?: string;
  confirm?: string;
  terms?: string;
};
const validEmail = (value: string) => emailSchema.safeParse(value).success;

function AuthLayout({
  title,
  description,
  children,
  hideFooter = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  hideFooter?: boolean;
}) {
  return (
    <>
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(420px,.9fr)_1.1fr]">
        <aside className="grid-motif relative hidden min-h-dvh overflow-hidden bg-primary p-10 text-white lg:flex lg:flex-col xl:p-14">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-500"
            aria-hidden="true"
          />
          <div
            className="absolute -right-32 top-1/3 size-96 rounded-full bg-sky-500/15 blur-3xl"
            aria-hidden="true"
          />
          <Brand inverse />
          <div className="relative my-auto max-w-lg">
            <span className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/10 shadow-lg">
              <ShieldCheck className="size-8" />
            </span>
            <p className="meta mt-8 text-sky-300">Your digital safety journey</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight xl:text-5xl">
              Build safer habits, one clear step at a time.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              NCAP turns everyday cybersecurity into practical learning, useful feedback, and
              visible progress.
            </p>
            <ul className="mt-8 grid gap-3 text-sm font-bold text-white/80">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
                Short, plain-language lessons
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
                Progress you can see and resume
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
                Designed for accessible learning
              </li>
            </ul>
          </div>
          <p className="relative text-xs text-white/50">
            Frontend demonstration · No production authentication
          </p>
        </aside>
        <main
          id="main-content"
          className="page-enter flex min-h-dvh items-center justify-center p-4 sm:p-8 lg:p-12"
        >
          <div className="w-full max-w-lg">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Brand />
              <LanguageSelector compact />
            </div>
            <AppLink
              href="/"
              className="mb-7 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Back to NCAP
            </AppLink>
            <div className="panel p-6 sm:p-9">
              <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
              <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
              {children}
            </div>
          </div>
        </main>
      </div>
      {!hideFooter && <PublicFooter />}
    </>
  );
}
function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const password = type === "password";
  return (
    <label className="block text-sm font-semibold" htmlFor={name}>
      {label}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          {" "}
          *
        </span>
      )}
      <span className="relative block">
        <input
          id={name}
          name={name}
          type={password ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, password && "pr-12", error && "border-destructive")}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          autoComplete={autoComplete}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-1 top-2 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
      {error && (
        <span
          id={`${name}-error`}
          className="mt-1 block text-xs font-normal text-destructive"
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}

export function LoginPage() {
  const { signIn, ready } = useSessionPreferences();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!email) next.email = "Email is required.";
    else if (!validEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const normalizedEmail = email.trim();
    signIn("learner", normalizedEmail.split("@")[0], normalizedEmail);
    toast.success("Learner demo opened");
    void navigate({ to: "/dashboard" as never });
  };
  const demo = (role: "learner" | "admin") => {
    signIn(role);
    void navigate({ to: (role === "admin" ? "/admin" : "/dashboard") as never });
  };
  return (
    <AuthLayout
      hideFooter
      title="Welcome back"
      description="Log in to continue your learning. This form demonstrates validation and does not authenticate against a server."
    >
      <form className="mt-7 grid gap-5" onSubmit={submit} noValidate>
        <Field
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          required
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-violet" />
            Remember me on this device
          </label>
          <AppLink href="/forgot-password" className="font-semibold text-primary">
            Forgot password?
          </AppLink>
        </div>
        <button className={primary} type="submit">
          Log in
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        OR USE DEMO ACCESS
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className={secondary} disabled={!ready} onClick={() => demo("learner")}>
          Continue as Learner
        </button>
        <button className={secondary} disabled={!ready} onClick={() => demo("admin")}>
          Continue as Administrator
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to NCAP?{" "}
        <AppLink href="/register" className="font-semibold text-primary">
          Create a demo account
        </AppLink>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    language: "en",
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  useEffect(() => setHydrated(true), []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n: Errors = {};
    if (form.name.trim().length < 2) n.name = "Enter your full name.";
    if (!validEmail(form.email)) n.email = "Enter a valid email address.";
    const password = passwordSchema.safeParse(form.password);
    if (!password.success)
      n.password = password.error.issues[0]?.message ?? "Choose a stronger password.";
    if (form.confirm !== form.password) n.confirm = "Passwords do not match.";
    if (!form.terms) n.terms = "Accept the terms of use and privacy notice to continue.";
    setErrors(n);
    if (Object.keys(n).length) return;
    sessionStorage.setItem("ncap.verify.email", form.email.trim());
    sessionStorage.setItem(
      "ncap.verify.profile",
      JSON.stringify({ name: form.name.trim(), email: form.email.trim(), language: form.language }),
    );
    setForm((value) => ({ ...value, password: "", confirm: "" }));
    void navigate({ to: "/verify-email" as never });
  };
  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <AuthLayout
      hideFooter
      title="Create your learning profile"
      description="Registration is simulated in this frontend demo. Your password is validated in memory and never persisted."
    >
      <form className="mt-7 grid gap-5" onSubmit={submit} noValidate>
        <Field
          label="Full name"
          name="name"
          value={form.name}
          onChange={(v) => set("name", v)}
          error={errors.name}
          autoComplete="name"
          required
        />
        <Field
          label="Email address"
          name="email"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
          autoComplete="email"
          required
        />
        <div>
          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={(v) => set("password", v)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <div
            className="mt-2 flex gap-1"
            aria-label={`Password strength: ${passwordSchema.safeParse(form.password).success ? "requirements met" : "requirements not met"}`}
          >
            {[
              form.password.length >= 8,
              /[0-9]/.test(form.password),
              /[A-Za-z]/.test(form.password),
            ].map((ok, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded", ok ? "bg-success" : "bg-border")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">At least 8 characters with a number.</p>
        </div>
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          value={form.confirm}
          onChange={(v) => set("confirm", v)}
          error={errors.confirm}
          autoComplete="new-password"
          required
        />
        <label className="text-sm font-semibold">
          Preferred language
          <select
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            className={inputClass}
          >
            <option value="en">English</option>
            <option value="si">සිංහල</option>
            <option value="ta">தமிழ்</option>
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(e) => set("terms", e.target.checked)}
            className="mt-1 size-4 accent-violet"
          />
          <span>
            I accept the{" "}
            <AppLink href="/privacy" className="font-semibold text-primary">
              terms of use and privacy notice
            </AppLink>
            . <span className="text-destructive">*</span>
            {errors.terms && (
              <span className="mt-1 block text-xs text-destructive" role="alert">
                {errors.terms}
              </span>
            )}
          </span>
        </label>
        <button className={primary} disabled={!hydrated}>
          Create demo profile
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <AppLink href="/login" className="font-semibold text-primary">
          Log in
        </AppLink>
      </p>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const { session, signIn } = useSessionPreferences();
  const { setLanguage } = useI18n();
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState(session.email || "your-address@example.lk");
  useEffect(() => {
    const stored = sessionStorage.getItem("ncap.verify.email");
    if (stored) setEmail(stored);
  }, []);
  const verify = () => {
    try {
      const pending = JSON.parse(sessionStorage.getItem("ncap.verify.profile") ?? "{}") as {
        name?: string;
        email?: string;
        language?: LanguageCode;
      };
      signIn("learner", pending.name, pending.email ?? email);
      if (pending.language && ["en", "si", "ta"].includes(pending.language)) {
        setLanguage(pending.language);
      }
    } catch {
      signIn("learner", undefined, email);
    }
    sessionStorage.removeItem("ncap.verify.profile");
    setVerified(true);
  };
  return (
    <AuthLayout
      title={verified ? "Email verified in demo mode" : "Check your email"}
      description={
        verified
          ? "The demonstration verification step is complete."
          : "A production version would send a secure verification link. No email has been sent by this frontend demo."
      }
    >
      <div className="py-8 text-center">
        <span
          className={cn(
            "mx-auto grid size-20 place-items-center rounded-full",
            verified ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
          )}
        >
          {verified ? <CheckCircle2 className="size-9" /> : <MailCheck className="size-9" />}
        </span>
        <p className="mt-5 font-semibold">{email}</p>
        {verified ? (
          <AppLink href="/dashboard" className={cn(primary, "mt-7 w-full")}>
            Continue to dashboard
          </AppLink>
        ) : (
          <>
            <button onClick={verify} className={cn(primary, "mt-7 w-full")}>
              Simulate verification
            </button>
            <button
              onClick={() => {
                setResent(true);
                toast.success("Demo resend simulated — no email was sent");
              }}
              className={cn(secondary, "mt-3 w-full")}
            >
              {resent ? "Demo resend simulated" : "Resend verification (demo)"}
            </button>
            <p className="mt-5 text-xs text-muted-foreground">
              Demo-only controls are intentionally explicit. No email service is connected.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "confirm" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setBusy(true);
    await DemoAuthService.requestPasswordReset(email.trim());
    setBusy(false);
    setStep("confirm");
  };
  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setBusy(true);
    await DemoAuthService.resetPassword("demo-reset-contract", password);
    setPassword("");
    setConfirm("");
    setBusy(false);
    setStep("done");
  };
  return (
    <AuthLayout
      title={step === "done" ? "Demo password reset complete" : "Reset your password"}
      description="This complete demonstration flow does not send email or store your new password."
    >
      {step === "email" && (
        <form className="mt-7 grid gap-5" onSubmit={(event) => void submitEmail(event)} noValidate>
          <Field
            label="Email address"
            name="reset-email"
            type="email"
            value={email}
            onChange={setEmail}
            error={error}
            autoComplete="email"
            required
          />
          <button disabled={busy} className={primary}>
            {busy ? "Submitting…" : "Continue"}
          </button>
        </form>
      )}
      {step === "confirm" && (
        <div className="mt-7 rounded-xl bg-primary-soft p-5">
          <MailCheck className="size-6 text-primary" />
          <h2 className="mt-4 font-semibold">
            If an account exists, reset instructions would be sent.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For privacy, the real experience would show this generic message for every address.
          </p>
          <button className={cn(primary, "mt-5 w-full")} onClick={() => setStep("reset")}>
            Continue demo reset
          </button>
        </div>
      )}
      {step === "reset" && (
        <form className="mt-7 grid gap-5" onSubmit={(event) => void submitReset(event)}>
          <Field
            label="New password"
            name="new-password"
            type="password"
            value={password}
            onChange={setPassword}
            error={error}
            autoComplete="new-password"
            required
          />
          <Field
            label="Confirm new password"
            name="confirm-password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            error={
              password && confirm && password !== confirm ? "Passwords do not match." : undefined
            }
            autoComplete="new-password"
            required
          />
          <button disabled={busy} className={primary}>
            {busy ? "Submitting…" : "Simulate password reset"}
          </button>
        </form>
      )}
      {step === "done" && (
        <div className="py-8 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success">
            <KeyRound className="size-9" />
          </span>
          <p className="mt-5 text-muted-foreground">
            No credentials were changed or persisted. The demo flow is complete.
          </p>
          <AppLink href="/login" className={cn(primary, "mt-7 w-full")}>
            Return to login
          </AppLink>
        </div>
      )}
    </AuthLayout>
  );
}
