import {
	Anchor,
	Badge,
	Button,
	Container,
	Divider,
	Grid,
	Group,
	List,
	Paper,
	SimpleGrid,
	Table,
	Text,
	Timeline,
	Title,
} from "@mantine/core";
import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import { REVISION } from "@/index.js";
import { CodeExampleTabs } from "../components/CodeExampleTabs.tsx";
import { HeroCanvas } from "../components/HeroCanvas.tsx";
import { InstallTabs } from "../components/InstallTabs.tsx";
import { navigate } from "../hooks/navigate.js";

const FEATURES = [
	{
		title: "THREE.js-Compatible API",
		description:
			"Same scene graph concepts: Scene, Mesh, Camera, Light. If you know THREE.js, you already know the API.",
	},
	{
		title: "CPU Software Renderer",
		description:
			"Every pixel drawn by the CPU using a painter's-algorithm scanline rasterizer. No WebGL, no GPU.",
	},
	{
		title: "Canvas2D Output",
		description:
			"Renders to a standard HTML5 Canvas via ImageData. Works everywhere a browser runs.",
	},
	{
		title: "Zero Dependencies",
		description:
			"No runtime dependencies. One import, no transitive packages to audit.",
	},
	{
		title: "TypeScript",
		description:
			"Full type definitions via JSDoc. Works with checkJs, strict mode, and IDE autocompletion out of the box.",
	},
	{
		title: "RuneTek 3 Inspired",
		description:
			"Rendering constraints modeled after the OldSchool RuneScape engine: affine UV, HSL16 color, integer coordinates, flat/Gouraud shading.",
	},
];

const NAME_MAPPING = [
	["Object3D", "Node", "Scene graph node"],
	["BufferGeometry", "Geometry", "No GPU buffers"],
	["WebGLRenderer", "Renderer", "Single renderer"],
	["MeshBasicMaterial", "BasicMaterial", '"Mesh" prefix redundant'],
	["MeshLambertMaterial", "LambertMaterial", "Same"],
	["MeshToonMaterial", "ToonMaterial", "Same"],
	["AnimationMixer", "Animator", "Plays clips"],
	["KeyframeTrack", "Track", "All tracks are keyframe"],
];

const KEY_DIFFERENCES = [
	"Constructor takes an options object, not positional arguments",
	"No dispose() needed for most objects (no GPU resources)",
	'Materials omit the "Mesh" prefix (LambertMaterial, not MeshLambertMaterial)',
	"Renderer outputs to Canvas2D, not WebGL",
	"Lighting is flat or Gouraud only (no per-pixel shading)",
	"Textures are 128x128 max with nearest-neighbor sampling",
	"Opacity uses 9 discrete steps (0-8), not continuous alpha",
];

const RUNETEK_CONSTRAINTS = [
	"128x128 max texture with nearest-neighbor sampling",
	"9-step discrete opacity (0-8), not continuous alpha",
	"Affine UV mapping -- no perspective correction",
	"HSL16 packed color (6H/3S/7L) with precomputed RGB LUT",
	"Integer screen coordinates with round-half truncation",
	"Tile-radius fog with hard cutoff",
	"Painter's algorithm with depth buffer for residual overlap",
];

const PIPELINE_STAGES = [
	{
		title: "SceneTraversal",
		description: "Walk the scene graph, collect visible meshes and lights.",
	},
	{
		title: "FogCuller",
		description: "Discard objects beyond the fog far plane.",
	},
	{
		title: "PainterSort",
		description: "Sort faces back-to-front by tile distance and layer.",
	},
	{
		title: "LightBaker",
		description: "Compute per-vertex lighting from all active lights.",
	},
	{
		title: "Rasterizer",
		description: "Scanline-fill triangles with affine UV and shading.",
	},
	{
		title: "Framebuffer",
		description: "Write pixels to ImageData and upload to the canvas.",
	},
];

