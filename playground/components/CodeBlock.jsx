import { CodeHighlight } from "@mantine/code-highlight";

export function CodeBlock({ code, language = "javascript" }) {
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
