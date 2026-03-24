import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import "./hljs-theme.css";
import "./light-overrides.css";

import {
	CodeHighlightAdapterProvider,
	createHighlightJsAdapter,
} from "@mantine/code-highlight";
import { MantineProvider } from "@mantine/core";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import plaintext from "highlight.js/lib/languages/plaintext";
import typescript from "highlight.js/lib/languages/typescript";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { theme } from "./theme.ts";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("plaintext", plaintext);
const highlightJsAdapter = createHighlightJsAdapter(hljs);

createRoot(document.getElementById("root")!).render(
	<MantineProvider theme={theme} defaultColorScheme="auto">
		<CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
			<App />
		</CodeHighlightAdapterProvider>
	</MantineProvider>,
);