export function Home() {
	return (
		<Container size="lg" py="md">
			{/* -- Hero ------------------------------------------------- */}
			<Grid gutter="xl" align="center" mt="md">
				<Grid.Col span={{ base: 12, md: 7 }}>
					<Group gap="sm" align="center">
						<Title order={1} size="2.5rem">
							EASEL.js
						</Title>
						<Badge variant="light" size="sm">
							v{REVISION}
						</Badge>
					</Group>
					<Text size="lg" c="dimmed" mt="sm" maw={500}>
						A software renderer for the browser. No WebGL. No GPU. Every pixel
						drawn by the CPU.
					</Text>
					<Group mt="md">
						<Button
							variant="filled"
							rightSection={<IconArrowRight size={16} />}
							onClick={() => navigate("examples/hello-cube")}
						>
							Get Started
						</Button>
						<Button
							variant="outline"
							leftSection={<IconBrandGithub size={16} />}
							component="a"
							href="https://github.com/xsyetopz/easel.js"
							target="_blank"
						>
							GitHub
						</Button>
					</Group>
				</Grid.Col>
				<Grid.Col span={{ base: 12, md: 5 }}>
					<HeroCanvas />
				</Grid.Col>
			</Grid>

			<Divider my={40} />

			{/* -- 1. Code Example ------------------------------------- */}
			<Title order={3} mb="md">
				Write familiar code
			</Title>
			<Grid gutter="xl">
				<Grid.Col span={{ base: 12, md: 5 }}>
					<Text c="dimmed">
						The API mirrors THREE.js wherever it makes sense. Scene, Mesh,
						Camera, Light, Material, Geometry — all the same concepts. Switch
						from THREE.js by changing your imports and removing the GPU setup.
					</Text>
				</Grid.Col>
				<Grid.Col span={{ base: 12, md: 7 }}>
					<CodeExampleTabs />
				</Grid.Col>
			</Grid>

			<Divider my={40} />

			{/* -- 2. Install ------------------------------------------ */}
			<Title order={3} mb="md">
				Install
			</Title>
			<Text c="dimmed" mb="md">
				Available on npm and JSR. One package, zero dependencies.
			</Text>
			<InstallTabs />
			<Group gap="sm" mt="md">
				<Badge
					component="a"
					href="https://www.npmjs.com/package/@xsyetopz/easel"
					target="_blank"
					variant="light"
					style={{ cursor: "pointer" }}
				>
					npmjs.com
				</Badge>
				<Badge
					component="a"
					href="https://jsr.io/@xsyetopz/easel"
					target="_blank"
					variant="light"
					style={{ cursor: "pointer" }}
				>
					jsr.io
				</Badge>
			</Group>

			<Divider my={40} />

			{/* -- 3. Features ----------------------------------------- */}
			<Title order={3} mb="lg" ta="center">
				Features
			</Title>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
				{FEATURES.map((f) => (
					<Paper key={f.title} p="lg" withBorder={true} shadow="xs">
						<Title order={4} mb="xs">
							{f.title}
						</Title>
						<Text size="sm" c="dimmed">
							{f.description}
						</Text>
					</Paper>
				))}
			</SimpleGrid>

			<Divider my={40} />

			{/* -- 4. THREE.js comparison ------------------------------ */}
			<Title order={3} mb="md">
				Coming from THREE.js?
			</Title>
			<Grid gutter="xl">
				<Grid.Col span={{ base: 12, md: 5 }}>
					<Text fw={600} mb="sm">
						Name mapping
					</Text>
					<Table
						striped={true}
						highlightOnHover={true}
						withTableBorder={true}
						fz="sm"
					>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>THREE.js</Table.Th>
								<Table.Th>Easel.js</Table.Th>
								<Table.Th>Reason</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{NAME_MAPPING.map(([three, easel, reason]) => (
								<Table.Tr key={three}>
									<Table.Td>
										<code>{three}</code>
									</Table.Td>
									<Table.Td>
										<code>{easel}</code>
									</Table.Td>
									<Table.Td>{reason}</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Grid.Col>
				<Grid.Col span={{ base: 12, md: 7 }}>
					<Text fw={600} mb="sm">
						Key differences
					</Text>
					<List spacing="xs" size="sm">
						{KEY_DIFFERENCES.map((diff) => (
							<List.Item key={diff}>{diff}</List.Item>
						))}
					</List>
				</Grid.Col>
			</Grid>

			<Divider my={40} />

			{/* -- 5. RuneTek 3 Origin --------------------------------- */}
			<Title order={3} mb="md">
				Why RuneTek 3?
			</Title>
			<Grid gutter="xl">
				<Grid.Col span={{ base: 12, md: 7 }}>
					<Paper p="xl" withBorder={true} radius="md">
						<Text size="lg" fw={500} mb="sm">
							RuneTek 3 is the Java-based software rasterizer that powers
							OldSchool RuneScape.
						</Text>
						<Text c="dimmed">
							Like RuneTek, EASEL.js computes every pixel on the CPU with no GPU
							acceleration.
						</Text>
					</Paper>
				</Grid.Col>
				<Grid.Col span={{ base: 12, md: 5 }}>
					<Text c="dimmed" mb="md">
						Architectural constraints inherited from the RuneTek 3 engine:
					</Text>
					<List spacing="xs" size="sm">
						{RUNETEK_CONSTRAINTS.map((constraint) => (
							<List.Item key={constraint}>{constraint}</List.Item>
						))}
					</List>
				</Grid.Col>
			</Grid>

			<Divider my={40} />

			{/* -- 6. Rendering Pipeline ------------------------------- */}
			<Title order={3} mb="md">
				Rendering Pipeline
			</Title>
			<Grid gutter="xl">
				<Grid.Col span={{ base: 12, md: 5 }}>
					<Text c="dimmed">
						Each frame flows through six stages. The painter's algorithm sorts
						back-to-front, then a scanline rasterizer fills triangles with
						affine UV mapping and per-vertex shading.
					</Text>
				</Grid.Col>
				<Grid.Col span={{ base: 12, md: 7 }}>
					<Timeline
						active={PIPELINE_STAGES.length - 1}
						bulletSize={24}
						lineWidth={2}
					>
						{PIPELINE_STAGES.map((stage) => (
							<Timeline.Item key={stage.title} title={stage.title}>
								<Text size="sm" c="dimmed">
									{stage.description}
								</Text>
							</Timeline.Item>
						))}
					</Timeline>
				</Grid.Col>
			</Grid>

			<Divider my={40} />

			{/* -- Footer ---------------------------------------------- */}
			<Group justify="center" gap="lg">
				<Anchor
					onClick={(e) => {
						e.preventDefault();
						navigate("docs");
					}}
					size="sm"
					c="dimmed"
					style={{ cursor: "pointer" }}
				>
					Documentation
				</Anchor>
				<Anchor
					onClick={(e) => {
						e.preventDefault();
						navigate("examples");
					}}
					size="sm"
					c="dimmed"
					style={{ cursor: "pointer" }}
				>
					Examples
				</Anchor>
				<Anchor
					href="https://github.com/xsyetopz/easel.js"
					target="_blank"
					size="sm"
					c="dimmed"
				>
					GitHub
				</Anchor>
				<Anchor
					href="https://www.npmjs.com/package/@xsyetopz/easel"
					target="_blank"
					size="sm"
					c="dimmed"
				>
					npm
				</Anchor>
				<Anchor
					href="https://jsr.io/@xsyetopz/easel"
					target="_blank"
					size="sm"
					c="dimmed"
				>
					JSR
				</Anchor>
			</Group>
		</Container>
	);
}
