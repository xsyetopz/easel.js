import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { generateSourceDocs } from "../../scripts/generate-starlight-docs.ts";
import { CATEGORY_NAMES } from "../../scripts/starlight-docs/api-model.ts";
import { renderDocs } from "../../scripts/starlight-docs/markdown-rendering.ts";

const root = `${import.meta.dir}/../..`;

function generatedPages(): Map<string, string> {
  return generateSourceDocs();
}

describe("generate-starlight-docs", () => {
  it("generates one deterministic page for every eligible source export", () => {
    const first = generatedPages();
    const second = generatedPages();

    expect([...first]).toEqual([...second]);
    expect(first.size).toBeGreaterThan(300);
    const overview = first.get("index.md");
    expect(overview).toBeDefined();
    if (overview === undefined) return;
    expect(overview).not.toContain("src/");
    expect(overview).not.toContain("docs:generate");
    expect(overview).toContain("## Table of contents");
    expect(overview).toContain("[Renderer](./renderers/Renderer/)");
    expect(overview).toContain(
      "[SphericalHarmonicsBasis](./math/SphericalHarmonicsBasis-type/)",
    );
    expect(overview).not.toMatch(/\*\*[^*]+\*\*:\s*\d+/u);
    for (const page of first.keys()) {
      if (page === "index.md") continue;
      const route = `./${page.replace(/\.md$/u, "/")}`;
      expect(overview.split(`(${route})`)).toHaveLength(2);
    }
  });

  it("publishes only top-level JSDoc narratives", () => {
    const docs = generatedPages();
    const sourceJson = docs.get("textures/SourceJSON.md");
    const renderer = docs.get("renderers/Renderer.md");
    expect(sourceJson).toContain(
      "Serializable image or raw pixel source description.",
    );
    expect(sourceJson).not.toContain("interface SourceJSON");
    expect(sourceJson).not.toContain("## Properties");
    expect(sourceJson).not.toContain("## Methods");
    expect(renderer).toContain(
      "Canvas2D software renderer orchestrating the full pipeline.",
    );
    expect(renderer).not.toContain("new Renderer");
    expect(renderer).not.toContain("## Properties");
    expect(renderer).not.toContain("## Methods");
  });

  it("omits implementation pages and unsafe comparison terminology", () => {
    const docs = generatedPages();
    expect(docs.has("pipeline/LightBaker.md")).toBe(false);
    expect(docs.has("renderers/Renderer.md")).toBe(true);
    for (const unsafePage of [
      "core/EXRExporter.md",
      "loaders/DDSLoader.md",
      "loaders/TTFFont.md",
      "loaders/NRRDVolume.md",
    ]) {
      expect(docs.get(unsafePage)).not.toContain("description:");
    }
    const forbidden = [
      /Generated from/gu,
      /docs:generate/gu,
      /source declaration/giu,
      /src\//gu,
      /```ts/gu,
      /^## (?:Properties|Methods)$/gmu,
      /\bTHREE\b/gu,
      /three\.js/giu,
      /threejs/giu,
      /\b(?:Three|three)['’]s\b/gu,
      /(?:WebGL|WebGPU|GPU|PBR)/giu,
      /\b(?:device API|environment map|render target|shader|shadow map)\b/giu,
    ];
    for (const content of docs.values()) {
      for (const pattern of forbidden) expect(content).not.toMatch(pattern);
    }
  });

  it("renders a title-only page when a symbol has no JSDoc", () => {
    const docs = renderDocs([
      { category: "Core", kind: "constant", name: "Undocumented" },
    ]);
    const page = docs.get("core/Undocumented.md");
    expect(page).toBe(
      [
        "---",
        'title: "Undocumented"',
        "sidebar:",
        "  order: 1",
        '  label: "Undocumented"',
        "---",
        "",
      ].join("\n"),
    );
  });

  it("keeps every generated API category in the Starlight sidebar", () => {
    const docs = generatedPages();
    const generatedCategories = new Set(
      [...docs.keys()]
        .filter((key) => key !== "index.md")
        .map((key) => key.slice(0, key.indexOf("/"))),
    );
    const config = readFileSync(`${root}/astro.config.mjs`, "utf8");
    const sidebarStart = config.indexOf("const apiSidebarGroups");
    const sidebarEnd = config.indexOf("const manualSidebar");
    const apiSidebar = config.slice(sidebarStart, sidebarEnd);
    const labelsBySlug = new Map(
      Object.values(CATEGORY_NAMES).map((label) => [
        label.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-"),
        label,
      ]),
    );

    for (const category of generatedCategories) {
      const label = labelsBySlug.get(category);
      expect(label).toBeDefined();
      if (label === undefined) continue;
      expect(apiSidebar).toContain(`  "${label}",`);
    }
  });

  it("has no hand-maintained API catalog", () => {
    expect(existsSync(`${root}/www/docs`)).toBe(false);
    expect(existsSync(`${root}/scripts/generate-starlight-docs.mjs`)).toBe(
      false,
    );
  });
});
