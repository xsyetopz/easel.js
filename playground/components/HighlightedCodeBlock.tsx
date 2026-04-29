import "@mantine/code-highlight/styles.css";
import "../hljs-theme.css";

import {
	CodeHighlight,
	CodeHighlightAdapterProvider,
	createHighlightJsAdapter,
} from "@mantine/code-highlight";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import plaintext from "highlight.js/lib/languages/plaintext";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("plaintext", plaintext);

const highlightJsAdapter = createHighlightJsAdapter(hljs);

interface HighlightedCodeBlockProps {
	code: string;
	language?: string;
}

export function HighlightedCodeBlock({
	code,
	language = "javascript",
}: HighlightedCodeBlockProps) {
	return (
		<CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
			<CodeHighlight
				code={code}
				language={language}
				withCopyButton={true}
				styles={{
					codeHighlight: { borderRadius: "var(--mantine-radius-sm)" },
				}}
			/>
		</CodeHighlightAdapterProvider>
	);
}
