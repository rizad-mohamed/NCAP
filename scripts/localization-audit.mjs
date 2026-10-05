import ts from "typescript";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Enumerate and optionally route static interface strings through the existing
// dictionaries. Never extracts or translates authored educational content.
const apply = process.argv.includes("--apply");
const catalogue = new Set();
let replacements = 0;
const attributes = new Set([
  "title",
  "description",
  "eyebrow",
  "placeholder",
  "aria-label",
  "label",
  "alt",
]);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
for (const path of [
  ...files("src/features"),
  ...files("src/components/common"),
  ...files("src/components/admin"),
  ...files("src/components/layout"),
].filter((p) => p.endsWith(".tsx") && !p.includes(".test."))) {
  const source = readFileSync(path, "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const functions = new Set();
  function component(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (
        ts.isFunctionDeclaration(parent) &&
        parent.name &&
        /^[A-Z]/.test(parent.name.text) &&
        parent.body
      )
        return parent;
    }
    return null;
  }
  function replace(node, text, expression) {
    if (!/[A-Za-z]{2}/.test(text) || /^(?:https?:|\/|data:)/.test(text)) return;
    catalogue.add(text);
    const owner = component(node);
    if (!apply || !owner || owner.body.getText(ast).includes("const uiText =")) return;
    functions.add(owner);
    edits.push({ start: node.getStart(ast), end: node.end, text: expression(text) });
  }
  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getFullText(ast);
      const text = raw.replace(/\s+/g, " ").trim();
      replace(
        node,
        text,
        (value) =>
          `${/^\s/.test(raw) ? " " : ""}{uiText(${JSON.stringify(value)})}${/\s$/.test(raw) ? " " : ""}`,
      );
    }
    if (
      ts.isJsxAttribute(node) &&
      attributes.has(node.name.getText(ast)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      replace(
        node.initializer,
        node.initializer.text,
        (value) => `{uiText(${JSON.stringify(value)})}`,
      );
    }
    if (
      ts.isCallExpression(node) &&
      /^toast\.(success|error|info|warning)$/.test(node.expression.getText(ast)) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      replace(
        node.arguments[0],
        node.arguments[0].text,
        (value) => `uiText(${JSON.stringify(value)})`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) continue;
  for (const owner of functions)
    edits.push({
      start: owner.body.getStart(ast) + 1,
      end: owner.body.getStart(ast) + 1,
      text: "\n  const uiText = useInterfaceText();\n",
    });
  edits.push({ start: 0, end: 0, text: 'import { useInterfaceText } from "@/lib/i18n";\n' });
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  writeFileSync(path, result);
  replacements += edits.length - functions.size - 1;
}
mkdirSync("docs/localization", { recursive: true });
if (apply)
  writeFileSync(
    "docs/localization/interface-catalogue.en.json",
    JSON.stringify([...catalogue].sort(), null, 2) + "\n",
  );
console.log(
  `Interface audit: ${catalogue.size} static strings; ${replacements} lookups added. Authored content excluded. Missing approved Sinhala/Tamil strings retain English.`,
);
