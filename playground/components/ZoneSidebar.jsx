import { NavLink, ScrollArea } from "@mantine/core";
import {
	IconBulb,
	IconCube,
	IconHandClick,
	IconMicroscope,
	IconPalette,
	IconPhoto,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { zones } from "../scenes/zones/registry.js";

/** @type {Record<string, React.ComponentType<{ size: number, stroke: number }>>} */
const zoneIcons = {
	geometry: IconCube,
	materials: IconPalette,
	lighting: IconBulb,
	animation: IconPlayerPlay,
	textures: IconPhoto,
	interaction: IconHandClick,
	artifacts: IconMicroscope,
};

/**
 * @param {{
 *   activeId: string | null,
 *   onSelect: (id: string) => void,
 * }} props
 */
export function ZoneSidebar({ activeId, onSelect }) {
	return (
		<ScrollArea type="auto" offsetScrollbars={true}>
			{zones.map((zone) => {
				const Icon = zoneIcons[zone.id] ?? IconCube;
				return (
					<NavLink
						key={zone.id}
						label={zone.name}
						description={zone.description}
						leftSection={<Icon size={16} stroke={1.5} />}
						active={activeId === zone.id}
						onClick={() => onSelect(zone.id)}
						mb={2}
					/>
				);
			})}
		</ScrollArea>
	);
}
