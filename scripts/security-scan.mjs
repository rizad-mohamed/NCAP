import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !/^(node_modules|\.output|dist|public\/images|public\/posters)\//.test(file))
  .filter((file) => !/\.(ico|png|jpe?g|webp|woff2?|lock)$/i.test(file));

const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9_]{30,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  [
    "Supabase service-role assignment",
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`]?(?!your-|example|placeholder)[A-Za-z0-9._-]{20,}/i,
  ],
  ["hard-coded bearer token", /Authorization\s*[:=]\s*["'`]Bearer\s+[A-Za-z0-9._-]{20,}/i],
];

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const [name, pattern] of rules) {
    if (pattern.test(text)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length) {
  console.error(`Potential secrets found:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} text files checked).`);
