import { NavLink, ScrollArea } from "@mantine/core";
import {
	IconBulb,
	IconCamera,
	IconCube,
	IconEye,
	IconHandClick,
	IconMovie,
	IconPalette,
	IconPhoto,
	IconSitemap,
} from "@tabler/icons-react";
import { examples } from "../examples/registry.js";

const categoryIcons = {
	geometry: IconCube,
	materials: IconPalette,
	lights: IconBulb,
	camera: IconCamera,
	interactive: IconHandClick,
	animation: IconMovie,
	textures: IconPhoto,
	"scene-graph": IconSitemap,
	artifacts: IconEye,
};

const categoryLabels = {
	geometry: "Geometry",
	materials: "Materials",
	lights: "Lights",
	camera: "Camera",
	interactive: "Interactive",
	animation: "Animation",
	textures: "Textures",
	"scene-graph": "Scene Graph",
	artifacts: "Artifacts",
};

function groupByCategory() {
	const groups = {};
	for (const example of examples) {
		const cat = example.category;
		if (!groups[cat]) groups[cat] = [];
		groups[cat].push(example);
	}
	return groups;
}

export function Sidebar({ activeId, onNavigate }) {
	const groups = groupByCategory();

	return (
		<ScrollArea type="auto" offsetScrollbars={true}>
			<NavLink
				label="Home"
				active={!activeId}
				onClick={() => onNavigate("home")}
				mb={4}
			/>
			{Object.entries(groups).map(([category, items]) => {
				const Icon = categoryIcons[category] || IconCube;
				return (
					<NavLink
						key={category}
						label={categoryLabels[category] || category}
						leftSection={<Icon size={16} stroke={1.5} />}
						defaultOpened={true}
						childrenOffset={28}
					>
						{items.map((example) => (
							<NavLink
								key={example.id}
								label={example.name}
								active={activeId === example.id}
								onClick={() => onNavigate(`example/${example.id}`)}
							/>
						))}
					</NavLink>
				);
			})}
		</ScrollArea>
	);
}
