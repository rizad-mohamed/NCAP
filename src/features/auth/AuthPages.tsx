import { useState, type FormEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";
import { emailSchema, passwordSchema } from "@/domain/validation";
import { useAuth } from "@/auth/AuthProvider";
import {
  register as registerAccount,
  requestPasswordReset,
  resendVerification,
  signIn as signInAccount,
  updatePassword,
} from "@/auth/auth.functions";
import { safeInternalPath } from "@/auth/redirect";

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
            Secure account access powered by Supabase
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
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!email) next.email = "Email is required.";
    else if (!validEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFormError("");
    const result = await signInAccount({ data: { email: email.trim(), password } });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    await refresh();
    toast.success("Signed in securely");
    const fallback = result.data.role === "super_admin" ? "/admin" : "/dashboard";
    void navigate({ to: safeInternalPath(search.redirect, fallback) as never });
  };
  return (
    <AuthLayout
      hideFooter
      title="Welcome back"
      description="Log in securely to continue your learning."
    >
      <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)} noValidate>
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
        {formError && (
          <p className="rounded-xl bg-destructive-soft p-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <button className={primary} type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to NCAP?{" "}
        <AppLink href="/register" className="font-semibold text-primary">
          Create an account
        </AppLink>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    confirm: string;
    language: "en" | "si" | "ta";
    terms: boolean;
  }>({
    name: "",
    email: "",
    password: "",
    confirm: "",
    language: "en",
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (e: FormEvent) => {
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
    setBusy(true);
    setFormError("");
    const result = await registerAccount({
      data: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        language: form.language,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setForm((value) => ({ ...value, password: "", confirm: "" }));
    if (result.data.requiresEmailVerification) {
      void navigate({
        to: "/verify-email",
        search: { email: form.email.trim() },
      } as never);
      return;
    }
    await refresh();
    void navigate({ to: "/dashboard" as never });
  };
  const set = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <AuthLayout
      hideFooter
      title="Create your learning profile"
      description="Create a secure learner account. We will ask you to verify your email address."
    >
      <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)} noValidate>
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
            onChange={(e) => set("language", e.target.value as "en" | "si" | "ta")}
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
        {formError && (
          <p className="rounded-xl bg-destructive-soft p-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <button className={primary} disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
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
  const search = useSearch({ strict: false }) as { email?: string; error?: "link_invalid" };
  const email = search.email && validEmail(search.email) ? search.email : "your email address";
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resend = async () => {
    if (!validEmail(email)) return;
    setBusy(true);
    setError("");
    const result = await resendVerification({ data: { email } });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setResent(true);
    toast.success("Verification email requested");
  };
  return (
    <AuthLayout
      title={search.error ? "Verification link unavailable" : "Check your email"}
      description={
        search.error
          ? "This link is invalid or has expired. Request a new verification email."
          : "Use the secure verification link sent by Supabase to activate your account."
      }
    >
      <div className="py-8 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-9" />
        </span>
        <p className="mt-5 font-semibold">{email}</p>
        <button
          onClick={() => void resend()}
          disabled={busy || !validEmail(email)}
          className={cn(secondary, "mt-7 w-full")}
        >
          {busy ? "Requesting…" : resent ? "Verification email requested" : "Resend verification"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="mt-5 text-xs text-muted-foreground">
          The link expires automatically. Check your spam folder if it does not arrive.
        </p>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
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
    const result = await requestPasswordReset({ data: { email: email.trim() } });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSubmitted(true);
  };
  return (
    <AuthLayout
      title="Reset your password"
      description="We will send a time-limited password recovery link if an account exists."
    >
      {!submitted ? (
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
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      ) : (
        <div className="mt-7 rounded-xl bg-primary-soft p-5">
          <MailCheck className="size-6 text-primary" />
          <h2 className="mt-4 font-semibold">Check your email for reset instructions.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For privacy, this message is the same whether or not an account exists.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await updatePassword({ data: { password } });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setDone(true);
    await refresh();
  };

  return (
    <AuthLayout
      title={done ? "Password updated" : "Choose a new password"}
      description="Set a strong password for your NCAP account."
    >
      {!done ? (
        <form className="mt-7 grid gap-5" onSubmit={(event) => void submit(event)} noValidate>
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
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : (
        <div className="py-8 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success">
            <KeyRound className="size-9" />
          </span>
          <p className="mt-5 text-muted-foreground">Your password has been changed securely.</p>
          <button
            className={cn(primary, "mt-7 w-full")}
            onClick={() => void navigate({ to: "/dashboard" as never })}
          >
            Continue
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
