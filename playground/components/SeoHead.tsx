import { useEffect } from "react";
import type { AppRoute } from "../routes.ts";
import { applyPageMetadata, getPageMetadata } from "../seo.ts";

interface SeoHeadProps {
	route: AppRoute;
}

export function SeoHead({ route }: SeoHeadProps) {
	useEffect(() => {
		applyPageMetadata(getPageMetadata(route));
	}, [route]);

	return null;
}
