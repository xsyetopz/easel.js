import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsRoot = path.join(repoRoot, "www", "astro", "content", "docs", "docs");
const compatibilityPaths = [
  "compatibility.json",
  "compatibility-three-addons.json",
  "compatibility-three-webgpu.json",
  "compatibility-three-tsl.json",
].map((name) => path.join(repoRoot, "api-compat", "generated", name));
const compatibilityPath = compatibilityPaths.join(", ");

const { docCategories, docClasses } = await import("../www/docs/classes.ts");
const { validateCompatibilityReport } = await import(
  "./api-compat/validate.ts"
);

const compatibilityStatuses = new Set([
  "exact",
  "shape-compatible",
  "adapted",
  "partial",
  "conceptual",
  "unsupported",
  "easel-only",
  "unknown",
]);
const mappedStatuses = new Set([
  "exact",
  "shape-compatible",
  "adapted",
  "partial",
  "conceptual",
  "unsupported",
]);
const surfaces = new Set([
  "easel",
  "three-core",
  "three-addons",
  "three-webgpu",
  "three-tsl",
]);

function compatibilityError(message) {
  return new Error(
    `Invalid API compatibility data (${compatibilityPath}): ${message}`,
  );
}

function assertString(value, field, index) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw compatibilityError(
      `mappings[${index}].${field} must be a non-empty string`,
    );
  }
}

function validateMapping(mapping, index) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    throw compatibilityError(`mappings[${index}] must be an object`);
  }
  if (
    !mapping.source ||
    typeof mapping.source !== "object" ||
    Array.isArray(mapping.source)
  ) {
    throw compatibilityError(`mappings[${index}].source must be an object`);
  }
  assertString(mapping.source.id, "source.id", index);
  assertString(mapping.source.name, "source.name", index);
  if (mapping.source.surface !== "easel") {
    throw compatibilityError(`mappings[${index}].source.surface must be easel`);
  }
  if (!compatibilityStatuses.has(mapping.status)) {
    throw compatibilityError(
      `mappings[${index}].status must be one of ${[...compatibilityStatuses].join(", ")}`,
    );
  }
  if (mapping.target === null) {
    throw compatibilityError(
      `mappings[${index}].target must be omitted when absent`,
    );
  }
  const hasTarget = mapping.target !== undefined;
  if (hasTarget) {
    if (typeof mapping.target !== "object" || Array.isArray(mapping.target)) {
      throw compatibilityError(
        `mappings[${index}].target must be an object when present`,
      );
    }
    assertString(mapping.target.id, "target.id", index);
    assertString(mapping.target.name, "target.name", index);
    if (!surfaces.has(mapping.target.surface)) {
      throw compatibilityError(
        `mappings[${index}].target.surface must be one of ${[...surfaces].join(", ")}`,
      );
    }
  } else if (mappedStatuses.has(mapping.status)) {
    throw compatibilityError(
      `mappings[${index}] declares status ${mapping.status} but has no target`,
    );
  }
  if (
    !Array.isArray(mapping.notes) ||
    mapping.notes.some((note) => typeof note !== "string")
  ) {
    throw compatibilityError(
      `mappings[${index}].notes must be an array of strings`,
    );
  }
}

async function loadCompatibility() {
  const reports = [];
  for (const reportPath of compatibilityPaths) {
    let data;
    try {
      data = JSON.parse(await readFile(reportPath, "utf8"));
      validateCompatibilityReport(data);
    } catch (error) {
      throw new Error(
        `API compatibility data is required and must be valid: ${reportPath}. Run the API compatibility generator first.`,
        { cause: error },
      );
    }
    data.comparisons.forEach(validateMapping);
    reports.push(data);
  }
  const bySourceName = new Map();
  for (const report of reports) {
    for (const mapping of report.comparisons) {
      const sourceName = mapping.source.name;
      const previous = bySourceName.get(sourceName);
      if (previous && previous.source.id !== mapping.source.id) {
        throw compatibilityError(
          `source name ${sourceName} is ambiguous (${previous.source.id}, ${mapping.source.id})`,
        );
      }
      if (
        !previous ||
        (previous.status === "unknown" && mapping.status !== "unknown")
      ) {
        bySourceName.set(sourceName, mapping);
      }
    }
  }
  return bySourceName;
}

const compatibilityBySourceName = await loadCompatibility();

for (const doc of docClasses) {
  for (const field of ["threeEquivalent", "divergence"]) {
    if (Object.hasOwn(doc, field)) {
      throw compatibilityError(
        `${doc.name} contains removed legacy metadata ${field}; compatibility data belongs in the generated report`,
      );
    }
  }
  const mapping = compatibilityBySourceName.get(doc.name);
  if (!mapping) {
    throw compatibilityError(
      `no mapping exists for documented EASEL symbol ${doc.name}; add an explicit easel-only or unknown record`,
    );
  }
  const expectedSourceId = `easel:${doc.id}`;
  if (mapping.source.id !== expectedSourceId) {
    throw compatibilityError(
      `mapping for ${doc.name} has source id ${mapping.source.id}; expected ${expectedSourceId}`,
    );
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function escapeYamlString(value) {
  return JSON.stringify(String(value));
}

function yamlValue(value, indent = "") {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return [
      "",
      ...Object.entries(value).map(
        ([key, nestedValue]) =>
          `${indent}  ${key}: ${yamlValue(nestedValue, `${indent}  `)}`,
      ),
    ].join("\n");
  }
  return escapeYamlString(value);
}

function frontMatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${yamlValue(value)}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}\n`;
}

function escapeMdxText(value) {
  return String(value).replace(/[{}]/gu, "\\$&");
}

function escapeTable(value) {
  return escapeMdxText(value)
    .replace(/\|/gu, "\\|")
    .replace(/\n/gu, " ")
    .replace(/`/gu, "\\`");
}

