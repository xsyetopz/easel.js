import {
	Container,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { docCategories, docClasses } from "../docs/classes.js";
import { navigate } from "../hooks/navigate.js";

export function DocsLanding() {
	return (
		<Container size="lg" py="md">
			<Stack gap="xl">
				<div>
					<Title order={2}>API Reference</Title>
					<Text size="sm" c="dimmed">
						{docClasses.length} classes across {docCategories.length} modules.
						THREE.js equivalents noted where applicable.
					</Text>
				</div>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
					{docCategories.map((cat) => {
						const classes = docClasses.filter((c) => c.category === cat);
						const first = classes[0];
						return (
							<Paper
								key={cat}
								p="md"
								withBorder={true}
								style={{ cursor: "pointer" }}
								onClick={() => first && navigate(`docs/${first.id}`)}
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
