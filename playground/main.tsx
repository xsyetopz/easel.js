import "@mantine/core/styles.css";
import "./light-overrides.css";

import { createRoot, hydrateRoot } from "react-dom/client";
import { readInitialPayload } from "./initialPayload.ts";
import { Root } from "./Root.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
const initialPayload = readInitialPayload();

if (root.hasChildNodes()) {
	hydrateRoot(root, <Root initialPayload={initialPayload} />);
} else {
	createRoot(root).render(<Root initialPayload={initialPayload} />);
}
