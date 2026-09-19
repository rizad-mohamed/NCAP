import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Heading2,
  Lightbulb,
  List,
  MessageSquareText,
  Plus,
  Text,
  Trash2,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import type { LessonBlock } from "@/data/types";
import { cn } from "@/lib/utils";
import { dashboardButton, dashboardField } from "@/components/common/dashboard-primitives";

const blockTypes = [
  { kind: "heading", label: "Heading", icon: Heading2 },
  { kind: "paragraph", label: "Paragraph", icon: Text },
  { kind: "list", label: "List", icon: List },
  { kind: "callout", label: "Callout", icon: Lightbulb },
  { kind: "example", label: "Example", icon: MessageSquareText },
  { kind: "check", label: "Knowledge check", icon: CircleHelp },
] as const;

function createBlock(kind: (typeof blockTypes)[number]["kind"]): LessonBlock {
  if (kind === "heading") return { kind, text: "Section heading" };
  if (kind === "paragraph") return { kind, text: "Add clear lesson content here." };
  if (kind === "list") return { kind, items: ["First point", "Second point"] };
  if (kind === "callout")
    return { kind, tone: "tip", title: "Helpful tip", text: "Add practical guidance." };
  if (kind === "example")
    return { kind, title: "Real-world example", text: "Describe the situation and response." };
  return {
    kind,
    question: "What is the safest response?",
    options: ["First answer", "Second answer"],
    correctIndex: 0,
    explanation: "Explain why this answer is correct.",
  };
}

