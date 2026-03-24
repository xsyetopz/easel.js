import { CodeHighlight } from "@mantine/code-highlight";

interface CodeBlockProps {
	code: string;
	language?: string;
}

export function CodeBlock({ code, language = "javascript" }: CodeBlockProps) {
	return (
		<CodeHighlight
			code={code}
			language={language}
			withCopyButton={true}
			styles={{
				root: { borderRadius: "var(--mantine-radius-sm)" },
			}}
		/>
	);
}
