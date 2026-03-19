import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import "./hljs-theme.css";

import {
	CodeHighlightAdapterProvider,
	createHighlightJsAdapter,
} from "@mantine/code-highlight";
import { MantineProvider } from "@mantine/core";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { theme } from "./theme.js";

hljs.registerLanguage("javascript", javascript);
const highlightJsAdapter = createHighlightJsAdapter(hljs);

createRoot(document.getElementById("root")).render(
	<MantineProvider theme={theme} defaultColorScheme="auto">
		<CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
			<App />
		</CodeHighlightAdapterProvider>
	</MantineProvider>,
);
