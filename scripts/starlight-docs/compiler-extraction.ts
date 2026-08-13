import path from "node:path";
import * as ts from "typescript-api";
import {
	CATEGORY_NAMES,
	ENTRY,
	lexicalCompare,
	ROOT,
	SRC_ROOT,
	TYPE_FORMAT,
	type ApiDoc,
	type ApiMethod,
	type ApiProperty,
} from "./api-model.ts";

function normalizeWhitespace(value: string): string {
	return value.replaceAll(/\s+/gu, " ").trim();
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	return Boolean(
		ts.canHaveModifiers(node) &&
			ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
	);
}

function declarationName(node: ts.Node): string {
	const name = (node as ts.NamedDeclaration).name;
	if (!name) return "";
	return ts.isIdentifier(name) || ts.isPrivateIdentifier(name)
		? name.text
		: normalizeWhitespace(name.getText(name.getSourceFile()));
}

function isPublicDeclaration(node: ts.Declaration): boolean {
	const name = declarationName(node);
	return !(
		name.startsWith("#") ||
		hasModifier(node, ts.SyntaxKind.PrivateKeyword) ||
		hasModifier(node, ts.SyntaxKind.ProtectedKeyword)
	);
}

function resolveExport(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
	return symbol.flags & ts.SymbolFlags.Alias
		? checker.getAliasedSymbol(symbol)
		: symbol;
}

function declarationFor(symbol: ts.Symbol): ts.Declaration {
	const declarations = (symbol.declarations ?? []).filter(
		(declaration) =>
			!ts.isExportSpecifier(declaration) &&
			declaration.getSourceFile().fileName.startsWith(SRC_ROOT),
	);
	const declaration = symbol.valueDeclaration ?? declarations[0];
	if (!declaration) {
		throw new Error(`Cannot locate source declaration for ${symbol.name}.`);
	}
	return declaration;
}

function documentation(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	subject: string,
): string {
	const normalized = symbolDocumentation(checker, symbol);
	if (!normalized) throw new Error(`Missing public JSDoc for ${subject}.`);
	return normalized;
}

function symbolDocumentation(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
): string {
	return normalizeWhitespace(
		ts.displayPartsToString(symbol.getDocumentationComment(checker)),
	);
}

function documentationForNode(
	checker: ts.TypeChecker,
	node: ts.Node,
	subject: string,
): string {
	const name = (node as ts.NamedDeclaration).name;
	const symbol = name ? checker.getSymbolAtLocation(name) : undefined;
	const symbolDescription = symbol ? symbolDocumentation(checker, symbol) : "";
	if (symbolDescription) return symbolDescription;
	const jsDoc = ts
		.getJSDocCommentsAndTags(node)
		.find((comment): comment is ts.JSDoc => ts.isJSDoc(comment));
	if (!jsDoc) throw new Error(`Missing public JSDoc for ${subject}.`);
	const summary = normalizeWhitespace(
		ts.getTextOfJSDocComment(jsDoc.comment) ?? "",
	);
	if (summary) return summary;
	const parameters = jsDoc.tags
		?.filter((tag): tag is ts.JSDocParameterTag => ts.isJSDocParameterTag(tag))
		.map((tag) => {
			const description = normalizeWhitespace(
				ts.getTextOfJSDocComment(tag.comment) ?? "",
			);
			return description
				? `${tag.name.getText()} — ${description}`
				: tag.name.getText();
		});
	if (parameters && parameters.length > 0) {
		return `Parameters: ${parameters.join("; ")}.`;
	}
	return "Documented public member.";
}

function typeText(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	declaration: ts.Node,
): string {
	const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
	return normalizeWhitespace(
		checker.typeToString(type, declaration, TYPE_FORMAT),
	);
}

function signatureText(
	checker: ts.TypeChecker,
	signature: ts.Signature,
	declaration: ts.Node,
): string {
	return normalizeWhitespace(
		checker.signatureToString(
			signature,
			declaration,
			TYPE_FORMAT,
			ts.SignatureKind.Call,
		),
	);
}

