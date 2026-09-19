import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import type { AuthState } from "@/auth/types";
import { signOut as signOutServer } from "@/auth/auth.functions";

interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>;
  signOut: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, state }: { children: ReactNode; state: AuthState }) {
  const router = useRouter();
  const refresh = useCallback(async () => {
    await router.invalidate();
  }, [router]);
  const signOut = useCallback(async () => {
    const result = await signOutServer();
    if (result.ok) await router.invalidate();
    return result.ok;
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
