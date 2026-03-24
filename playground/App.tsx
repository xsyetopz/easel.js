import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DocSidebar } from "./components/DocSidebar.tsx";
import { ExampleSidebar } from "./components/ExampleSidebar.tsx";
import { NavHeader } from "./components/NavHeader.tsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { DocsLanding } from "./pages/DocsLanding.tsx";
import { DocViewer } from "./pages/DocViewer.tsx";
import { ExamplesGallery } from "./pages/ExamplesGallery.tsx";
import { ExampleViewer } from "./pages/ExampleViewer.tsx";
import { Home } from "./pages/Home.tsx";

const SIDEBAR_PAGES = new Set(["example", "docs", "doc"]);

export function App() {
	const route = useHashRoute();
	const [opened, { toggle, close }] = useDisclosure();

	const hasSidebar = SIDEBAR_PAGES.has(route.page);

	const renderSidebar = () => {
		if (route.page === "example") {
			return <ExampleSidebar activeId={route.param} onClose={close} />;
		}
		if (route.page === "docs" || route.page === "doc") {
			return <DocSidebar activeId={route.param} onClose={close} />;
		}
		return undefined;
	};

	const renderPage = () => {
		switch (route.page) {
			case "home":
				return <Home />;
			case "examples":
				return <ExamplesGallery />;
			case "example":
				return <ExampleViewer exampleId={route.param} />;
			case "docs":
				return <DocsLanding />;
			case "doc":
				return <DocViewer classId={route.param} />;
			default:
				return <Home />;
		}
	};

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={
				hasSidebar
					? { width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }
					: undefined
			}
			padding="md"
		>
			<AppShell.Header>
				<NavHeader opened={opened} onToggle={toggle} />
			</AppShell.Header>

			{hasSidebar && (
				<AppShell.Navbar p="md">{renderSidebar()}</AppShell.Navbar>
			)}

			<AppShell.Main>{renderPage()}</AppShell.Main>
		</AppShell>
	);
}
