import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DocSidebar } from "./components/DocSidebar.tsx";
import { ExampleSidebar } from "./components/ExampleSidebar.tsx";
import { NavHeader } from "./components/NavHeader.tsx";
import { SeoHead } from "./components/SeoHead.tsx";
import { useRoute } from "./hooks/useRoute.ts";
import type { InitialPayload } from "./initialPayload.ts";
import { DocsLanding } from "./pages/DocsLanding.tsx";
import { DocViewer } from "./pages/DocViewer.tsx";
import { ExamplesGallery } from "./pages/ExamplesGallery.tsx";
import { ExampleViewer } from "./pages/ExampleViewer.tsx";
import { Home } from "./pages/Home.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import type { AppRoute } from "./routes.ts";

const SIDEBAR_PAGES = new Set(["example", "docs", "doc"]);

interface AppProps {
	initialRoute?: AppRoute;
	initialPayload?: InitialPayload;
}

export function App({ initialRoute, initialPayload }: AppProps) {
	const route = useRoute(initialRoute);
	const [opened, { toggle, close }] = useDisclosure();

	const hasSidebar = SIDEBAR_PAGES.has(route.page);

	const renderSidebar = () => {
		if (route.page === "example") {
			return (
				<ExampleSidebar
					activeId={route.param}
					initialCatalog={initialPayload?.exampleCatalog}
					onClose={close}
				/>
			);
		}
		if (route.page === "docs" || route.page === "doc") {
			return (
				<DocSidebar
					activeId={route.page === "doc" ? route.param : undefined}
					initialCatalog={initialPayload?.docCatalog}
					onClose={close}
				/>
			);
		}
		return undefined;
	};

	const renderPage = () => {
		switch (route.page) {
			case "home":
				return <Home />;
			case "examples":
				return (
					<ExamplesGallery initialCatalog={initialPayload?.exampleCatalog} />
				);
			case "example":
				return (
					<ExampleViewer
						exampleId={route.param}
						initialCatalog={initialPayload?.exampleCatalog}
						initialExample={initialPayload?.initialExample}
					/>
				);
			case "docs":
				return <DocsLanding initialCatalog={initialPayload?.docCatalog} />;
			case "doc":
				return (
					<DocViewer
						classId={route.param}
						initialCatalog={initialPayload?.docCatalog}
						initialDoc={initialPayload?.initialDoc}
					/>
				);
			case "landing":
				return <LandingPage slug={route.slug} />;
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
			<SeoHead route={route} />
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