function sourceRelative(declaration: ts.Declaration): string {
	return path.relative(ROOT, declaration.getSourceFile().fileName);
}

function categoryFor(declaration: ts.Declaration): string {
	const relative = path.relative(
		SRC_ROOT,
		declaration.getSourceFile().fileName,
	);
	const owner = relative.split(path.sep)[0] ?? "core";
	return CATEGORY_NAMES[owner] ?? "Core";
}

function nodeWithin(node: ts.Node, owner: ts.Declaration): boolean {
	return (
		node.getSourceFile() === owner.getSourceFile() &&
		node.getStart() >= owner.getStart() &&
		node.getEnd() <= owner.getEnd()
	);
}

function ownedDeclarations(
	symbol: ts.Symbol,
	owner: ts.Declaration,
): ts.Declaration[] {
	return (symbol.declarations ?? []).filter(
		(declaration) =>
			nodeWithin(declaration, owner) && isPublicDeclaration(declaration),
	);
}

function propertyAccess(
	declarations: readonly ts.Declaration[],
): ApiProperty["access"] {
	const readable = declarations.some(
		(declaration) => !ts.isSetAccessorDeclaration(declaration),
	);
	const writable = declarations.some(
		(declaration) =>
			ts.isSetAccessorDeclaration(declaration) ||
			((ts.isPropertyDeclaration(declaration) ||
				ts.isPropertySignature(declaration)) &&
				!hasModifier(declaration, ts.SyntaxKind.ReadonlyKeyword)),
	);
	return readable && writable
		? "read/write"
		: readable
			? "read-only"
			: "write-only";
}

function constructorParameters(
	checker: ts.TypeChecker,
	signature: ts.Signature,
	declaration: ts.Node,
): string {
	const text = signatureText(checker, signature, declaration);
	const end = text.lastIndexOf("):");
	return end >= 0 ? text.slice(0, end + 1) : text;
}

function ownerMembers(
	checker: ts.TypeChecker,
	ownerSymbol: ts.Symbol,
	owner: ts.Declaration,
): { methods: ApiMethod[]; properties: ApiProperty[] } {
	const ownerType = checker.getDeclaredTypeOfSymbol(ownerSymbol);
	const methods: ApiMethod[] = [];
	const properties: ApiProperty[] = [];

	for (const member of checker.getPropertiesOfType(ownerType)) {
		const declarations = ownedDeclarations(member, owner);
		if (declarations.length === 0) continue;
		const declaration = declarations[0];
		const name = declarationName(declaration);
		const description =
			symbolDocumentation(checker, member) ||
			documentationForNode(checker, declaration, `${ownerSymbol.name}.${name}`);
		const method = declarations.some(
			(item) => ts.isMethodDeclaration(item) || ts.isMethodSignature(item),
		);
		if (method) {
			const memberType = checker.getTypeOfSymbolAtLocation(member, declaration);
			for (const signature of checker.getSignaturesOfType(
				memberType,
				ts.SignatureKind.Call,
			)) {
				methods.push({
					description,
					signature: `${name}${signatureText(checker, signature, declaration)}`,
				});
			}
			continue;
		}
		properties.push({
			access: propertyAccess(declarations),
			description,
			name,
			type: typeText(checker, member, declaration),
		});
	}

	if (ts.isClassDeclaration(owner)) {
		for (const declaration of owner.members) {
			if (
				!(
					ts.isConstructorDeclaration(declaration) &&
					isPublicDeclaration(declaration)
				)
			) {
				continue;
			}
			const signature = checker.getSignatureFromDeclaration(declaration);
			if (!signature) continue;
			methods.push({
				description: documentationForNode(
					checker,
					declaration,
					`${ownerSymbol.name}.constructor`,
				),
				signature: `new ${ownerSymbol.name}${constructorParameters(checker, signature, declaration)}`,
			});
		}
	}

	methods.sort((left, right) =>
		lexicalCompare(left.signature, right.signature),
	);
	properties.sort((left, right) => lexicalCompare(left.name, right.name));
	return { methods, properties };
}

