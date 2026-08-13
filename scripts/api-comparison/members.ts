import {
  isBinaryExpression,
  isClassDeclaration,
  isGetAccessorDeclaration,
  isIdentifier,
  isMethodDeclaration,
  isMethodSignature,
  isPropertyAccessExpression,
  isSetAccessorDeclaration,
  SignatureKind,
  SymbolFlags,
  SyntaxKind,
} from "typescript-api";
import type {
  Declaration,
  Node,
  Symbol as TypeScriptSymbol,
  Type,
} from "typescript-api";
import {
  hasModifier,
  isPrivateName,
  parseDoc,
  precedingJsDoc,
  typeOfSymbol,
  typeParameterNamesText,
} from "./text.ts";
import { signatureList, signatureText } from "./signatures.ts";
import {
  isDocOnlyDeclaration,
  publicDeclaration,
} from "./resolution.ts";
import type { ExtractionContext, ParsedDoc, PublicFact } from "./types.ts";

function isNodeWithin(node: Node, container: Node): boolean {
  const source = node.getSourceFile();
  return (
    source === container.getSourceFile() &&
    node.getStart(source) >= container.getStart(container.getSourceFile()) &&
    node.getEnd() <= container.getEnd()
  );
}

function isOwnedClassMember(
  context: ExtractionContext,
  classDeclaration: Declaration,
  node: Node,
  scope: "instance" | "static",
): boolean {
  if (isNodeWithin(node, classDeclaration)) return true;
  if (
    scope !== "static" ||
    !isPropertyAccessExpression(node) ||
    !isBinaryExpression(node.parent) ||
    node.parent.left !== node ||
    !isIdentifier(node.expression)
  ) {
    return false;
  }
  const ownerSymbol = context.checker.getSymbolAtLocation(node.expression);
  if (!ownerSymbol) return false;
  const resolvedOwner =
    ownerSymbol.flags & SymbolFlags.Alias
      ? context.checker.getAliasedSymbol(ownerSymbol)
      : ownerSymbol;
  return (resolvedOwner.declarations ?? []).some((candidate) =>
    isNodeWithin(candidate, classDeclaration),
  );
}

function memberDocs(declarations: readonly Node[]): ParsedDoc {
  const merged: ParsedDoc = {
    internal: false,
    params: new Map(),
    private: false,
    readonly: false,
  };
  for (const declaration of declarations) {
    const docs = parseDoc(precedingJsDoc(declaration));
    merged.readonly ||= docs.readonly;
    merged.private ||= docs.private;
    merged.internal ||= docs.internal;
    if (docs.type) merged.type = docs.type;
    if (docs.returns) merged.returns = docs.returns;
    for (const [name, parameter] of docs.params) {
      merged.params.set(name, parameter);
    }
  }
  return merged;
}

function fieldShape(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  declarations: readonly Node[],
  scope: string,
): string {
  const docs = memberDocs(declarations);
  let readonly = docs.readonly;
  for (const memberDeclaration of declarations) {
    readonly ||= hasModifier(memberDeclaration, SyntaxKind.ReadonlyKeyword);
  }
  const mode = readonly ? "ro" : "rw";
  const firstDeclaration = declarations[0] ?? context.root;
  const type = docs.type ?? typeOfSymbol(context, symbol, firstDeclaration);
  return `${scope} ${mode} ${type}`;
}

function accessorShape(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  declarations: readonly Node[],
  scope: string,
): string {
  const readable = declarations.some(isGetAccessorDeclaration);
  const writable = declarations.some(isSetAccessorDeclaration);
  let mode = "w";
  if (readable && writable) mode = "rw";
  else if (readable) mode = "r";
  const firstDeclaration = declarations[0] ?? context.root;
  const docs = memberDocs(declarations);
  const type = docs.type ?? typeOfSymbol(context, symbol, firstDeclaration);
  return `${scope} ${mode} ${type}`;
}

function isAccessorMember(declarations: readonly Node[]): boolean {
  return declarations.some(
    (node) => isGetAccessorDeclaration(node) || isSetAccessorDeclaration(node),
  );
}

function isMethodMember(declarations: readonly Node[]): boolean {
  return declarations.some(
    (node) => isMethodDeclaration(node) || isMethodSignature(node),
  );
}

