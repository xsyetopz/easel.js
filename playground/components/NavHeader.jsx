import { Anchor, Burger, Group } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { navigate } from "../hooks/navigate.js";

/**
 * @param {{ opened: boolean, onToggle: () => void }} props
 */
export function NavHeader({ opened, onToggle }) {
	return (
		<Group h="100%" px="md" justify="space-between">
			<Group gap="xs">
				<Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" />
				<Anchor
					onClick={(e) => {
						e.preventDefault();
						navigate("");
					}}
					underline="never"
					c="white"
					fw={700}
					size="lg"
					style={{ cursor: "pointer" }}
				>
					easel.js
				</Anchor>
			</Group>
			<Group gap="lg" visibleFrom="sm">
				<Anchor
					onClick={(e) => {
						e.preventDefault();
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
					onClick={(e) => {
						e.preventDefault();
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
			</Group>
		</Group>
	);
}
