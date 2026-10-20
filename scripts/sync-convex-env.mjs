/**
 * Copies every NVIDIA_* value from .env into the Convex deployment so the
 * AI workflows running in Convex can reach NVIDIA NIM.
 *
 * Usage:
 *   npm run env:sync
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (!existsSync(envPath)) {
  console.error("No .env file found. Copy .env.example to .env and add NVIDIA_API_KEY.");
  process.exit(1);
}

const entries = [];
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  const [, key, rawValue] = match;
  if (!key.startsWith("NVIDIA_")) continue;
  const value = rawValue.replace(/^["']|["']$/g, "").trim();
  if (!value) {
    console.warn(`skip ${key}: empty`);
    continue;
  }
  entries.push([key, value]);
}

if (entries.length === 0) {
  console.error("No NVIDIA_* values found in .env. Add NVIDIA_API_KEY first.");
  process.exit(1);
}

for (const [key, value] of entries) {
  console.log(`→ convex env set ${key}`);
  const result = spawnSync("npx", ["convex", "env", "set", key, value], {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`Failed to set ${key}`);
    process.exitCode = 1;
  }
}

console.log("Done. Redeploy the app so the new env is used.");
