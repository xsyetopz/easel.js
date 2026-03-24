import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { ExampleCard } from "../components/ExampleCard.tsx";
import { categoryLabels, examples } from "../examples/registry.js";

export function ExamplesGallery() {
	const categories = [...new Set(examples.map((e) => e.meta.category))];

	return (
		<Container size="lg" py="md">
			<Stack gap="xl">
				<div>
					<Title order={2}>Examples</Title>
					<Text size="sm" c="dimmed">
						{examples.length} examples across {categories.length} categories.
						Each includes source code you can compare with THREE.js.
					</Text>
				</div>

				{categories.map((cat) => (
					<div key={cat}>
						<Title order={4} mb="sm">
							{categoryLabels[cat] || cat}
						</Title>
						<SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="sm">
							{examples
								.filter((e) => e.meta.category === cat)
								.map((e) => (
									<ExampleCard key={e.meta.id} meta={e.meta} />
								))}
						</SimpleGrid>
					</div>
				))}
			</Stack>
		</Container>
	);
}
