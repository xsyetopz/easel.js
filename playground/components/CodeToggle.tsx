import { SegmentedControl, Stack } from "@mantine/core";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock.tsx";

interface CodeToggleProps {
	easelSource: string;
	threeSource?: string | undefined;
}

/**
 * EASEL/THREE.js code comparison toggle.
 * Shows SegmentedControl when threeSource is provided.
 */
export function CodeToggle({ easelSource, threeSource }: CodeToggleProps) {
	const [view, setView] = useState<"easel" | "three">("easel");
	const hasComparison = threeSource !== undefined;

	return (
		<Stack gap="xs">
			{hasComparison && (
				<SegmentedControl
					value={view}
					onChange={(val) => setView(val as "easel" | "three")}
					data={[
						{ label: "EASEL.js", value: "easel" },
						{ label: "THREE.js", value: "three" },
					]}
					size="xs"
					style={{ alignSelf: "flex-start" }}
				/>
			)}
			<CodeBlock
				code={view === "three" && hasComparison ? threeSource : easelSource}
			/>
		</Stack>
	);
}
