import {
	Container,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { navigate } from "../hooks/navigate.js";
import { useDocCatalog } from "../hooks/useDocCatalog.ts";
import type { DocCatalogData } from "../loaders/docs.ts";
import { routeToPath } from "../routes.ts";

interface DocsLandingProps {
	initialCatalog?: DocCatalogData;
}

export function DocsLanding({ initialCatalog }: DocsLandingProps) {
	const catalog = useDocCatalog(initialCatalog);
	const docCategories = catalog?.docCategories ?? [];
	const docClasses = catalog?.docClasses ?? [];

	if (catalog === null) {
		return (
			<Container size="lg" py="md">
				<Text c="dimmed">Loading documentation...</Text>
			</Container>
		);
	}

	return (
		<Container size="lg" py="md">
			<Stack gap="xl">
				<div>
					<Title order={1}>API Reference</Title>
					<Text size="sm" c="dimmed">
						{docClasses.length} classes across {docCategories.length} modules.
						THREE.js equivalents and divergence notes are called out on each
						entry.
					</Text>
				</div>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
					{docCategories.map((cat) => {
						const classes = docClasses.filter((c) => c.category === cat);
						const first = classes[0];
						return (
							<Paper
								key={cat}
								component="a"
								href={first ? routeToPath(`docs/${first.id}`) : undefined}
								p="md"
								withBorder={true}
								style={{ cursor: "pointer" }}
								onClick={(event) => {
									if (!first) return;
									event.preventDefault();
									navigate(`docs/${first.id}`);
								}}
							>
								<Text fw={600}>{cat}</Text>
								<Text size="xs" c="dimmed" mt={4}>
									{classes.length} class{classes.length === 1 ? "" : "es"}:{" "}
									{classes
										.slice(0, 5)
										.map((c) => c.name)
										.join(", ")}
									{classes.length > 5 ? ", ..." : ""}
								</Text>
							</Paper>
						);
					})}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}
