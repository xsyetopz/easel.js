import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import process from "node:process";
import * as ts from "typescript-api";

interface ApiProperty {
  access: "read-only" | "read/write" | "write-only";
  description: string;
  name: string;
  type: string;
}

interface ApiMethod {
  description: string;
  signature: string;
}

interface ApiDoc {
  category: string;
  description: string;
  kind: "class" | "constant" | "function" | "interface" | "type";
  methods: ApiMethod[];
  name: string;
  properties: ApiProperty[];
  signature: string;
  sourcePath: string;
}

const ROOT = path.resolve(import.meta.dir, "..");
const SRC_ROOT = path.join(ROOT, "src");
const ENTRY = path.join(SRC_ROOT, "index.ts");
const DOCS_ROOT = path.join(ROOT, "www", "astro", "content", "docs", "docs");
const TYPE_FORMAT =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

const CATEGORY_NAMES: Record<string, string> = {
  animation: "Animation",
  cameras: "Cameras",
  controls: "Controls",
  core: "Core",
  curves: "Curves",
  geometry: "Geometry",
  helpers: "Helpers",
  lights: "Lights",
  loaders: "Loaders",
  materials: "Materials",
  math: "Math",
  objects: "Objects",
  pipeline: "Pipeline",
  physics: "Physics",
  renderers: "Renderers",
  scenes: "Scene",
  textures: "Textures",
  utils: "Utilities",
};

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
  if (parameters?.length) return `Parameters: ${parameters.join("; ")}.`;
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
  const typeParameters = declaration.typeParameters?.length
    ? `<${declaration.typeParameters.map((item) => normalizeWhitespace(item.getText())).join(", ")}>`
    : "";
  const heritage = declaration.heritageClauses?.length
    ? ` ${declaration.heritageClauses.map((item) => normalizeWhitespace(item.getText())).join(" ")}`
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

function extractDocs(): ApiDoc[] {
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

function frontMatter(doc: ApiDoc, sidebarOrder: number): string {
  return [
    "---",
    `title: ${JSON.stringify(doc.name)}`,
    `description: ${JSON.stringify(doc.description)}`,
    "sidebar:",
    `  order: ${sidebarOrder}`,
    `  label: ${JSON.stringify(doc.name)}`,
    "---",
    "",
  ].join("\n");
}

function escapeMdxText(value: string): string {
  return value.replace(/[{}]/gu, "\\$&");
}

function escapeTable(value: string): string {
  return escapeMdxText(value)
    .replace(/\|/gu, "\\|")
    .replace(/\n/gu, " ")
    .replace(/`/gu, "\\`");
}

function code(value: string): string {
  return `\`${escapeTable(value)}\``;
}

function docMarkdown(doc: ApiDoc, sidebarOrder: number): string {
  const parts = [
    frontMatter(doc, sidebarOrder),
    `> Generated from \`${doc.sourcePath}\`. Edit the source declaration or its JSDoc, then run \`bun run docs:generate\`.`,
    "",
    "```ts",
    doc.signature,
    "```",
    "",
    escapeMdxText(doc.description),
    "",
  ];
  if (doc.properties.length > 0) {
    parts.push(
      "## Properties",
      "",
      "| Name | Access | Type | Description |",
      "| --- | --- | --- | --- |",
    );
    for (const property of doc.properties) {
      parts.push(
        `| ${code(property.name)} | ${property.access} | ${code(property.type)} | ${escapeTable(property.description)} |`,
      );
    }
    parts.push("");
  }
  if (doc.methods.length > 0) {
    parts.push(
      "## Methods",
      "",
      "| Signature | Description |",
      "| --- | --- |",
    );
    for (const method of doc.methods) {
      parts.push(
        `| ${code(method.signature)} | ${escapeTable(method.description)} |`,
      );
    }
    parts.push("");
  }
  return `${parts.join("\n")}\n`;
}

function categorySlug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");
}

export function generateSourceDocs(): Map<string, string> {
  const docs = extractDocs();
  const output = new Map<string, string>();
  const categoryCounts = new Map<string, number>();
  const caseFoldedNames = new Map<string, number>();
  for (const doc of docs) {
    const key = `${doc.category}/${doc.name}`.toLocaleLowerCase("en-US");
    caseFoldedNames.set(key, (caseFoldedNames.get(key) ?? 0) + 1);
  }
  for (const doc of docs) {
    const order = (categoryCounts.get(doc.category) ?? 0) + 1;
    categoryCounts.set(doc.category, order);
    const foldedKey = `${doc.category}/${doc.name}`.toLocaleLowerCase("en-US");
    const fileName =
      caseFoldedNames.get(foldedKey) === 1
        ? doc.name
        : `${doc.name}-${doc.kind}`;
    output.set(
      path.join(categorySlug(doc.category), `${fileName}.md`),
      docMarkdown(doc, order),
    );
  }
  const categories = [...categoryCounts.entries()].sort(([left], [right]) =>
    lexicalCompare(left, right),
  );
  output.set(
    "index.md",
    `---\ntitle: "EASEL.js API Reference"\ndescription: "Source-generated TypeScript API reference for EASEL.js."\nsidebar:\n  order: 1\n  label: "Overview"\n---\n\nThis reference is generated from the public exports in \`src/index.ts\` and the declarations and JSDoc in \`src/\`. Do not edit generated pages.\n\n## Categories\n\n${categories.map(([category, count]) => `- **${category}**: ${count}`).join("\n")}\n`,
  );
  return output;
}

async function currentMarkdownFiles(
  root: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  async function walk(directory: string): Promise<void> {
    let entries: Dirent<string>[];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.name.endsWith(".md")) {
        files.set(
          path.relative(root, absolute),
          await readFile(absolute, "utf8"),
        );
      }
    }
  }
  await walk(root);
  return files;
}

async function checkGenerated(expected: Map<string, string>): Promise<void> {
  const current = await currentMarkdownFiles(DOCS_ROOT);
  const paths = new Set([...expected.keys(), ...current.keys()]);
  const stale = [...paths].filter(
    (file) => expected.get(file) !== current.get(file),
  );
  if (stale.length > 0) {
    throw new Error(
      `Generated API docs are stale:\n${stale.map((file) => `- ${file}`).join("\n")}\nRun bun run docs:generate.`,
    );
  }
}

async function writeGenerated(output: Map<string, string>): Promise<void> {
  await rm(DOCS_ROOT, { recursive: true, force: true });
  for (const [relative, content] of output) {
    const destination = path.join(DOCS_ROOT, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

async function main(): Promise<void> {
  const output = generateSourceDocs();
  if (process.argv.includes("--check")) await checkGenerated(output);
  else await writeGenerated(output);
  console.log(`Generated ${output.size - 1} source API docs.`);
}

if (import.meta.main) await main();
