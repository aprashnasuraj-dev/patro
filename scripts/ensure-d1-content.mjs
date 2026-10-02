import { spawnSync } from "node:child_process";

function commandResult(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }
  return result;
}

function extractRowCount(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractRowCount(item);
      if (found !== null) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(value, "row_count")) {
    const count = Number(value.row_count);
    return Number.isFinite(count) ? count : null;
  }
  for (const child of Object.values(value)) {
    const found = extractRowCount(child);
    if (found !== null) return found;
  }
  return null;
}

export function remoteContentRowCount(config = "wrangler.jsonc") {
  const query = "SELECT COUNT(*) AS row_count FROM content_records;";
  const result = commandResult("npx", [
    "wrangler", "d1", "execute", "DB", "--remote",
    "--command", query,
    "--json",
    "--config", config,
  ]);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "null");
  } catch (error) {
    throw new Error(`Unable to parse Wrangler D1 count output as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const count = extractRowCount(parsed);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Wrangler D1 count output did not contain a valid non-negative row_count.");
  }
  return count;
}

export function ensureRemoteD1Content({ config = "wrangler.jsonc", snapshot = ".cloudflare/d1-import/content-snapshot.sql" } = {}) {
  const before = remoteContentRowCount(config);
  if (before > 0) {
    console.log(`[d1] Existing populated database detected (${before} content_records rows). Seed import skipped.`);
    return { seeded: false, before, after: before };
  }

  console.log("[d1] Fresh database detected (0 content_records rows). Importing canonical content snapshot once.");
  commandResult("npx", [
    "wrangler", "d1", "execute", "DB", "--remote",
    `--file=${snapshot}`,
    "--yes",
    "--config", config,
  ], { stdio: "inherit", encoding: undefined });

  const after = remoteContentRowCount(config);
  if (after <= 0) throw new Error("Fresh D1 seed completed without producing any content_records rows.");
  console.log(`[d1] Fresh database seed verified (${after} content_records rows).`);
  return { seeded: true, before, after };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const config = process.argv[2] || "wrangler.jsonc";
  try {
    ensureRemoteD1Content({ config });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
