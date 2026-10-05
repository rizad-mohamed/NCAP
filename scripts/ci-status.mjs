import { execFileSync } from "node:child_process";
const sha =
  process.argv[2] ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("A full commit SHA is required.");
const url = `https://api.github.com/repos/rizad-mohamed/NCAP/actions/runs?head_sha=${sha}&per_page=10`;
const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`GitHub CI read failed (${response.status}).`);
const result = await response.json();
console.log(
  JSON.stringify(
    result.workflow_runs.map((run) => ({
      id: run.id,
      sha: run.head_sha,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    })),
    null,
    2,
  ),
);
