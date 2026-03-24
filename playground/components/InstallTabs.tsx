import { Code, Stack, Tabs, Text } from "@mantine/core";

interface InstallCommand {
	registry: string;
	cmd: string;
}

interface PackageManager {
	value: string;
	label: string;
	commands: InstallCommand[];
}

const INSTALL_DATA: PackageManager[] = [
	{
		value: "npm",
		label: "npm",
		commands: [
			{ registry: "npmjs.com", cmd: "npm install @xsyetopz/easel" },
			{ registry: "jsr.io", cmd: "npx jsr add @xsyetopz/easel" },
		],
	},
	{
		value: "yarn",
		label: "yarn",
		commands: [{ registry: "npmjs.com", cmd: "yarn add @xsyetopz/easel" }],
	},
	{
		value: "pnpm",
		label: "pnpm",
		commands: [{ registry: "npmjs.com", cmd: "pnpm add @xsyetopz/easel" }],
	},
	{
		value: "bun",
		label: "bun",
		commands: [
			{ registry: "npmjs.com", cmd: "bun install @xsyetopz/easel" },
			{ registry: "jsr.io", cmd: "bunx jsr add @xsyetopz/easel" },
		],
	},
	{
		value: "deno",
		label: "deno",
		commands: [
			{ registry: "npmjs.com", cmd: "deno add npm:@xsyetopz/easel" },
			{ registry: "jsr.io", cmd: "deno add jsr:@xsyetopz/easel" },
		],
	},
];

/**
 * Tabbed installation commands for all supported package managers.
 */
export function InstallTabs() {
	return (
		<Tabs defaultValue="npm">
			<Tabs.List>
				{INSTALL_DATA.map((pm) => (
					<Tabs.Tab key={pm.value} value={pm.value}>
						{pm.label}
					</Tabs.Tab>
				))}
			</Tabs.List>

			{INSTALL_DATA.map((pm) => (
				<Tabs.Panel key={pm.value} value={pm.value} pt="md">
					<Stack gap="xs">
						{pm.commands.map((entry) => (
							<div key={entry.cmd}>
								<Text size="xs" c="dimmed" mb={4}>
									{entry.registry}
								</Text>
								<Code block={true}>{entry.cmd}</Code>
							</div>
						))}
					</Stack>
				</Tabs.Panel>
			))}
		</Tabs>
	);
}