function escapeTableCode(value) {
  return String(value)
    .replace(/\|/gu, "\\|")
    .replace(/\n/gu, " ")
    .replace(/`/gu, "\\`");
}

function code(value) {
  return `\`${escapeTableCode(value)}\``;
}

function displayThreeSymbol(target) {
  if (!target) {
    return "";
  }
  if (target.name.startsWith("THREE.")) {
    return target.name;
  }
  return `THREE.${target.name}`;
}

function compatibilitySummary(mapping) {
  const members = mapping.structural?.members;
  if (!members) {
    return "No structural member summary was generated.";
  }
  return [
    `${members.matched} matched`,
    `${members.changed.length} changed`,
    `${members.missingInTarget.length} missing`,
    `${members.extraInTarget.length} extra`,
  ].join(", ");
}

function compatibilityMarkdown(mapping) {
  if (mapping.status === "easel-only") {
    return [
      "**THREE.js equivalent:** None (EASEL-only)",
      "",
      "**Compatibility:** `easel-only`",
      "",
    ];
  }
  if (mapping.status === "unknown") {
    const target = mapping.target
      ? ` Proposed target: ${code(displayThreeSymbol(mapping.target))}`
      : "";
    return [
      `**THREE.js equivalent:** Not reviewed.${target}`,
      "",
      "**Compatibility:** `unknown`",
      "",
    ];
  }

  const lines = [
    `**THREE.js equivalent:** ${code(displayThreeSymbol(mapping.target))}`,
    "",
    `**Compatibility:** ${code(mapping.status)}`,
    `**Member comparison:** ${compatibilitySummary(mapping)}`,
    "",
  ];
  if (mapping.notes.length > 0) {
    lines.push(
      "**Notes**",
      ...mapping.notes.map((note) => `- ${escapeMdxText(note)}`),
      "",
    );
  }
  const structural = mapping.structural;
  const changes = [];
  if (structural?.constructors?.changed?.length) {
    changes.push(
      `${structural.constructors.changed.length} constructor overload(s) differ.`,
    );
  }
  if (structural?.callSignatures?.changed?.length) {
    changes.push(
      `${structural.callSignatures.changed.length} call signature(s) differ.`,
    );
  }
  for (const member of structural?.members?.changed ?? []) {
    if (member.signatureChanges?.length) {
      changes.push(
        `${member.key}: ${member.signatureChanges.length} signature overload(s) differ.`,
      );
    }
  }
  if (changes.length > 0) {
    lines.push(
      "**Signature differences**",
      ...changes.map((change) => `- ${escapeMdxText(change)}`),
      "",
    );
  }
  return lines;
}

function docToMarkdown(doc, sidebarOrder, mapping) {
  const parts = [
    frontMatter({
      title: doc.name,
      description: doc.description,
      sidebar: {
        order: sidebarOrder,
        label: doc.name,
      },
    }),
    "```ts",
    doc.signature,
    "```\n",
    ...compatibilityMarkdown(mapping),
    escapeMdxText(doc.description),
    "",
  ];

  if (doc.properties.length > 0) {
    parts.push(
      "## Properties\n",
      "| Name | Type | Description |",
      "| --- | --- | --- |",
    );
    for (const property of doc.properties) {
      parts.push(
        `| ${code(property.name)} | ${code(property.type)} | ${escapeTable(property.description)} |`,
      );
    }
    parts.push("");
  }

  if (doc.methods.length > 0) {
    parts.push("## Methods\n", "| Method | Description |", "| --- | --- |");
    for (const method of doc.methods) {
      parts.push(
        `| ${code(method.signature)} | ${escapeTable(method.description)} |`,
      );
    }
    parts.push("");
  }

  // Empty strings are intentional Markdown blank lines. Filtering them out
  // joins headings, paragraphs, and tables into one structural block.
  return `${parts.join("\n")}\n`;
}

await rm(docsRoot, { recursive: true, force: true });
await mkdir(docsRoot, { recursive: true });

await writeFile(
  path.join(docsRoot, "index.md"),
  `${frontMatter({
    title: "EASEL.js API Reference",
    description:
      "TypeScript API reference for EASEL.js classes, constructors, properties, and methods.",
    sidebar: {
      order: 1,
      label: "Overview",
    },
  })}Browse EASEL.js classes by renderer area. Each page lists the constructor signature, generated THREE.js compatibility status, structural member summary, semantic notes, properties, and methods.\n\n## Packages\n\n\`@xsyetopz/easel\` is available from npm and JSR.\n`,
);

for (const category of docCategories) {
  const docs = docClasses.filter((doc) => doc.category === category);
  if (docs.length === 0) {
    continue;
  }

  const dir = path.join(docsRoot, slugify(category));
  await mkdir(dir, { recursive: true });

  let sidebarOrder = 1;
  for (const doc of docs) {
    await writeFile(
      path.join(dir, `${doc.id}.md`),
      docToMarkdown(doc, sidebarOrder, compatibilityBySourceName.get(doc.name)),
    );
    sidebarOrder += 1;
  }
}

console.log(`Generated ${docClasses.length} API docs.`);
