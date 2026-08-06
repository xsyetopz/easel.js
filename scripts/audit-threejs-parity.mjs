#!/usr/bin/env bun
/**
 * Three.js Example Parity Audit
 *
 * This script compares EASEL.js examples with three.js examples
 * to classify each as CPU-compatible (in scope) or GPU-only (out of scope).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

// Paths
const EASEL_EXAMPLES_ROOT = "www/examples";
const THREE_EXAMPLES_ROOT = "node_modules/three/examples/jsm";

// GPU-only patterns and categories
const GPU_PATTERNS = [
  /\beffects\b/u,
  /\bshaders\b/u,
  /\btsl\b/u,
  /\bcsm\b/u,
  /\bbloom\b/u,
  /\bpostprocessing\b/u,
  /\bxr\b/u,
  /\bwebxr\b/u,
  /\bgpgpu\b/u,
  /\bwebgpu\b/u,
];

// GPU-only reasons
const GPU_REASONS = [
  "GPU shader programs",
  "Post-processing pipelines",
  "WebXR devices and sessions",
  "GPGPU compute shaders",
  "WebGPU rendering",
];

// CPU-compatible categories that are generally safe
const CPU_CATEGORIES = [
  "animation",
  "controls",
  "geometries",
  "materials",
  "scene",
  "texture",
  "lighting",
  "lights",
  "lines",
  "loaders",
  "math",
  "misc",
  "modififiers",
  "physics",
  "audio",
  "css",
  "svg",
  "games",
  "exporters",
];

/**
 * Check if path matches GPU-only patterns
 */
function isGPUOnly(filePath) {
  const lowerPath = filePath.toLowerCase();
  return (
    GPU_PATTERNS.some((pattern) => pattern.test(lowerPath)) ||
    lowerPath.includes("halftone") ||
    lowerPath.includes("drawing") || // Drawing isn't guaranteed GPU-only
    lowerPath.includes("fbos")
  );
}

/**
 * Get classification reason
 */
function classifyGPU(filePath) {
  const lowerPath = filePath.toLowerCase();
  for (let i = 0; i < GPU_PATTERNS.length; i++) {
    if (GPU_PATTERNS[i].test(lowerPath)) {
      return GPU_REASONS[i] || "GPU feature";
    }
  }
  return "Unknown GPU feature";
}

/**
 * Walk and classify examples
 */
function walkAndClassify(rootPath, label) {
  if (!existsSync(rootPath)) {
    console.error(`❌ Directory not found: ${rootPath}`);
    return [];
  }

  const results = [];
  const entries = readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkAndClassify(filePath, label));
    } else if (entry.name.endsWith(".js")) {
      const gpuOnly = isGPUOnly(filePath);
      const reason = gpuOnly ? classifyGPU(filePath) : "";
      results.push({
        category: label,
        path: filePath.replace(rootPath + "/", ""),
        gpuOnly,
        reason,
        basename: entry.name,
      });
    }
  }

  return results;
}

/**
 * Extract meta.id from EASEL example
 */
function extractMetaId(content) {
  const match = content.match(/id:\s*["']([^"']+)["']/u);
  return match ? match[1] : null;
}

/**
 * Read a file's content
 */
function readFileContent(filePath) {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
  } catch {
    return "";
  }
}

/**
 * Main audit function
 */
function audit(threeJsResults) {
  console.log("=== Three.js Example Parity Audit ===\n");

  // Group results by GPU status
  const gpuExamples = threeJsResults.filter((r) => r.gpuOnly);
  const cpuExamples = threeJsResults.filter((r) => !r.gpuOnly);
  const unknownGPU = gpuExamples.filter((r) => !r.reason);

  console.log("📊 Summary:");
  console.log(`   • GPU-only examples: ${gpuExamples.length}`);
  console.log(`   • CPU-compatible examples: ${cpuExamples.length}`);
  console.log(`   • GPU only without reason: ${unknownGPU.length}\n`);

  if (cpuExamples.length > 0) {
    console.log("🟢 CPU-Compatible Examples (Top 20):");
    cpuExamples.slice(0, 20).forEach((ex, i) => {
      console.log(`   ${i + 1}. ${ex.category}/${ex.basename}: ID=${ex.path}`);
    });
  }

  if (gpuExamples.length > 0) {
    console.log("\n🚫 GPU-Only Examples (Top 20):");
    gpuExamples.slice(0, 20).forEach((ex, i) => {
      const reason = ex.reason || "Unknown";
      console.log(`   ${i + 1}. ${ex.category}/${ex.basename}: ${reason}`);
    });
  }

  return { cpuExamples, gpuExamples };
}

// Run audit and categorize
const allThreeJsExamples = walkAndClassify(THREE_EXAMPLES_ROOT, "threejs");
const { cpuExamples, gpuExamples } = audit(allThreeJsExamples);

// Export results for programmatic use
export { cpuExamples, gpuExamples };
