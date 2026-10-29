#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { emptyPlaceIdMap, reconcilePlaceIds, validatePlaceIdMap } from "./place-id-core.mjs";

const root = process.cwd();
const dir = resolve(root, "data/explore/nepal");
const mappingPath = resolve(dir, "place-id-map.json");

async function sourceIds(path) {
  const file = JSON.parse(await readFile(path, "utf8"));
  const i = file.fields.indexOf("osm_id");
  if (i < 0) throw new Error(path + " has no osm_id field");
  const ids = file.rows.map((r) => r[i]).filter(Boolean);
  if (ids.length !== file.rows.length) throw new Error(path + " has rows without osm_id");
  return ids;
}

const ids = [
  ...(await sourceIds(resolve(dir, "osm-pois.json"))),
  ...(await sourceIds(resolve(dir, "osm-settlements.json"))),
];
const current = existsSync(mappingPath) ? JSON.parse(await readFile(mappingPath, "utf8")) : emptyPlaceIdMap();
const next = reconcilePlaceIds(current, ids);
const errors = validatePlaceIdMap(next);
if (errors.length) throw new Error(errors.join("\n"));
await writeFile(mappingPath, JSON.stringify(next, null, 2) + "\n");
console.log("place-id map:", Object.keys(next.entries).length, "source IDs");
