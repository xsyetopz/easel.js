import {
	AppShell,
	Burger,
	Group,
	Text,
	Title,
	useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { ExampleViewer } from "./pages/ExampleViewer.jsx";
import { Home } from "./pages/Home.jsx";

function getRoute() {
	const hash = window.location.hash.slice(1);
	if (!hash || hash === "home") return { page: "home", id: undefined };
	if (hash.startsWith("example/")) {
		return { page: "example", id: hash.slice(8) };
	}
	return { page: "home", id: undefined };
}

export function App() {
	const [opened, { toggle, close }] = useDisclosure(false);
	const [route, setRoute] = useState(getRoute);
	const theme = useMantineTheme();

	useEffect(() => {
		const onHash = () => setRoute(getRoute());
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);

	const navigate = useCallback(
		(hash) => {
			window.location.hash = hash;
			close();
		},
		[close],
	);

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<Group h="100%" px="md">
					<Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
					<Title
						order={3}
						style={{ cursor: "pointer" }}
						onClick={() => navigate("home")}
					>
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
				<Sidebar activeId={route.id} onNavigate={navigate} />
			</AppShell.Navbar>

			<AppShell.Main>
				{route.page === "home" ? (
					<Home onNavigate={navigate} />
				) : (
					<ExampleViewer exampleId={route.id} />
				)}
			</AppShell.Main>
		</AppShell>
	);
}
