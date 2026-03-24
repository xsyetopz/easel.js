import {
	Badge,
	Code,
	Container,
	Paper,
	Stack,
	Table,
	Text,
	Title,
} from "@mantine/core";
import { docClasses } from "../docs/classes.js";

interface DocViewerProps {
	classId: string | null;
}

export function DocViewer({ classId }: DocViewerProps) {
	const doc = docClasses.find((c) => c.id === classId);

	if (!doc) {
		return (
			<Text c="dimmed" size="lg" ta="center" mt="xl">
				Class not found: {classId}
			</Text>
		);
	}

	return (
		<Container size="md" py="md">
			<Stack gap="lg">
				<div>
					<Title order={2}>{doc.name}</Title>
					<Code block={true}>{doc.signature}</Code>
					{doc.threeEquivalent && (
						<Badge variant="light" color="blue" mt="xs">
							THREE: {doc.threeEquivalent}
						</Badge>
					)}
				</div>

				<Text size="sm">{doc.description}</Text>

				{doc.divergence && (
					<Paper p="sm" withBorder={true} bg="dark.7">
						<Text size="xs" fw={600} mb={4}>
							Differs from THREE.js
						</Text>
						<Text size="xs" c="dimmed">
							{doc.divergence}
						</Text>
					</Paper>
				)}

				{doc.properties.length > 0 && (
					<div>
						<Title order={4} mb="xs">
							Properties
						</Title>
						<Table striped={true} highlightOnHover={true}>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Name</Table.Th>
									<Table.Th>Type</Table.Th>
									<Table.Th>Description</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{doc.properties.map((p) => (
									<Table.Tr key={p.name}>
										<Table.Td>
											<Code>{p.name}</Code>
										</Table.Td>
										<Table.Td>
											<Text size="xs" c="dimmed">
												{p.type}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="xs">{p.description}</Text>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</div>
				)}

				{doc.methods.length > 0 && (
					<div>
						<Title order={4} mb="xs">
							Methods
						</Title>
						<Table striped={true} highlightOnHover={true}>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Method</Table.Th>
									<Table.Th>Description</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{doc.methods.map((m) => (
									<Table.Tr key={m.name}>
										<Table.Td>
											<Code>{m.signature}</Code>
										</Table.Td>
										<Table.Td>
											<Text size="xs">{m.description}</Text>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</div>
				)}
			</Stack>
		</Container>
	);
}
