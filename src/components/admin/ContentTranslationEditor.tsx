import { useInterfaceText } from "@/lib/i18n";
import { useState } from "react";
import { Languages } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { dashboardButton, dashboardField } from "@/components/common/dashboard-primitives";
import { LessonContentBuilder } from "@/components/admin/LessonContentBuilder";
import { LANGUAGES } from "@/lib/i18n";
import { getAdminTranslations, saveContentTranslation } from "@/content-translations.functions";
import { unwrapDashboard } from "@/services/dashboard-hooks";
import {
  translationContentSchema,
  type ContentTranslation,
  type TranslationContent,
} from "@/domain/content-translations";

interface Props {
  kind: "modules" | "lessons" | "awareness";
  source: {
    id: string;
    title: string;
    version?: number | undefined;
    language?: "en" | "si" | "ta";
  };
}
export function ContentTranslationEditor({ kind, source }: Props) {
  const uiText = useInterfaceText();

  const [open, setOpen] = useState(false);
  const sourceLanguage = source.language ?? "en";
  const [language, setLanguage] = useState<"en" | "si" | "ta">(
    sourceLanguage === "si" ? "ta" : "si",
  );
  return (
    <>
      <button
        className={dashboardButton.icon}
        disabled={!source.version}
        aria-label={`Translate ${source.title}`}
        onClick={() => setOpen(true)}
      >
        <Languages className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {uiText("Translations:")} {source.title}
            </DialogTitle>
            <DialogDescription>
              {uiText("Original language:")} {sourceLanguage}
              {uiText(
                ". Only explicitly published translations are shown. Missing, draft or outdated translations use the original content.",
              )}{" "}
            </DialogDescription>
          </DialogHeader>
          <label>
            {uiText("Translation language")}{" "}
            <select
              className={dashboardField}
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
            >
              {LANGUAGES.filter((l) => l.code !== sourceLanguage).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {open && (
            <TranslationLoader
              key={`${source.id}:${language}`}
              kind={kind}
              source={source}
              language={language}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function TranslationLoader({
  kind,
  source,
  language,
  onClose,
}: Props & { language: "en" | "si" | "ta"; onClose: () => void }) {
  const uiText = useInterfaceText();

  const query = useQuery({
    queryKey: ["content-translations", kind, source.id, language],
    queryFn: () =>
      unwrapDashboard<ContentTranslation[]>(
        getAdminTranslations({ data: { kind, id: source.id, language } }),
      ),
  });
  if (query.isPending) return <p role="status">{uiText("Loading translations…")}</p>;
  if (query.isError)
    return (
      <p role="alert">
        {uiText("Translations are unavailable.")}{" "}
        <button onClick={() => void query.refetch()}>{uiText("Try again")}</button>
      </p>
    );
  return (
    <TranslationForm
      key={query.data[0]?.version ?? 0}
      kind={kind}
      source={source}
      language={language}
      translation={query.data[0]}
      onClose={onClose}
    />
  );
}
function TranslationForm({
  kind,
  source,
  language,
  translation,
  onClose,
}: Props & {
  language: "en" | "si" | "ta";
  translation?: ContentTranslation | undefined;
  onClose: () => void;
}) {
  const uiText = useInterfaceText();

  const fields = Object.keys(translationContentSchema.shape);
  const original: Record<string, unknown> = Object.fromEntries(
    Object.entries(source).filter(([field]) => fields.includes(field)),
  );
  if (
    "video" in source &&
    source.video &&
    typeof source.video === "object" &&
    "transcript" in source.video
  )
    original["transcript"] = source.video.transcript;
  const initial = translationContentSchema.parse(translation?.content ?? original);
  const [content, setContent] = useState<TranslationContent>(initial);
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const [reviewed, setReviewed] = useState(false);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      unwrapDashboard(
        saveContentTranslation({
          data: {
            kind,
            sourceId: source.id,
            sourceVersion: source.version,
            expectedVersion: translation?.version ?? 0,
            language,
            status,
            content,
          },
        }),
      ),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["content-translations"], refetchType: "none" }),
        cache.invalidateQueries({ queryKey: ["repository"], refetchType: "none" }),
      ]);
      onClose();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <p className="text-sm text-muted-foreground">
        {translation
          ? `${translation.status}${translation.stale ? " · Source changed: review required" : ""}`
          : "Untranslated · Source text copied into a draft; replace it with a reviewed translation."}
      </p>
      {Object.entries(content)
        .filter(([field]) => field !== "blocks")
        .map(([field, value]) => (
          <label key={field} className="grid gap-1 capitalize">
            {field}
            <textarea
              className={dashboardField}
              value={Array.isArray(value) ? value.join("\n") : String(value)}
              rows={field === "title" ? 1 : 4}
              onChange={(e) =>
                setContent((current) => ({
                  ...current,
                  [field]: Array.isArray(value) ? e.target.value.split("\n") : e.target.value,
                }))
              }
            />
          </label>
        ))}
      {content.blocks && (
        <LessonContentBuilder
          blocks={content.blocks}
          onChange={(blocks) => setContent((current) => ({ ...current, blocks }))}
        />
      )}
      <label>
        {uiText("Status")}{" "}
        <select
          className={dashboardField}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option>{uiText("Draft")}</option>
          <option>{uiText("Published")}</option>
        </select>
      </label>
      {status === "Published" && (
        <label className="flex gap-2">
          <input
            type="checkbox"
            required
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          {uiText("I have reviewed this translation against the current source.")}{" "}
        </label>
      )}
      {save.isError && <p role="alert">{save.error.message}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={dashboardButton.secondary} onClick={onClose}>
          {uiText("Cancel")}{" "}
        </button>
        <button
          className={dashboardButton.primary}
          disabled={save.isPending || (status === "Published" && !reviewed)}
        >
          {uiText("Save translation")}{" "}
        </button>
      </div>
    </form>
  );
}
