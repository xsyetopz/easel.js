import { useEffect, useState } from "react";
import {
	type AppRoute,
	parseCurrentRoute,
	upgradeLegacyHashRoute,
} from "../routes.ts";

export function useRoute(initialRoute?: AppRoute) {
	const [route, setRoute] = useState<AppRoute>(() => {
		if (initialRoute) return initialRoute;
		return parseCurrentRoute();
	});

	useEffect(() => {
		if (typeof window === "undefined") return;

		if (upgradeLegacyHashRoute()) {
			setRoute(parseCurrentRoute());
		}

		const handleRouteChange = () => {
			if (upgradeLegacyHashRoute()) {
				setRoute(parseCurrentRoute());
				return;
			}
			setRoute(parseCurrentRoute());
		};

		window.addEventListener("popstate", handleRouteChange);
		window.addEventListener("hashchange", handleRouteChange);

		return () => {
			window.removeEventListener("popstate", handleRouteChange);
			window.removeEventListener("hashchange", handleRouteChange);
		};
	}, []);

	return route;
}
