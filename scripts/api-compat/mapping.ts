import { readFileSync } from "node:fs";
import type {
  ApiManifest,
  CompatibilityMapping,
  MappingEntry,
  SemanticStatus,
  SurfaceId,
} from "./types.ts";
import { SEMANTIC_STATUSES } from "./types.ts";

const SURFACES = new Set<SurfaceId>([
  "three-core",
  "three-addons",
  "three-webgpu",
  "three-tsl",
]);

export function parseMapping(value: unknown): CompatibilityMapping {
  if (!value || typeof value !== "object") {
    throw new Error("Compatibility mapping must be an object");
  }
  const candidate = value as { schemaVersion?: unknown; mappings?: unknown };
  if (candidate.schemaVersion !== 1) {
    throw new Error("Unsupported compatibility mapping schemaVersion");
  }
  if (!Array.isArray(candidate.mappings)) {
    throw new Error("Compatibility mapping mappings must be an array");
  }
  const mappings: MappingEntry[] = candidate.mappings.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Mapping ${index} must be an object`);
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item["source"] !== "string" ||
      !item["source"].startsWith("easel:")
    ) {
      throw new Error(`Mapping ${index} has invalid source`);
    }
    if (
      item["target"] !== undefined &&
      (typeof item["target"] !== "string" ||
        !/^three-(core|addons|webgpu|tsl):[^:]+$/u.test(item["target"]))
    ) {
      throw new Error(`Mapping ${index} has invalid target`);
    }
    if (
      typeof item["status"] !== "string" ||
      !(SEMANTIC_STATUSES as readonly string[]).includes(item["status"])
    ) {
      throw new Error(`Mapping ${index} has invalid status`);
    }
    if (
      !Array.isArray(item["notes"]) ||
      item["notes"].some((note) => typeof note !== "string")
    ) {
      throw new Error(`Mapping ${index} notes must be strings`);
    }
    if (item["status"] === "easel-only" && item["target"] !== undefined) {
      throw new Error(
        `Mapping ${index} easel-only entries cannot have a target`,
      );
    }
    if (item["status"] !== "easel-only" && item["target"] === undefined) {
      throw new Error(
        `Mapping ${index} requires a target for status ${item["status"]}`,
      );
    }
    return {
      source: item["source"],
      ...(typeof item["target"] === "string" ? { target: item["target"] } : {}),
      status: item["status"] as SemanticStatus,
      notes: [...item["notes"]],
    };
  });
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping.source)) {
      throw new Error(`Duplicate mapping source: ${mapping.source}`);
    }
    seen.add(mapping.source);
  }
  mappings.sort((a, b) => a.source.localeCompare(b.source));
  return { schemaVersion: 1, mappings };
}

export function readMapping(path: string): CompatibilityMapping {
  return parseMapping(JSON.parse(readFileSync(path, "utf8")));
}

export function validateMappingAgainstManifests(
  mapping: CompatibilityMapping,
  easel: ApiManifest,
  threeSurfaces: ApiManifest[],
): void {
  const easelIds = new Set(easel.symbols.map((symbol) => symbol.id));
  const mappedEaselIds = new Set(mapping.mappings.map((entry) => entry.source));
  const missingSources = [...easelIds]
    .filter((id) => !mappedEaselIds.has(id))
    .sort((a, b) => a.localeCompare(b));
  if (missingSources.length > 0) {
    throw new Error(
      `Compatibility mapping is missing EASEL symbols: ${missingSources.join(", ")}`,
    );
  }
  const targetSymbols = new Map<string, ApiManifest>();
  for (const manifest of threeSurfaces) {
    for (const symbol of manifest.symbols) {
      targetSymbols.set(symbol.id, manifest);
    }
  }
  for (const entry of mapping.mappings) {
    if (!easelIds.has(entry.source)) {
      throw new Error(
        `Mapping source does not exist in EASEL manifest: ${entry.source}`,
      );
    }
    if (!entry.target) {
      continue;
    }
    const surface = entry.target.split(":", 1)[0] as SurfaceId;
    if (!SURFACES.has(surface)) {
      throw new Error(`Mapping target uses unknown surface: ${entry.target}`);
    }
    if (!targetSymbols.has(entry.target)) {
      throw new Error(
        `Mapping target does not exist in three.js manifests: ${entry.target}`,
      );
    }
  }
}
