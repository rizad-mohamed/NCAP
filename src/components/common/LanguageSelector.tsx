import { Globe } from "lucide-react";
import { useRef } from "react";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { useMutation } from "@tanstack/react-query";
import { saveProfileLanguage } from "@/profile-preferences.functions";
import { unwrapDashboard } from "@/services/dashboard-hooks";
import type { LanguageCode } from "@/data/types";
import { toast } from "sonner";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();
  const { user, refresh } = useAuth();
  const account = useRef(user?.id);
  account.current = user?.id;
  const save = useMutation({
    mutationFn: async (code: LanguageCode) => {
      const expectedUserId = user?.id;
      if (user)
        await unwrapDashboard(
          saveProfileLanguage({ data: { language: code, expectedUserId: user.id } }),
        );
      if (account.current !== expectedUserId) return;
      setLanguage(code, !user);
      await refresh();
    },
    onError: () => toast.error(t("action.retry")),
  });
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={`${t("nav.language")}: ${current.english}`}
        >
          <Globe className="size-4" aria-hidden="true" />
          {!compact && <span>{current.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            disabled={save.isPending}
            onSelect={() => save.mutate(l.code)}
            aria-current={l.code === language}
            className="flex items-center justify-between"
          >
            <span>{l.label}</span>
            <span className="meta text-muted-foreground">{l.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
