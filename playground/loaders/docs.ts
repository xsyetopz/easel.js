export interface DocSummary {
	id: string;
	name: string;
	category: string;
	signature: string;
	description: string;
	threeEquivalent?: string | undefined;
	divergence?: string | undefined;
}

export interface DocProperty {
	name: string;
	type: string;
	description: string;
}

export interface DocMethod {
	name: string;
	signature: string;
	description: string;
}

export interface DocEntry extends DocSummary {
	properties: DocProperty[];
	methods: DocMethod[];
}

export interface DocCatalogData {
	docCategories: string[];
	docClasses: DocSummary[];
}

interface DocsModule {
	docCategories: string[];
	docClasses: DocEntry[];
}

async function loadDocsModule() {
	return (await import("../docs/classes.ts")) as DocsModule;
}

export async function loadDocCatalog(): Promise<DocCatalogData> {
	const { docCategories, docClasses } = await loadDocsModule();
	return {
		docCategories: [...docCategories],
		docClasses: docClasses.map((doc) => ({
			id: doc.id,
			name: doc.name,
			category: doc.category,
			signature: doc.signature,
			description: doc.description,
			threeEquivalent: doc.threeEquivalent,
			divergence: doc.divergence,
		})),
	};
}

export async function loadDocDetail(classId: string) {
	const { docClasses } = await loadDocsModule();
	return docClasses.find((doc) => doc.id === classId) ?? null;
}
