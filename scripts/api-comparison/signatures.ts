import {
  SignatureKind,
  SymbolFlags,
  TypeFormatFlags,
  isFunctionLike,
  isIdentifier,
  isParameter,
  isTypeParameterDeclaration,
} from "typescript-api";
import type {
  Node,
  ParameterDeclaration,
  Symbol as TypeScriptSymbol,
  Type,
} from "typescript-api";
import {
  declarationName,
  normalizeWhitespace,
  parseDoc,
  precedingJsDoc,
  sourceText,
  typeOfSymbol,
  typeText,
} from "./text.ts";
import type {
  DocumentedParameter,
  ExtractionContext,
  SignatureLike,
  SignatureTextOptions,
} from "./types.ts";

const SIGNATURE_HAS_REST_PARAMETER = 1;

function signatureTypeParametersText(
  context: ExtractionContext,
  signature: SignatureLike,
  node: Node,
): string {
  const parameters = signature.getTypeParameters?.();
  if (!parameters || parameters.length === 0) return "";
  const text = parameters.map((parameter) => {
    const declaration = parameter.symbol?.declarations?.find(
      isTypeParameterDeclaration,
    );
    if (declaration) {
      return normalizeWhitespace(
        declaration.getText(declaration.getSourceFile()),
      );
    }
    const name = parameter.symbol?.name ?? "T";
    const constraint = parameter.getConstraint();
    const defaultType = parameter.getDefault();
    const constraintText = constraint
      ? normalizeWhitespace(
          context.checker.typeToString(
            constraint,
            node,
            TypeFormatFlags.NoTruncation |
              TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
      : "";
    const defaultText = defaultType
      ? normalizeWhitespace(
          context.checker.typeToString(
            defaultType,
            node,
            TypeFormatFlags.NoTruncation |
              TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          ),
        )
      : "";
    const extendsText =
      constraintText && constraintText !== "any"
        ? ` extends ${constraintText}`
        : "";
    const defaultSuffix =
      defaultText && defaultText !== "any" ? ` = ${defaultText}` : "";
    return `${name}${extendsText}${defaultSuffix}`;
  });
  return `<${text.join(", ")}>`;
}

function isOptionalParameter(
  node: ParameterDeclaration,
  docs: ReturnType<typeof parseDoc>,
): boolean {
  return Boolean(
    node.questionToken ||
      node.initializer ||
      node.dotDotDotToken ||
      docs.params.get(declarationName(node))?.optional,
  );
}

function parameterText(
  context: ExtractionContext,
  node: ParameterDeclaration,
  docs: ReturnType<typeof parseDoc> = parseDoc(precedingJsDoc(node.parent)),
  typeOverride?: string,
): string {
  const name = declarationName(node) || "arg";
  const documented = isIdentifier(node.name)
    ? docs.params.get(node.name.text)
    : undefined;
  const type = typeText(
    context,
    node,
    typeOverride ??
      node.type?.getText(node.getSourceFile()) ??
      documented?.type,
  );
  const optional = isOptionalParameter(node, docs);
  const rest = Boolean(node.dotDotDotToken);
  const defaultText = node.initializer
    ? normalizeWhitespace(sourceText(node.initializer))
    : documented?.defaultText;
  const prefix = rest ? "..." : "";
  const question = optional && !rest && !defaultText ? "?" : "";
  const defaultSuffix = defaultText ? ` = ${defaultText}` : "";
  return `${prefix}${name}${question}: ${type}${defaultSuffix}`;
}

interface FallbackParameterOptions {
  context: ExtractionContext;
  symbol: TypeScriptSymbol;
  index: number;
  declaration: Node;
  docs: ReturnType<typeof parseDoc>;
  documented?: DocumentedParameter;
  signatureRest: boolean;
  typeContext?: Node;
}

function fallbackParameterText(options: FallbackParameterOptions): string {
  const {
    context,
    declaration,
    docs,
    documented,
    index,
    signatureRest,
    symbol,
    typeContext,
  } = options;
  const parameter = symbol.valueDeclaration;
  if (parameter && isParameter(parameter)) {
    const contextualType =
      parameter.getSourceFile() === (typeContext ?? declaration).getSourceFile()
        ? undefined
        : typeOfSymbol(context, symbol, typeContext ?? declaration);
    return parameterText(context, parameter, docs, contextualType);
  }
  const type = documented?.type ?? typeOfSymbol(context, symbol, declaration);
  const optional =
    documented?.optional ?? Boolean(symbol.flags & SymbolFlags.Optional);
  const rest = signatureRest || Boolean(documented?.rest);
  const defaultText = documented?.defaultText;
  const name = documented?.name ?? symbol.name ?? `arg${index}`;
  const question = optional && !rest && !defaultText ? "?" : "";
  const defaultSuffix = defaultText ? ` = ${defaultText}` : "";
  return `${rest ? "..." : ""}${name}${question}: ${type}${defaultSuffix}`;
}

function documentedParameterText(parameter: DocumentedParameter): string {
  const prefix = parameter.rest ? "..." : "";
  const question =
    parameter.optional && !parameter.rest && !parameter.defaultText ? "?" : "";
  const type = parameter.type ?? "unknown";
  const defaultSuffix = parameter.defaultText
    ? ` = ${parameter.defaultText}`
    : "";
  return `${prefix}${parameter.name}${question}: ${type}${defaultSuffix}`;
}

export function signatureText(
  context: ExtractionContext,
  signature: SignatureLike,
  options: SignatureTextOptions = {},
): string {
  const declarationNode =
    options.declaration ?? signature.getDeclaration() ?? context.root;
  const docs = parseDoc(precedingJsDoc(declarationNode));
  const orderedDocs = [...docs.params.entries()].map(([name, value]) => ({
    name,
    ...value,
  }));
  const signatureRest = Boolean(
    (signature.flags ?? 0) & SIGNATURE_HAS_REST_PARAMETER,
  );
  const usedDocs = new Set<string>();
  const parameters = signature.parameters.map((parameter, index) => {
    const byName = orderedDocs.find(
      (item) => item.name === parameter.name && !usedDocs.has(item.name),
    );
    const byPosition = orderedDocs.find((item) => !usedDocs.has(item.name));
    const documented = byName ?? byPosition;
    if (documented) usedDocs.add(documented.name);
    return fallbackParameterText({
      context,
      declaration: declarationNode,
      docs,
      documented,
      index,
      signatureRest:
        signatureRest && index === signature.parameters.length - 1,
      symbol: parameter,
      typeContext: options.typeContext,
    });
  });
  for (const documented of orderedDocs) {
    if (!usedDocs.has(documented.name)) {
      parameters.push(documentedParameterText(documented));
    }
  }

  let returnType = options.returnOverride;
  returnType ??= docs.returns;
  if (!returnType) {
    try {
      returnType = normalizeWhitespace(
        context.checker.typeToString(
          signature.getReturnType(),
          declarationNode,
          TypeFormatFlags.NoTruncation |
            TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
        ),
      );
    } catch {
      returnType = "unknown";
    }
  }
  const typeParameters = options.includeTypeParameters === false
    ? ""
    : signatureTypeParametersText(context, signature, declarationNode);
  return `${typeParameters}(${parameters.join(", ")}) => ${returnType}`;
}

export function signatureList(
  context: ExtractionContext,
  declarations: readonly Node[],
  callType: Type,
  returnOverride?: string,
): string {
  const results: string[] = [];
  for (const declaration of declarations) {
    if (!isFunctionLike(declaration)) continue;
    const signature = context.checker.getSignatureFromDeclaration(declaration);
    if (signature) {
      results.push(
        signatureText(context, signature, {
          declaration,
          returnOverride,
        }),
      );
    }
  }
  if (results.length === 0) {
    for (const signature of context.checker.getSignaturesOfType(
      callType,
      SignatureKind.Call,
    )) {
      results.push(
        signatureText(context, signature, {
          declaration: signature.getDeclaration(),
          returnOverride,
        }),
      );
    }
  }
  const unique = [...new Set(results)];
  return unique.length > 0 ? unique.map(String).join(" | ") : "() => unknown";
}
