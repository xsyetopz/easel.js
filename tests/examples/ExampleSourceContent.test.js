import { describe, expect, it } from "bun:test";

import { examples } from "../../www/examples/registry.ts";
import {
  buildExampleRouteData,
  formatSourceExcerpt,
  highlightSourceExcerpt,
  loadExampleModule,
} from "../../www/loaders/examples.ts";

describe("example source excerpts", () => {
  it("keeps every excerpt grouped and parseable", async () => {
    for (const example of examples) {
      const module = await example.load();
      const excerpt = formatSourceExcerpt(module.easelSource);
      const groups = excerpt.split(/\n\s*\n/u).filter(Boolean);
      expect(groups.length).toBeGreaterThanOrEqual(2);
      expect(
        groups[0].split("\n").every((line) => /^import\b/u.test(line)),
      ).toBe(true);
      expect(excerpt).toContain("@xsyetopz/easel");

      const executable = excerpt.replace(/^import[^\n]*\n/gmu, "");
      expect(() => new Function(executable)).not.toThrow();
    }
  });

  it("builds highlighted route source", async () => {
    const module = await loadExampleModule("canvas_raycaster_sprite");
    expect(module).toBeDefined();
    if (!module) return;

    const route = buildExampleRouteData(module);
    const html = await highlightSourceExcerpt(route.sourceExcerpt);
    expect(route.sourceExcerpt).toContain("Raycaster");
    expect(html).toContain('<pre class="shiki');
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("<span");
  });
});
