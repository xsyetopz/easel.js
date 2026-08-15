import { examples } from "../examples/registry.ts";
import type { ExampleParams } from "../loaders/examples.ts";
import {
  mountExampleRuntime,
  type ExampleRuntimeController,
} from "./example-viewport.ts";

export function mountManualExamples(): void {
  const controllers: ExampleRuntimeController[] = [];
  const stages = document.querySelectorAll<HTMLElement>(
    "[data-manual-example]",
  );
  if (stages.length === 0) return;

  for (const stage of stages) {
    const { manualExample: id } = stage.dataset;
    const canvas = stage.querySelector<HTMLCanvasElement>("canvas");
    const status = stage.querySelector<HTMLElement>(
      "[data-manual-example-status]",
    );
    const entry = examples.find((candidate) => candidate.meta.id === id);
    if (!entry || !canvas) {
      if (status) status.textContent = "Render unavailable.";
      continue;
    }

    const params: ExampleParams = Object.fromEntries(
      entry.controls.map((control) => [control.key, control.default]),
    );
    void entry
      .load()
      .then((module) => {
        const controller = mountExampleRuntime({
          canvas,
          container: stage,
          module,
          params,
          onState(state) {
            if (!status) return;
            status.textContent =
              state === "ready"
                ? `${entry.meta.name} rendered.`
                : state === "loading"
                  ? "Loading render…"
                  : "Render unavailable.";
          },
        });
        controllers.push(controller);
      })
      .catch(() => {
        if (status) status.textContent = "Render unavailable.";
      });
  }

  globalThis.addEventListener(
    "pagehide",
    () => {
      for (const controller of controllers) controller.cleanup();
    },
    { once: true },
  );
}
