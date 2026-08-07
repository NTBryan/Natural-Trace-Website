#!/usr/bin/env node
/**
 * Does the admin panel actually let someone edit the site?
 *
 * The health check verifies the site builds. This verifies the CMS is honest
 * about what it can change, which is a different failure and a quieter one: a
 * field that is in the data file but not in the panel looks editable right up
 * until someone tries, and then it needs a developer.
 *
 * Two directions, both of which matter:
 *
 *   MISSING   the panel offers a field the data file does not have. Saving in
 *             the panel would add a key nothing reads, or wipe one that is read
 *             under a different name. This is a real bug and exits non-zero.
 *
 *   UNEXPOSED the data file has a key the panel does not offer. Changing it
 *             needs a developer. Sometimes deliberate, often just forgotten.
 *             Reported, does not fail, because plenty of keys should not be
 *             edited casually.
 *
 * Usage: node scripts/cms-audit.mjs [--strict]
 *        --strict also fails on unexposed keys.
 */
import { readFileSync, existsSync } from "node:fs";
import yaml from "js-yaml";

const STRICT = process.argv.includes("--strict");
const cfg = yaml.load(readFileSync("src/admin/config.yml", "utf8"));

/* Kept out of the panel deliberately. Each one needs a reason, so that
   "not editable" is a decision on the record rather than something forgotten. */
const DELIBERATE = {
  "src/_data/site.yml": {
    search_indexable:
      "Holds the whole site out of search. Flipping it publishes claims that " +
      "are still under review, so it should take a commit and a second pair of " +
      "eyes, not one click in a browser.",
  },
};

let missing = 0, unexposed = 0, deliberate = 0;

/* Field names the panel offers, flattened. An object widget nests; a list of
   objects describes each item, not a key of its own, so it stops there. */
const enumerated = new Set();   // object widgets that spell out their own fields
function offered(fields, prefix = "") {
  const out = [];
  for (const f of fields || []) {
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    out.push(path);
    if (f.widget === "object" && f.fields) {
      enumerated.add(path);
      out.push(...offered(f.fields, path));
    }
  }
  return out;
}

/* Keys the data file actually has, to the same depth. */
function present(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(path);
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...present(v, path));
  }
  return out;
}

for (const coll of cfg.collections || []) {
  for (const file of coll.files || []) {
    if (!existsSync(file.file)) {
      console.log(`MISSING FILE  ${file.file} (collection "${file.name}")`);
      missing++;
      continue;
    }
    const data = yaml.load(readFileSync(file.file, "utf8")) || {};
    enumerated.clear();
    const inPanel = new Set(offered(file.fields));
    const inFile = new Set(present(data));

    for (const f of inPanel) {
      if (!inFile.has(f)) { console.log(`MISSING    ${file.file}: panel offers "${f}", file has no such key`); missing++; }
    }
    for (const k of inFile) {
      // a nested key is covered if its parent object is offered
      if (inPanel.has(k)) continue;
      // A key is covered by its parent only when the parent is offered as a
      // whole. If the parent is an object widget that lists its own fields, the
      // panel is claiming to cover each one, so a child it never mentions is a
      // gap. Without this, jobTitle sat unexposed inside field_map for a day and
      // the audit reported everything clean.
      const parent = k.split(".").slice(0, -1).join(".");
      if (parent && inPanel.has(parent) && !enumerated.has(parent)) continue;
      const why = (DELIBERATE[file.file] || {})[k];
      if (why) { console.log(`BY DESIGN  ${file.file}: "${k}" — ${why}`); deliberate++; continue; }
      console.log(`UNEXPOSED  ${file.file}: "${k}" cannot be changed in the admin panel`);
      unexposed++;
    }
  }
}

console.log(`\n${missing} field(s) offered but absent, ${unexposed} key(s) not editable in the panel, ${deliberate} withheld on purpose`);
if (missing || (STRICT && unexposed)) process.exit(1);