export function LessonContentBuilder({
  blocks,
  onChange: commit,
}: {
  blocks: LessonBlock[];
  onChange: (blocks: LessonBlock[]) => void;
}) {
  const undoHistory = useRef<LessonBlock[][]>([]);
  const redoHistory = useRef<LessonBlock[][]>([]);
  const [revision, setRevision] = useState(0);
  const onChange = (next: LessonBlock[]) => {
    undoHistory.current = [...undoHistory.current.slice(-49), blocks];
    redoHistory.current = [];
    commit(next);
    setRevision(revision + 1);
  };
  const restore = (direction: "undo" | "redo") => {
    const from = direction === "undo" ? undoHistory : redoHistory;
    const to = direction === "undo" ? redoHistory : undoHistory;
    const next = from.current.pop();
    if (!next) return;
    to.current.push(blocks);
    commit(next);
    setRevision(revision + 1);
  };
  const update = (index: number, block: LessonBlock) =>
    onChange(blocks.map((value, blockIndex) => (blockIndex === index ? block : value)));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <fieldset className="min-w-0 overflow-hidden rounded-xl border bg-muted/30">
      <legend className="sr-only">Lesson content builder</legend>
      <div className="border-b bg-white p-3">
        <p className="text-sm font-semibold">Lesson content</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Build the page with familiar content controls. Blocks appear in this order for learners.
        </p>
        <div
          className="app-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
          role="toolbar"
          aria-label="Add lesson content"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
            );
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
                    buttons.length;
            event.preventDefault();
            buttons[next]?.focus();
          }}
        >
          {blockTypes.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              disabled={blocks.length >= 100}
              onClick={() => onChange([...blocks, createBlock(kind)])}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border-strong bg-white px-3 text-sm font-semibold shadow-sm hover:border-violet hover:bg-accent"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={dashboardButton.icon}
            aria-label="Undo content change"
            disabled={!undoHistory.current.length}
            onClick={() => restore("undo")}
          >
            <Undo2 />
          </button>
          <button
            type="button"
            className={dashboardButton.icon}
            aria-label="Redo content change"
            disabled={!redoHistory.current.length}
            onClick={() => restore("redo")}
          >
            <Redo2 />
          </button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {blocks.length} of 100 content blocks
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 p-3 md:p-4">
        {blocks.map((block, index) => (
          <section
            key={`${block.kind}-${index}`}
            className="min-w-0 rounded-xl border bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <strong className="text-sm capitalize">
                  {block.kind.replace("check", "knowledge check")}
                </strong>
              </div>
              <div className="flex gap-1" aria-label={`Actions for content block ${index + 1}`}>
                <button
                  type="button"
                  className={cn(dashboardButton.icon, "size-11 rounded-lg")}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move block ${index + 1} up`}
                >
                  <ArrowUp />
                </button>
                <button
                  type="button"
                  className={cn(dashboardButton.icon, "size-11 rounded-lg")}
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label={`Move block ${index + 1} down`}
                >
                  <ArrowDown />
                </button>
                <button
                  type="button"
                  className={cn(
                    dashboardButton.icon,
                    "size-11 rounded-lg text-destructive hover:border-destructive hover:text-destructive",
                  )}
                  onClick={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
                  aria-label={`Delete block ${index + 1}`}
                >
                  <Trash2 />
                </button>
              </div>
            </header>
            <div className="grid gap-3 p-4">
              <BlockFields block={block} index={index} onChange={(next) => update(index, next)} />
            </div>
          </section>
        ))}
        {blocks.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white p-8 text-center">
            <p className="font-semibold">This lesson has no content yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a content type from the toolbar to begin.
            </p>
            <button
              type="button"
              className={cn(dashboardButton.primary, "mt-4")}
              onClick={() => onChange([createBlock("paragraph")])}
            >
              <Plus /> Add paragraph
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}

function BlockFields({
  block,
  index,
  onChange,
}: {
  block: LessonBlock;
  index: number;
  onChange: (block: LessonBlock) => void;
}) {
  const id = `lesson-block-${index}`;
  if (block.kind === "heading")
    return (
      <label className="text-sm font-semibold">
        Heading text
        <input
          value={block.text}
          maxLength={160}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          className={dashboardField}
        />
      </label>
    );
  if (block.kind === "paragraph")
    return (
      <>
        <div
          role="group"
          aria-label={`Paragraph ${index + 1} formatting`}
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              { key: "bold", label: "Bold paragraph", icon: Bold },
              { key: "italic", label: "Italic paragraph", icon: Italic },
              { key: "underline", label: "Underline paragraph", icon: Underline },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={!!block.format?.[key]}
              className={cn(
                dashboardButton.icon,
                block.format?.[key] && "border-violet bg-accent text-violet",
              )}
              onClick={() =>
                onChange({ ...block, format: { ...block.format, [key]: !block.format?.[key] } })
              }
            >
              <Icon />
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm">
            Alignment
            <select
              aria-label="Paragraph alignment"
              className="min-h-11 rounded-lg border bg-white px-3"
              value={block.format?.align ?? "left"}
              onChange={(event) =>
                onChange({
                  ...block,
                  format: {
                    ...block.format,
                    align: event.target.value as "left" | "center" | "right",
                  },
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <span className="w-full text-xs text-muted-foreground">
            Formatting applies to this entire paragraph.
          </span>
        </div>
        <label className="text-sm font-semibold">
          Paragraph text
          <textarea
            value={block.text}
            maxLength={4000}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
            className="mt-1.5 min-h-32 w-full rounded-lg border bg-white p-3 text-base"
            style={{
              fontWeight: block.format?.bold ? 700 : 400,
              fontStyle: block.format?.italic ? "italic" : "normal",
              textDecoration: block.format?.underline ? "underline" : "none",
              textAlign: block.format?.align ?? "left",
            }}
          />
        </label>
      </>
    );
  if (block.kind === "list")
    return (
      <label className="text-sm font-semibold">
        List items (one per line)
        <textarea
          value={block.items.join("\n")}
          onChange={(event) => onChange({ ...block, items: event.target.value.split(/\r?\n/) })}
          className="mt-1.5 min-h-28 w-full rounded-lg border bg-white p-3 text-base"
        />
      </label>
    );
  if (block.kind === "callout")
    return (
      <>
        <label className="text-sm font-semibold">
          Callout style
          <select
            value={block.tone}
            onChange={(event) =>
              onChange({ ...block, tone: event.target.value as typeof block.tone })
            }
            className={dashboardField}
          >
            <option value="tip">Helpful tip</option>
            <option value="note">Important note</option>
            <option value="warning">Warning</option>
          </select>
        </label>
        <TitleAndText block={block} onChange={onChange} />
      </>
    );
  if (block.kind === "example") return <TitleAndText block={block} onChange={onChange} />;
  return (
    <>
      <label className="text-sm font-semibold">
        Question
        <input
          value={block.question}
          maxLength={300}
          onChange={(event) => onChange({ ...block, question: event.target.value })}
          className={dashboardField}
        />
      </label>
      <label className="text-sm font-semibold">
        Answer choices (one per line)
        <textarea
          id={`${id}-options`}
          value={block.options.join("\n")}
          onChange={(event) => {
            const options = event.target.value.split(/\r?\n/);
            onChange({
              ...block,
              options,
              correctIndex: Math.max(0, Math.min(block.correctIndex, options.length - 1)),
            });
          }}
          className="mt-1.5 min-h-28 w-full rounded-lg border bg-white p-3 text-base"
        />
      </label>
      <label className="text-sm font-semibold">
        Correct answer
        <select
          value={block.correctIndex}
          onChange={(event) => onChange({ ...block, correctIndex: Number(event.target.value) })}
          className={dashboardField}
        >
          {block.options.map((option, optionIndex) => (
            <option key={optionIndex} value={optionIndex}>
              {option.trim() || `Answer ${optionIndex + 1}`}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Answer explanation
        <textarea
          value={block.explanation}
          maxLength={1200}
          onChange={(event) => onChange({ ...block, explanation: event.target.value })}
          className="mt-1.5 min-h-24 w-full rounded-lg border bg-white p-3 text-base"
        />
      </label>
    </>
  );
}

function TitleAndText({
  block,
  onChange,
}: {
  block: Extract<LessonBlock, { kind: "callout" | "example" }>;
  onChange: (block: LessonBlock) => void;
}) {
  return (
    <>
      <label className="text-sm font-semibold">
        Title
        <input
          value={block.title}
          maxLength={120}
          onChange={(event) => onChange({ ...block, title: event.target.value })}
          className={dashboardField}
        />
      </label>
      <label className="text-sm font-semibold">
        Content
        <textarea
          value={block.text}
          maxLength={1500}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          className="mt-1.5 min-h-24 w-full rounded-lg border bg-white p-3 text-base"
        />
      </label>
    </>
  );
}
