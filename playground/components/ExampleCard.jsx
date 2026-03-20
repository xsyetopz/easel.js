import { Paper, Text } from "@mantine/core";
import { navigate } from "../hooks/navigate.js";

const CATEGORY_COLORS = {
	"getting-started": "#4c6ef5",
	geometry: "#e06060",
	materials: "#60e060",
	lights: "#e0e060",
	camera: "#60e0e0",
	"scene-graph": "#e060e0",
	animation: "#e09040",
	textures: "#40e090",
	interactive: "#9040e0",
	helpers: "#a0a0a0",
	performance: "#e04080",
};

/**
 * @param {{ meta: { id: string, name: string, category: string, description: string } }} props
 */
export function ExampleCard({ meta }) {
	const color = CATEGORY_COLORS[meta.category] || "#666";

	return (
		<Paper
			withBorder={true}
			p="md"
			style={{
				cursor: "pointer",
				borderLeft: `3px solid ${color}`,
				transition: "background 0.15s",
			}}
			onClick={() => navigate(`examples/${meta.id}`)}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "var(--mantine-color-default-hover)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "";
			}}
		>
			<Text fw={600} size="sm" mb={4}>
				{meta.name}
			</Text>
			<Text size="xs" c="dimmed" lineClamp={2}>
				{meta.description}
			</Text>
		</Paper>
	);
}
