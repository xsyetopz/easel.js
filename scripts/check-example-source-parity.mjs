import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const examplesRoot = "www/examples";
const jsFilePattern = /\.js$/;
const sourcePattern =
  /export const (easelSource|threeSource) = (`([\s\S]*?)`|undefined);/g;
const metaIdPattern =
  /export const meta\s*=\s*\{[\s\S]*?\bid:\s*["']([^"']+)["']/;
const adapterIdPattern = /export const threeAdapterId\s*=\s*meta\.id;/;
const noThreeReasonPattern = /export const noThreeReason =\s*"([^"]+)";/;
const commentPattern = /\/\/.*|\/\*[\s\S]*?\*\//g;
const whitespacePattern = /\s+/g;
const failures = [];

function normalizeComment(comment) {
  return comment
    .replaceAll("EASEL.js", "LIB")
    .replaceAll("THREE.js", "LIB")
    .replaceAll("EASEL", "LIB")
    .replaceAll("THREE", "LIB")
    .replace(whitespacePattern, " ")
    .trim();
}

function collectComments(source) {
  return Array.from(source.matchAll(commentPattern), ([comment]) =>
    normalizeComment(comment),
  );
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!jsFilePattern.test(path)) continue;
    const source = await readFile(path, "utf8");
    const metaId = source.match(metaIdPattern)?.[1];
    const sources = {};
    for (const match of source.matchAll(sourcePattern)) {
      sources[match[1]] = match[2] === "undefined" ? undefined : match[3];
    }
    if (!("easelSource" in sources)) continue;
    if (!metaId) {
      failures.push(`${path}: missing meta.id for source correspondence`);
      continue;
    }
    if (!("threeSource" in sources)) {
      failures.push(`${path}: missing threeSource export`);
      continue;
    }
    if (sources.threeSource === undefined) {
      const reason = source.match(noThreeReasonPattern)?.[1]?.trim();
      if (!reason) failures.push(`${path}: missing noThreeReason`);
      continue;
    }

    if (!sources.easelSource?.toLowerCase().includes("easel")) {
      failures.push(`${path}: easelSource does not identify EASEL.js code`);
    }
    if (!sources.threeSource.toLowerCase().includes("three")) {
      failures.push(`${path}: threeSource does not identify THREE.js code`);
    }
    if (adapterIdPattern.test(source) && !source.includes(`id: "${metaId}"`)) {
      failures.push(
        `${path}: threeAdapterId must refer to the module's exact meta.id`,
      );
    }

    const easelComments = collectComments(sources.easelSource);
    const threeComments = collectComments(sources.threeSource);
    if (easelComments.length !== threeComments.length) {
      failures.push(
        `${path}: comment count ${easelComments.length} vs ${threeComments.length}`,
      );
      continue;
    }
    for (let i = 0; i < easelComments.length; i++) {
      if (easelComments[i] !== threeComments[i]) {
        failures.push(
          `${path}: comment ${i + 1} differs: ${easelComments[i]} vs ${threeComments[i]}`,
        );
      }
    }
  }
}

await walk(examplesRoot);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