interface MemberFactOptions {
  context: ExtractionContext;
  owner: string;
  member: TypeScriptSymbol;
  declarations: readonly Node[];
  scope: "instance" | "static";
}

function memberFact(options: MemberFactOptions): PublicFact {
  const { context, declarations, member, owner, scope } = options;
  const subject = `${owner}.${member.name}`;
  if (isAccessorMember(declarations)) {
    return {
      kind: "accessor",
      shape: accessorShape(context, member, declarations, scope),
      subject,
    };
  }
  if (isMethodMember(declarations)) {
    const firstDeclaration = declarations[0];
    const callType = context.checker.getTypeOfSymbolAtLocation(
      member,
      firstDeclaration,
    );
    return {
      kind: "method",
      shape: `${scope} ${signatureList(
        context,
        declarations,
        callType,
        memberDocs(declarations).returns,
      )}`,
      subject,
    };
  }
  return {
    kind: "field",
    shape: fieldShape(context, member, declarations, scope),
    subject,
  };
}

function classMemberDeclarations(
  context: ExtractionContext,
  classDeclaration: Declaration,
  member: TypeScriptSymbol,
  scope: "instance" | "static",
): Node[] {
  const allDeclarations = (member.declarations ?? []).filter(
    (node) =>
      !isDocOnlyDeclaration(node) &&
      isOwnedClassMember(context, classDeclaration, node, scope),
  );
  if (allDeclarations.some((node) => !publicDeclaration(node, member.name))) {
    return [];
  }
  return allDeclarations.filter((node) =>
    publicDeclaration(node, member.name),
  );
}

interface ClassMembersOptions {
  context: ExtractionContext;
  classDeclaration: Declaration;
  owner: string;
  type: Type;
  scope: "instance" | "static";
}

function classMembers(options: ClassMembersOptions): PublicFact[] {
  const { classDeclaration, context, owner, scope, type } = options;
  const facts: PublicFact[] = [];
  for (const member of context.checker.getPropertiesOfType(type)) {
    if (member.name === "prototype" || isPrivateName(member.name)) continue;
    const declarations = classMemberDeclarations(
      context,
      classDeclaration,
      member,
      scope,
    );
    if (declarations.length > 0) {
      facts.push(
        memberFact({ context, declarations, member, owner, scope }),
      );
    }
  }
  return facts;
}

export function classFacts(
  context: ExtractionContext,
  symbol: TypeScriptSymbol,
  declaration: Declaration,
  owner: string,
): PublicFact[] {
  const facts: PublicFact[] = [];
  const genericOwner = `${owner}${isClassDeclaration(declaration) ? typeParameterNamesText(declaration) : ""}`;
  const instanceType = context.checker.getDeclaredTypeOfSymbol(symbol);
  const staticType = context.checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const constructorSignatures = context.checker.getSignaturesOfType(
    staticType,
    SignatureKind.Construct,
  );
  const constructorDeclarations = constructorSignatures
    .map((signature) => signature.getDeclaration())
    .filter(
      (item): item is import("typescript-api").SignatureDeclaration =>
        Boolean(item),
    );
  const constructorsPublic = constructorDeclarations.every((item) =>
    publicDeclaration(item, "constructor"),
  );
  let constructors: string[] = [];
  if (constructorSignatures.length > 0 && constructorsPublic) {
    constructors = constructorSignatures.map((signature) =>
      signatureText(context, signature, {
        declaration: signature.getDeclaration(),
        returnOverride: genericOwner,
        typeContext: declaration,
        includeTypeParameters: false,
      }),
    );
  } else if (constructorsPublic) {
    constructors = [`() => ${genericOwner}`];
  }
  if (constructors.length > 0) {
    facts.push({
      kind: "constructor",
      shape: `instance ${[...new Set(constructors)].join(" | ")}`,
      subject: `${owner}.constructor`,
    });
  }
  facts.push(
    ...classMembers({
      classDeclaration: declaration,
      context,
      owner,
      scope: "instance",
      type: instanceType,
    }),
    ...classMembers({
      classDeclaration: declaration,
      context,
      owner,
      scope: "static",
      type: staticType,
    }),
  );
  return facts;
}
