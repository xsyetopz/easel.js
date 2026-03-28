import { useEffect, useState } from "react";

interface CodeBlockProps {
	code: string;
	language?: string;
}

type HighlightedCodeBlockComponent =
	typeof import("./HighlightedCodeBlock.tsx").HighlightedCodeBlock;

export function CodeBlock({ code, language = "javascript" }: CodeBlockProps) {
	const [Renderer, setRenderer] =
		useState<HighlightedCodeBlockComponent | null>(null);

	useEffect(() => {
		let active = true;
		import("./HighlightedCodeBlock.tsx").then((module) => {
			if (!active) return;
			setRenderer(() => module.HighlightedCodeBlock);
		});

		return () => {
			active = false;
		};
	}, []);

	if (Renderer) {
		return <Renderer code={code} language={language} />;
	}

	return (
		<pre
			style={{
				background: "var(--mantine-color-dark-8)",
				borderRadius: "var(--mantine-radius-sm)",
				color: "var(--mantine-color-gray-1)",
				fontFamily: "var(--mantine-font-family-monospace)",
				fontSize: "var(--mantine-font-size-sm)",
				margin: 0,
				overflowX: "auto",
				padding: "1rem",
			}}
		>
			<code>{code}</code>
		</pre>
	);
}
