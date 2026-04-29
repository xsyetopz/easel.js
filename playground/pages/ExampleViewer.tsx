import { Anchor, Grid, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { CodeToggle } from "../components/CodeToggle.tsx";
import { ControlPanel } from "../components/ControlPanel.tsx";
import { ExampleCanvas } from "../components/ExampleCanvas.tsx";
import { navigate } from "../hooks/navigate.js";
import { useExampleCatalog } from "../hooks/useExampleCatalog.ts";
import {
	buildExampleRouteData,
	type ExampleCatalogData,
	type ExampleRouteData,
	loadExampleModule,
} from "../loaders/examples.ts";

interface ExampleViewerProps {
	exampleId: string | null;
	initialCatalog?: ExampleCatalogData | undefined;
	initialExample?: ExampleRouteData | undefined;
}

export function ExampleViewer({
	exampleId,
	initialCatalog,
	initialExample,
}: ExampleViewerProps) {
	const catalog = useExampleCatalog(initialCatalog);
	const exampleMeta = catalog?.examples.find(
		(example) => example.meta.id === exampleId,
	);
	const [example, setExample] = useState<ExampleRouteData | null>(
		initialExample ?? null,
	);

	useEffect(() => {
		if (!exampleId) {
			setExample(null);
			return;
		}

		if (initialExample?.meta.id === exampleId) {
			setExample(initialExample);
			return;
		}

		let active = true;
		setExample(null);
		loadExampleModule(exampleId).then((module) => {
			if (!active) return;
			setExample(module ? buildExampleRouteData(module) : null);
		});

		return () => {
			active = false;
		};
	}, [exampleId, initialExample]);

	const defaultParams = useMemo(() => {
		if (!example?.controls) return {};
		const p: Record<string, string | number> = {};
		for (const c of example.controls) {
			p[c.key] = c.default;
		}
		return p;
	}, [example]);

	const [params, setParams] =
		useState<Record<string, string | number>>(defaultParams);

	useEffect(() => {
		setParams(defaultParams);
	}, [defaultParams]);

	if (catalog === null) {
		return (
			<Text c="dimmed" size="lg" ta="center" mt="xl">
				Loading example...
			</Text>
		);
	}

	if (!example) {
		return (
			<Text c="dimmed" size="lg" ta="center" mt="xl">
				{exampleMeta ? "Loading example..." : `Example not found: ${exampleId}`}
			</Text>
		);
	}

	const handleParamChange = (key: string, value: string | number) => {
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
				<Group gap="md" mt="xs">
					<Anchor
						href="/compare/threejs"
						size="xs"
						onClick={(event) => {
							event.preventDefault();
							navigate("/compare/threejs");
						}}
					>
						THREE.js migration page
					</Anchor>
					<Anchor
						href="/cpu-rasterizer"
						size="xs"
						onClick={(event) => {
							event.preventDefault();
							navigate("/cpu-rasterizer");
						}}
					>
						CPU rasterizer guide
					</Anchor>
				</Group>
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
				noThreeReason={example.noThreeReason}
			/>
		</Stack>
	);
}