function classSignature(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	declaration: ts.ClassDeclaration,
): string {
	const typeParameterNodes = declaration.typeParameters;
	const typeParameters =
		typeParameterNodes && typeParameterNodes.length > 0
			? `<${typeParameterNodes.map((item) => normalizeWhitespace(item.getText())).join(", ")}>`
			: "";
	const heritageClauses = declaration.heritageClauses;
	const heritage =
		heritageClauses && heritageClauses.length > 0
			? ` ${heritageClauses.map((item) => normalizeWhitespace(item.getText())).join(" ")}`
			: "";
	const lines = [`class ${symbol.name}${typeParameters}${heritage}`];
	const staticType = checker.getTypeOfSymbolAtLocation(symbol, declaration);
	for (const signature of checker.getSignaturesOfType(
		staticType,
		ts.SignatureKind.Construct,
	)) {
		lines.push(
			`new ${symbol.name}${constructorParameters(checker, signature, declaration)}`,
		);
	}
	return lines.join("\n");
}

function topLevelSignature(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	declaration: ts.Declaration,
): { kind: ApiDoc["kind"]; signature: string } {
	if (ts.isClassDeclaration(declaration)) {
		return {
			kind: "class",
			signature: classSignature(checker, symbol, declaration),
		};
	}
	if (ts.isInterfaceDeclaration(declaration)) {
		return { kind: "interface", signature: declaration.getText() };
	}
	if (ts.isTypeAliasDeclaration(declaration)) {
		return { kind: "type", signature: declaration.getText() };
	}
	if (symbol.flags & ts.SymbolFlags.Function) {
		const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
		const signatures = checker
			.getSignaturesOfType(type, ts.SignatureKind.Call)
			.map(
				(signature) =>
					`function ${symbol.name}${signatureText(checker, signature, declaration)}`,
			);
		return { kind: "function", signature: signatures.join("\n") };
	}
	return {
		kind: "constant",
		signature: `const ${symbol.name}: ${typeText(checker, symbol, declaration)}`,
	};
}

export function extractDocs(): ApiDoc[] {
	const rootNames = ts.sys.readDirectory(SRC_ROOT, [".ts", ".tsx"], undefined, [
		"**/*",
	]);
	const program = ts.createProgram({
		options: {
			allowImportingTsExtensions: true,
			module: ts.ModuleKind.NodeNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext,
			noEmit: true,
			skipLibCheck: true,
			strict: true,
			target: ts.ScriptTarget.ES2022,
		},
		rootNames,
	});
	const checker = program.getTypeChecker();
	const entry = program.getSourceFile(ENTRY);
	if (!entry) throw new Error(`Missing public entrypoint: ${ENTRY}`);
	const moduleSymbol = checker.getSymbolAtLocation(entry);
	if (!moduleSymbol)
		throw new Error(`Cannot resolve public entrypoint: ${ENTRY}`);

	const docs: ApiDoc[] = [];
	for (const exported of checker.getExportsOfModule(moduleSymbol)) {
		const symbol = resolveExport(checker, exported);
		const declaration = declarationFor(symbol);
		const description = documentation(checker, symbol, exported.name);
		const { kind, signature } = topLevelSignature(checker, symbol, declaration);
		const members =
			symbol.flags &
			(ts.SymbolFlags.Class |
				ts.SymbolFlags.Interface |
				ts.SymbolFlags.TypeAlias)
			? ownerMembers(checker, symbol, declaration)
			: { methods: [], properties: [] };
		docs.push({
			category: categoryFor(declaration),
			description,
			kind,
			methods: members.methods,
			name: exported.name,
			properties: members.properties,
			signature,
			sourcePath: sourceRelative(declaration),
		});
	}
	return docs.sort(
		(left, right) =>
			lexicalCompare(left.category, right.category) ||
			lexicalCompare(left.name, right.name),
	);
}
