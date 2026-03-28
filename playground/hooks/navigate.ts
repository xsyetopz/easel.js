import { routeToPath } from "../routes.ts";

/**
 * Navigate to a path route.
 * @param {string} path - Route path without leading slash, e.g. "examples/hello-cube"
 */
export function navigate(path: string) {
	if (typeof window === "undefined") return;

	const nextPath = routeToPath(path);
	if (window.location.pathname === nextPath) return;

	window.history.pushState({}, "", nextPath);
	window.dispatchEvent(new PopStateEvent("popstate"));
}
