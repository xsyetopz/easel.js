import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { ExampleCard } from "../components/ExampleCard.tsx";
import { useExampleCatalog } from "../hooks/useExampleCatalog.ts";
import type { ExampleCatalogData } from "../loaders/examples.ts";

interface ExamplesGalleryProps {
	initialCatalog?: ExampleCatalogData | undefined;
}

export function ExamplesGallery({ initialCatalog }: ExamplesGalleryProps) {
	const catalog = useExampleCatalog(initialCatalog);
	const categoryLabels = catalog?.categoryLabels ?? {};
	const examples = catalog?.examples ?? [];
	const categories = [...new Set(examples.map((e) => e.meta.category))];

	if (catalog === null) {
		return (
			<Container size="lg" py="md">
				<Text c="dimmed">Loading examples...</Text>
			</Container>
		);
	}

	return (
		<Container size="lg" py="md">
			<Stack gap="xl">
				<div>
					<Title order={1}>Examples</Title>
					<Text size="sm" c="dimmed">
						{examples.length} examples across {categories.length} categories.
						Each example is a crawlable page with source code and, where
						available, a THREE.js comparison.
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
