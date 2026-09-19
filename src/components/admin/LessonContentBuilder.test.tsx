import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { LessonBlock } from "@/data/types";
import { LessonContentBuilder } from "./LessonContentBuilder";

afterEach(cleanup);

function Editor() {
  const [blocks, setBlocks] = useState<LessonBlock[]>([
    { kind: "paragraph", text: "Original lesson" },
  ]);
  return <LessonContentBuilder blocks={blocks} onChange={setBlocks} />;
}

it("adds, reorders, removes and restores blocks without JSON", () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Heading" }));
  expect(screen.getByLabelText("Heading text")).toHaveValue("Section heading");
  fireEvent.click(screen.getByRole("button", { name: "Move block 2 up" }));
  expect(screen.getAllByRole("textbox")[0]).toHaveValue("Section heading");
  fireEvent.click(screen.getByRole("button", { name: "Delete block 1" }));
  expect(screen.queryByLabelText("Heading text")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Undo content change" }));
  expect(screen.getByLabelText("Heading text")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Redo content change" }));
  expect(screen.queryByLabelText("Heading text")).not.toBeInTheDocument();
});

it("formats paragraphs while preserving literal text", () => {
  render(<Editor />);
  const text = screen.getByLabelText("Paragraph text");
  fireEvent.change(text, { target: { value: '<script>alert("plain text")</script>' } });
  fireEvent.click(screen.getByRole("button", { name: "Bold paragraph" }));
  fireEvent.click(screen.getByRole("button", { name: "Italic paragraph" }));
  fireEvent.change(screen.getByLabelText("Paragraph alignment"), { target: { value: "center" } });
  expect(text).toHaveStyle({ fontWeight: "700", fontStyle: "italic", textAlign: "center" });
  expect(text).toHaveValue('<script>alert("plain text")</script>');
  expect(document.querySelector("fieldset script")).toBeNull();
});
