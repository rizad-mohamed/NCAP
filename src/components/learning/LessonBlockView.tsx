import { Check, CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import type { LessonBlock } from "@/data/types";
import { useInterfaceText } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LessonBlockView({
  block,
  selected,
  onSelect,
}: {
  block: LessonBlock;
  selected: number | undefined;
  onSelect: (v: number) => void;
}) {
  const uiText = useInterfaceText();

  if (block.kind === "heading")
    return <h2 className="mb-4 mt-10 text-2xl font-semibold first:mt-0">{block.text}</h2>;
  if (block.kind === "paragraph")
    return (
      <p
        className="mb-5 whitespace-pre-wrap break-words text-lg leading-8 text-foreground/85"
        style={{
          fontWeight: block.format?.bold ? 700 : 400,
          fontStyle: block.format?.italic ? "italic" : "normal",
          textDecoration: block.format?.underline ? "underline" : "none",
          textAlign: block.format?.align ?? "left",
        }}
      >
        {block.text}
      </p>
    );
  if (block.kind === "list")
    return (
      <ul className="mb-6 grid gap-3">
        {block.items.map((x) => (
          <li key={x} className="flex gap-3 text-lg">
            <Check className="mt-1 size-5 shrink-0 text-success" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    );
  if (block.kind === "callout")
    return (
      <aside
        className={cn(
          "my-7 border-l-4 p-5",
          block.tone === "warning"
            ? "border-warning bg-warning-soft"
            : block.tone === "tip"
              ? "border-success bg-success-soft"
              : "border-violet bg-violet-soft",
        )}
      >
        <strong className="flex items-center gap-2">
          <Lightbulb className="size-5" />
          {block.title}
        </strong>
        <p className="mt-2">{block.text}</p>
      </aside>
    );
  if (block.kind === "example")
    return (
      <aside className="my-7 rounded-xl border bg-muted p-5">
        <span className="meta text-violet">{uiText("Example")}</span>
        <h3 className="mt-2 font-semibold">{block.title}</h3>
        <p className="mt-2">{block.text}</p>
      </aside>
    );
  const answered = selected !== undefined;
  return (
    <section className="my-8 rounded-xl border border-violet/30 p-5">
      <p className="meta text-violet">{uiText("Mini knowledge check")}</p>
      <h3 className="mt-3 text-lg font-semibold">{block.question}</h3>
      <div className="mt-4 grid gap-2">
        {block.options.map((o, i) => (
          <button
            key={o}
            onClick={() => !answered && onSelect(i)}
            disabled={answered}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-left text-sm",
              selected === i && "border-violet bg-violet-soft",
              answered && i === block.correctIndex && "border-success bg-success-soft",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && (
        <p className="mt-4 flex gap-2 text-sm" aria-live="polite">
          {selected === block.correctIndex ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" />
          ) : (
            <XCircle className="size-5 shrink-0 text-destructive" />
          )}
          <span>
            <strong>
              {selected === block.correctIndex ? "Correct." : "The safer answer is highlighted."}
            </strong>{" "}
            {block.explanation}
          </span>
        </p>
      )}
    </section>
  );
}
