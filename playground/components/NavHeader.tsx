import {
	ActionIcon,
	Anchor,
	Burger,
	Divider,
	Drawer,
	Group,
	Stack,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { Icon } from "@tabler/icons-react";
import {
	IconBrandGithub,
	IconDeviceDesktop,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import { navigate } from "../hooks/navigate.js";

type ColorScheme = "light" | "dark" | "auto";

const SCHEME_CYCLE: readonly ColorScheme[] = ["light", "dark", "auto"] as const;

const schemeIcon: Record<ColorScheme, Icon> = {
	light: IconSun,
	dark: IconMoon,
	auto: IconDeviceDesktop,
};

const schemeLabel: Record<ColorScheme, string> = {
	light: "Switch to dark mode",
	dark: "Switch to system mode",
	auto: "Switch to light mode",
};

interface NavHeaderProps {
	opened: boolean;
	onToggle: () => void;
}

export function NavHeader({ opened, onToggle }: NavHeaderProps) {
	const { colorScheme, setColorScheme } = useMantineColorScheme();
	const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
		useDisclosure(false);

	const cycleScheme = () => {
		const idx = SCHEME_CYCLE.indexOf(colorScheme as ColorScheme);
		setColorScheme(SCHEME_CYCLE[(idx + 1) % SCHEME_CYCLE.length]);
	};

	const SchemeIcon =
		schemeIcon[colorScheme as ColorScheme] ?? IconDeviceDesktop;

	const navLinks = (
		<>
			<Anchor
				onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
					e.preventDefault();
					closeDrawer();
					navigate("examples");
				}}
				underline="never"
				c="dimmed"
				size="sm"
				style={{ cursor: "pointer" }}
			>
				Examples
			</Anchor>
			<Anchor
				onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
					e.preventDefault();
					closeDrawer();
					navigate("docs");
				}}
				underline="never"
				c="dimmed"
				size="sm"
				style={{ cursor: "pointer" }}
			>
				Docs
			</Anchor>
			<Anchor
				href="https://github.com/xsyetopz/easel.js"
				target="_blank"
				c="dimmed"
				size="sm"
			>
				<IconBrandGithub size={20} />
			</Anchor>
		</>
	);

	return (
		<>
			<Group h="100%" px="md" justify="space-between">
				<Group gap="xs">
					<Burger
						opened={opened || drawerOpened}
						onClick={() => {
							if (drawerOpened) {
								closeDrawer();
							} else {
								openDrawer();
							}
							onToggle();
						}}
						hiddenFrom="sm"
						size="sm"
					/>
					<Anchor
						onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
							e.preventDefault();
							navigate("");
						}}
						underline="never"
						fw={700}
						size="lg"
						style={{ cursor: "pointer" }}
					>
						easel.js
					</Anchor>
				</Group>
				<Group gap="lg">
					<Group gap="lg" visibleFrom="sm">
						{navLinks}
					</Group>
					<ActionIcon
						variant="subtle"
						color="gray"
						onClick={cycleScheme}
						title={schemeLabel[colorScheme as ColorScheme]}
						aria-label={schemeLabel[colorScheme as ColorScheme]}
					>
						<SchemeIcon size={18} />
					</ActionIcon>
				</Group>
			</Group>

			<Drawer
				opened={drawerOpened}
				onClose={closeDrawer}
				size="xs"
				title="Navigation"
				hiddenFrom="sm"
				padding="md"
				zIndex={1000}
			>
				<Stack gap="md">
					{navLinks}
					<Divider />
				</Stack>
			</Drawer>
		</>
	);
}
