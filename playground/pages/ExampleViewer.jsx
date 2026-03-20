import { Grid, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { CodeToggle } from "../components/CodeToggle.jsx";
import { ControlPanel } from "../components/ControlPanel.jsx";
import { ExampleCanvas } from "../components/ExampleCanvas.jsx";
import { examples } from "../examples/registry.js";

export function ExampleViewer({ exampleId }) {
	const example = examples.find((e) => e.meta.id === exampleId);

	const defaultParams = useMemo(() => {
		if (!example?.controls) return {};
		const p = {};
		for (const c of example.controls) {
			p[c.key] = c.default;
		}
		return p;
	}, [example]);

	const [params, setParams] = useState(defaultParams);

	useEffect(() => {
		setParams(defaultParams);
	}, [defaultParams]);

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
				<Title order={3}>{example.meta.name}</Title>
				{example.meta.description && (
					<Text size="sm" c="dimmed" mt={4}>
						{example.meta.description}
					</Text>
				)}
			</div>

			<Grid>
				<Grid.Col span={hasControls ? { base: 12, lg: 9 } : 12}>
					<ExampleCanvas
						key={exampleId}
						setup={example.setup}
						params={params}
					/>
				</Grid.Col>
				{hasControls && (
					<Grid.Col span={{ base: 12, lg: 3 }}>
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

			<CodeToggle
				easelSource={example.easelSource}
				threeSource={example.threeSource}
			/>
		</Stack>
	);
}
