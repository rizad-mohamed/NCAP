import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Reports locations/categories only. Never print matching values or history patches.
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Supabase privileged key", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ["Supabase management token", /\bsbp_[a-f0-9]{40,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}/],
  ["AWS key", /\bAKIA[0-9A-Z]{16}\b/],
];
const privileged = new Set();
for (const file of readdirSync(".").filter((name) => /^\.env.*\.local$/.test(name))) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(
      /^([A-Z_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE)[A-Z_]*)=(.*)$/,
    );
    if (match) {
      const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
      if (value.length >= 16 && !/^(your-|example|placeholder)/i.test(value)) privileged.add(value);
    }
  }
}
const findings = [];
function inspect(text, location) {
  for (const [name, pattern] of patterns)
    if (pattern.test(text)) findings.push(`${location}: ${name}`);
  for (const value of privileged)
    if (text.includes(value)) findings.push(`${location}: configured privileged credential`);
  for (const token of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      if (
        JSON.parse(Buffer.from(token[0].split(".")[1], "base64url").toString()).role ===
        "service_role"
      )
        findings.push(`${location}: service-role JWT`);
    } catch {
      /* A non-JWT string is not evidence of a privileged key. */
    }
  }
}
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split(/\r?\n/);
for (const file of files) {
  if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example")
    findings.push(`${file}: tracked environment file`);
  if (existsSync(file)) inspect(readFileSync(file, "utf8"), file);
}
const history = execFileSync("git", ["log", "--all", "-p", "--no-ext-diff", "--format=commit %H"], {
  encoding: "utf8",
  maxBuffer: 128 * 1024 * 1024,
});
inspect(history, "reachable Git history");
let buildFiles = 0;
function scanBuild(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scanBuild(path);
    else if (/\.(?:js|mjs|cjs|json|html|css|map|txt)$/.test(entry.name)) {
      inspect(readFileSync(path, "utf8"), path);
      buildFiles++;
    }
  }
}
scanBuild(".output");
if (!buildFiles) findings.push("Production build: no generated files available to scan");
if (findings.length) {
  console.error([...new Set(findings)].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Extended secret review passed: ${files.length} tracked files, reachable history, ${buildFiles} build files; ${privileged.size} local privileged values checked without disclosure.`,
  );
