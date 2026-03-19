import { SegmentedControl, Stack } from "@mantine/core";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock.jsx";

/**
 * EASEL/THREE.js code comparison toggle.
 * Shows SegmentedControl when threeSource is provided.
 * @param {{ easelSource: string, threeSource?: string|null }} props
 */
export function CodeToggle({ easelSource, threeSource }) {
	const [view, setView] = useState("easel");
	const hasComparison = threeSource != null;

	return (
		<Stack gap="xs">
			{hasComparison && (
				<SegmentedControl
					value={view}
					onChange={setView}
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
