import {
	Breadcrumbs,
	Grid,
	Paper,
	Stack,
	Tabs,
	Text,
	Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { CodeBlock } from "../components/CodeBlock.jsx";
import { ControlPanel } from "../components/ControlPanel.jsx";
import { ExampleCanvas } from "../components/ExampleCanvas.jsx";
import { examples } from "../examples/registry.js";

const categoryLabels = {
	"getting-started": "Getting Started",
	geometry: "Geometry",
	materials: "Materials",
	lighting: "Lighting",
	color: "Color",
	artifacts: "Artifacts",
	"scene-graph": "Scene Graph",
};

export function ExampleViewer({ exampleId }) {
	const example = examples.find((e) => e.id === exampleId);

	const defaultParams = useMemo(() => {
		if (!example?.controls) return {};
		const p = {};
		for (const c of example.controls) {
			p[c.key] = c.default;
		}
		return p;
	}, [example]);

	const [params, setParams] = useState(defaultParams);

	if (!example) {
		return (
			<Text c="dimmed" size="lg" ta="center" mt="xl">
				Example not found: {exampleId}
			</Text>
		);
	}

	const handleParamChange = (key, value) => {
		setParams((prev) => ({ ...prev, [key]: value }));
	};

	const hasControls = example.controls && example.controls.length > 0;

	return (
		<Stack gap="md">
			<div>
				<Breadcrumbs mb="xs">
					<Text size="sm" c="dimmed">
						{categoryLabels[example.category] || example.category}
					</Text>
					<Text size="sm">{example.name}</Text>
				</Breadcrumbs>
				<Title order={3}>{example.name}</Title>
				{example.description && (
					<Text size="sm" c="dimmed" mt={4}>
						{example.description}
					</Text>
				)}
			</div>

			<Grid>
				<Grid.Col span={hasControls ? { base: 12, md: 9 } : 12}>
					<ExampleCanvas setup={example.setup} params={params} />
				</Grid.Col>
				{hasControls && (
					<Grid.Col span={{ base: 12, md: 3 }}>
						<Paper p="md" withBorder={true}>
							<Title order={5} mb="md">
								Controls
							</Title>
							<ControlPanel
								controls={example.controls}
								params={params}
								onParamChange={handleParamChange}
							/>
						</Paper>
					</Grid.Col>
				)}
			</Grid>

			<Tabs defaultValue="source">
				<Tabs.List>
					<Tabs.Tab value="source">Source</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="source" pt="md">
					<CodeBlock code={example.source} />
				</Tabs.Panel>
			</Tabs>
		</Stack>
	);
}
