import { Group, Text } from "@mantine/core";
import { zones } from "../scenes/zones/registry.js";

/**
 * @param {{ activeZoneId: string | null }} props
 */
export function StatusBar({ activeZoneId }) {
	const zone = zones.find((z) => z.id === activeZoneId);
	const zoneName = zone?.name ?? "No zone selected";

	return (
		<Group
			px="md"
			h="100%"
			gap="xs"
			style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
		>
			<Text size="xs" c="dimmed">
				Ready
			</Text>
			<Text size="xs" c="dimmed">
				|
			</Text>
			<Text size="xs" c="dimmed">
				PerspectiveCamera
			</Text>
			<Text size="xs" c="dimmed">
				|
			</Text>
			<Text size="xs">{zoneName}</Text>
		</Group>
	);
}
