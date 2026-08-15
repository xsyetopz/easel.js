import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createAnimationBindingWorkload,
  createCurvePathWorkload,
  createRaycasterWorkload,
} from "./processing-workloads-a.mjs";
import {
  createGeometrySetupWorkload,
  createHelperControlsWorkload,
  createSkeletonSkinningWorkload,
} from "./processing-workloads-b.mjs";
import {
  createLoaderSetupWorkload,
  createTexturePreprocessWorkload,
} from "./processing-workloads-c.mjs";
import {
  createMeshGridWorkload,
  createSpriteBillboardWorkload,
  createTexturedFogWorkload,
  createTransparentOverdrawWorkload,
} from "./scene-workloads-a.mjs";
import {
  createHierarchyWorkload,
  createInstancedMeshWorkload,
} from "./scene-workloads-b.mjs";
import {
  createLayeredSortWorkload,
  createLightTypeSweepWorkload,
  createWireframeRasterWorkload,
} from "./scene-workloads-c.mjs";
import {
  createCanvasUploadWorkload,
  createFramebufferCaptureWorkload,
} from "./scene-workloads-d.mjs";
import { createPointCloudWorkload } from "./scene-workloads-e.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export function parseArgs(args) {
  const parsed = {
    entry: defaultEntry(),
    warmup: 60,
    samples: 40,
    frames: 5,
    workload: "all",
    jsonPath: "",
    profileTraversal: false,
    gcBetweenSamples: false,
    list: false,
    help: false,
  };
  for (const arg of args) parseArgument(parsed, arg);
  return parsed;
}

function parseArgument(parsed, arg) {
  if (arg === "--help" || arg === "-h") {
    parsed.help = true;
    return;
  }
  if (arg === "--list") {
    parsed.list = true;
    return;
  }
  if (arg === "--profile-traversal") {
    parsed.profileTraversal = true;
    return;
  }
  if (arg === "--gc") {
    parsed.gcBetweenSamples = true;
    return;
  }
  const eq = arg.indexOf("=");
  const key = eq === -1 ? arg : arg.slice(0, eq);
  const value = eq === -1 ? "" : arg.slice(eq + 1);
  switch (key) {
    case "--entry":
      parsed.entry = value;
      break;
    case "--warmup":
      parsed.warmup = parsePositiveInt(value, "warmup");
      break;
    case "--samples":
      parsed.samples = parsePositiveInt(value, "samples");
      break;
    case "--frames":
      parsed.frames = parsePositiveInt(value, "frames");
      break;
    case "--workload":
      parsed.workload = value || "all";
      break;
    case "--json":
      parsed.jsonPath = value;
      break;
    default:
      throw new Error(`Unknown argument '${arg}'. Run with --help.`);
  }
}

function parsePositiveInt(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return number;
}

function defaultEntry() {
  return globalThis.Bun === undefined ? "dist" : "src";
}

export async function loadEasel(entry) {
  let modulePath;
  if (entry === "src") {
    modulePath = resolve(repoRoot, "src/index.ts");
  } else if (entry === "dist") {
    modulePath = resolve(repoRoot, "dist/index.es.js");
    if (!existsSync(modulePath)) {
      throw new Error(
        "dist entry missing. Run `bun run build` first or use --entry=src under Bun.",
      );
    }
  } else {
    modulePath = resolve(repoRoot, entry);
  }
  return await import(pathToFileURL(modulePath).href);
}

export function createWorkloads(easel) {
  return [
    createMeshGridWorkload(easel),
    createTexturedFogWorkload(easel),
    createTransparentOverdrawWorkload(easel),
    createSpriteBillboardWorkload(easel),
    createPointCloudWorkload(easel),
    createHierarchyWorkload(easel),
    createInstancedMeshWorkload(easel),
    createLightTypeSweepWorkload(easel),
    createLayeredSortWorkload(easel),
    createWireframeRasterWorkload(easel),
    createCanvasUploadWorkload(easel),
    createFramebufferCaptureWorkload(easel),
    createAnimationBindingWorkload(easel),
    createRaycasterWorkload(easel),
    createCurvePathWorkload(easel),
    createSkeletonSkinningWorkload(easel),
    createGeometrySetupWorkload(easel),
    createHelperControlsWorkload(easel),
    createLoaderSetupWorkload(easel),
    createTexturePreprocessWorkload(easel),
  ];
}
