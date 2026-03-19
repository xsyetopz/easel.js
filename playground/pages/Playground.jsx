import {
	AppShell,
	Burger,
	Group,
	Paper,
	Text,
	Title,
	useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { ControlPanel } from "../components/ControlPanel.jsx";
import { PlaygroundCanvas } from "../components/PlaygroundCanvas.jsx";
import { StatusBar } from "../components/StatusBar.jsx";
import { ZoneSidebar } from "../components/ZoneSidebar.jsx";
import * as AnimationZone from "../scenes/zones/AnimationZone.js";
import * as ArtifactsZone from "../scenes/zones/ArtifactsZone.js";
import * as InteractionZone from "../scenes/zones/InteractionZone.js";
import * as LightingZone from "../scenes/zones/LightingZone.js";
import * as MaterialsZone from "../scenes/zones/MaterialsZone.js";
import * as ParametricZone from "../scenes/zones/ParametricZone.js";
import * as PlanarZone from "../scenes/zones/PlanarZone.js";
import * as PolyhedraZone from "../scenes/zones/PolyhedraZone.js";
import * as PrimitivesZone from "../scenes/zones/PrimitivesZone.js";
import { zones } from "../scenes/zones/registry.js";
import * as TextureZone from "../scenes/zones/TextureZone.js";

const STATUS_BAR_HEIGHT = 32;

/**
 * @param {string} id
 * @returns {{ setup: Function }}
 */
function resolveZone(id) {
	switch (id) {
		case "primitives":
			return PrimitivesZone;
		case "polyhedra":
			return PolyhedraZone;
		case "parametric":
			return ParametricZone;
		case "planar":
			return PlanarZone;
		case "materials":
			return MaterialsZone;
		case "lighting":
			return LightingZone;
		case "animation":
			return AnimationZone;
		case "textures":
			return TextureZone;
		case "interaction":
			return InteractionZone;
		case "artifacts":
			return ArtifactsZone;
		default:
			return PrimitivesZone;
	}
}

export function Playground() {
	const [sidebarOpened, { toggle, close }] = useDisclosure(false);
	const [activeZoneId, setActiveZoneId] = useState(zones[0].id);
	const [controls, setControls] = useState([]);
	const [params, setParams] = useState({});
	const theme = useMantineTheme();

	const activeZone = resolveZone(activeZoneId);

	function handleZoneSelect(id) {
		setActiveZoneId(id);
		setControls([]);
		setParams({});
		close();
	}

	function handleControlsChange(nextControls) {
		setControls(nextControls);
		const defaults = {};
		for (const c of nextControls) {
			defaults[c.key] = c.default;
		}
		setParams(defaults);
	}

	function handleParamChange(key, value) {
		setParams((prev) => ({ ...prev, [key]: value }));
	}

	const hasControls = controls.length > 0;

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{
				width: 260,
				breakpoint: "sm",
				collapsed: { mobile: !sidebarOpened },
			}}
			footer={{ height: STATUS_BAR_HEIGHT }}
			padding={0}
		>
			<AppShell.Header>
				<Group h="100%" px="md">
					<Burger
						opened={sidebarOpened}
						onClick={toggle}
						hiddenFrom="sm"
						size="sm"
					/>
					<Title order={3}>
						<Text component="span" inherit={true} c={theme.colors.blue[4]}>
							Easel.js
						</Text>
					</Title>
					<Text size="sm" c="dimmed">
						Playground
					</Text>
				</Group>
			</AppShell.Header>

			<AppShell.Navbar p="xs">
				<ZoneSidebar activeId={activeZoneId} onSelect={handleZoneSelect} />
			</AppShell.Navbar>

			<AppShell.Main
				style={{ display: "flex", flexDirection: "column", height: "100%" }}
			>
				<div
					style={{
						flex: 1,
						display: "flex",
						gap: "var(--mantine-spacing-md)",
						padding: "var(--mantine-spacing-md)",
						minHeight: 0,
					}}
				>
					<div style={{ flex: 1, minHeight: 400 }}>
						<PlaygroundCanvas
							activeZone={activeZone}
							onControlsChange={handleControlsChange}
							params={params}
						/>
					</div>

					{hasControls && (
						<Paper
							p="md"
							withBorder={true}
							style={{ width: 220, flexShrink: 0, overflowY: "auto" }}
						>
							<Title order={5} mb="md">
								Controls
							</Title>
							<ControlPanel
								controls={controls}
								params={params}
								onParamChange={handleParamChange}
							/>
						</Paper>
					)}
				</div>
			</AppShell.Main>

			<AppShell.Footer>
				<StatusBar activeZoneId={activeZoneId} />
			</AppShell.Footer>
		</AppShell>
	);
}
