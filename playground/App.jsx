import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DocSidebar } from "./components/DocSidebar.jsx";
import { ExampleSidebar } from "./components/ExampleSidebar.jsx";
import { NavHeader } from "./components/NavHeader.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { DocsLanding } from "./pages/DocsLanding.jsx";
import { DocViewer } from "./pages/DocViewer.jsx";
import { ExamplesGallery } from "./pages/ExamplesGallery.jsx";
import { ExampleViewer } from "./pages/ExampleViewer.jsx";
import { Home } from "./pages/Home.jsx";

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
		return null;
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
