import { CodeHighlight } from "@mantine/code-highlight";
import { Anchor, Tabs } from "@mantine/core";
import { navigate } from "../hooks/navigate.js";

const ESM_CODE = `import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({ canvas, width: 800, height: 600 });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({ fov: 45, aspect: 4 / 3 });
camera.position.set(0, 2, 5);

scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

renderer.render(scene, camera);`;

const CJS_CODE = `const EASEL = require("@xsyetopz/easel");

const renderer = new EASEL.Renderer({ canvas, width: 800, height: 600 });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({ fov: 45, aspect: 4 / 3 });
camera.position.set(0, 2, 5);

scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

renderer.render(scene, camera);`;

const TS_CODE = `import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({ canvas: canvas!, width: 800, height: 600 });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({ fov: 45, aspect: 4 / 3 });
camera.position.set(0, 2, 5);

scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

renderer.render(scene, camera);`;

const CODE_STYLE = {
	root: { borderRadius: "var(--mantine-radius-sm)" },
};

/**
 * Tabbed code example with ESM, CJS, and TypeScript variants.
 */
export function CodeExampleTabs() {
	return (
		<>
			<Tabs defaultValue="esm">
				<Tabs.List>
					<Tabs.Tab value="esm">ESM</Tabs.Tab>
					<Tabs.Tab value="cjs">CJS</Tabs.Tab>
					<Tabs.Tab value="typescript">TypeScript</Tabs.Tab>
				</Tabs.List>

				<Tabs.Panel value="esm" pt="xs">
					<CodeHighlight
						code={ESM_CODE}
						language="javascript"
						withCopyButton={true}
						styles={CODE_STYLE}
					/>
				</Tabs.Panel>

				<Tabs.Panel value="cjs" pt="xs">
					<CodeHighlight
						code={CJS_CODE}
						language="javascript"
						withCopyButton={true}
						styles={CODE_STYLE}
					/>
				</Tabs.Panel>

				<Tabs.Panel value="typescript" pt="xs">
					<CodeHighlight
						code={TS_CODE}
						language="typescript"
						withCopyButton={true}
						styles={CODE_STYLE}
					/>
				</Tabs.Panel>
			</Tabs>
			<Anchor
				size="xs"
				c="dimmed"
				onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
					e.preventDefault();
					navigate("examples/hello-cube");
				}}
				style={{ cursor: "pointer" }}
				mt="xs"
			>
				See full example &rarr;
			</Anchor>
		</>
	);
}
