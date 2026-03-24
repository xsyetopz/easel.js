import { useEffect, useState } from "react";

const HASH_PREFIX_PATTERN = /^#\/?/;

/**
 * Parses the current hash into a route descriptor.
 * @returns {{ page: "home"|"examples"|"example"|"docs"|"doc", param: string|null }}
 */
function parseHash() {
	const raw = window.location.hash.replace(HASH_PREFIX_PATTERN, "");
	if (!raw || raw === "/") return { page: "home", param: null };

	const segments = raw.split("/").filter(Boolean);
	if (segments[0] === "examples") {
		if (segments[1]) return { page: "example", param: segments[1] };
		return { page: "examples", param: null };
	}
	if (segments[0] === "docs") {
		if (segments[1]) return { page: "doc", param: segments[1] };
		return { page: "docs", param: null };
	}
	return { page: "home", param: null };
}

/**
 * Hash-based routing hook. No dependencies required.
 * @returns {{ page: string, param: string|null }}
 */
export function useHashRoute() {
	const [route, setRoute] = useState(parseHash);

	useEffect(() => {
		const handler = () => setRoute(parseHash());
		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, []);

	return route;
}
