import { MantineProvider } from "@mantine/core";
import { App } from "./App.tsx";
import type { InitialPayload } from "./initialPayload.ts";
import type { AppRoute } from "./routes.ts";
import { theme } from "./theme.ts";

interface RootProps {
	initialRoute?: AppRoute;
	initialPayload?: InitialPayload;
}

export function Root({ initialRoute, initialPayload }: RootProps) {
	return (
		<MantineProvider theme={theme} defaultColorScheme="auto">
			<App initialRoute={initialRoute} initialPayload={initialPayload} />
		</MantineProvider>
	);
}
