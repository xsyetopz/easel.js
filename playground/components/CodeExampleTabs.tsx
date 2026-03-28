import { Anchor, Tabs } from "@mantine/core";
import { navigate } from "../hooks/navigate.js";
import { routeToPath } from "../routes.ts";
import { CodeBlock } from "./CodeBlock.tsx";

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
					<CodeBlock code={ESM_CODE} language="javascript" />
				</Tabs.Panel>

				<Tabs.Panel value="cjs" pt="xs">
					<CodeBlock code={CJS_CODE} language="javascript" />
				</Tabs.Panel>

				<Tabs.Panel value="typescript" pt="xs">
					<CodeBlock code={TS_CODE} language="typescript" />
				</Tabs.Panel>
			</Tabs>
			<Anchor
				href={routeToPath("examples/hello-cube")}
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
