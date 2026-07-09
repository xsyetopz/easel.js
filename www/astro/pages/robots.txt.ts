import { SITE_ORIGIN } from "../../seo.ts";

export function GET() {
	return new Response(
		`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
		{
			headers: {
				"content-type": "text/plain; charset=utf-8",
			},
		},
	);
}
