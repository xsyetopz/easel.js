import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject, ValidateFunction } from "ajv/dist/2020.js";
import Ajv2020 from "ajv/dist/2020.js";
import { parseMapping } from "./mapping.ts";
import type {
  ApiManifest,
  CompatibilityMapping,
  CompatibilityReport,
  VersionDiffReport,
} from "./types.ts";
import { SEMANTIC_STATUSES } from "./types.ts";

const kinds = new Set([
  "class",
  "interface",
  "enum",
  "function",
  "variable",
  "constant",
  "type",
  "namespace",
  "unknown",
]);
const surfaces = new Set([
  "easel",
  "three-core",
  "three-addons",
  "three-webgpu",
  "three-tsl",
]);
const memberKinds = new Set([
  "property",
  "accessor",
  "method",
  "constructor",
  "call",
  "index",
]);

function fail(message: string): never {
  throw new Error(`API compatibility validation failed: ${message}`);
}

function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${path} must be a non-empty string`);
  }
}

export type JsonSchema = AnySchemaObject;

const schemaDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../api-compat/schema",
);

function createAjv(): Ajv2020 {
  return new Ajv2020({
    allErrors: true,
    strict: true,
    strictSchema: true,
    strictTypes: true,
    validateFormats: true,
    validateSchema: true,
  });
}

function schemaError(name: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  return fail(`schema ${name} failed to compile: ${message}`);
}

function readSchema(path: string): JsonSchema {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return schemaError(path, new Error("schema root must be an object"));
    }
    return value as JsonSchema;
  } catch (error) {
    return schemaError(path, error);
  }
}

/**
 * Compile a schema with the complete Draft 2020-12 vocabulary.
 *
 * Ajv is deliberately configured in strict mode. An unsupported keyword or
 * format therefore fails generation instead of being silently ignored.
 */
export function compileJsonSchema(
  schema: JsonSchema,
  name = "inline schema",
): ValidateFunction {
  try {
    return createAjv().compile(schema);
  } catch (error) {
    return schemaError(name, error);
  }
}

/** Compile every checked-in schema before validating any generated artifact. */
export function compileCheckedInSchemas(
  directory = schemaDirectory,
): ReadonlyMap<string, ValidateFunction> {
  const ajv = createAjv();
  const schemas = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => [name, readSchema(resolve(directory, name))] as const);
  const validators = new Map<string, ValidateFunction>();
  for (const [name, schema] of schemas) {
    try {
      // Register every document before compiling any of them so external
      // references between checked-in schemas resolve independent of filename
      // ordering.
      ajv.addSchema(schema, name);
    } catch (error) {
      return schemaError(name, error);
    }
  }
  for (const [name] of schemas) {
    try {
      // getSchema compiles and resolves every local and external reference.
      const validator = ajv.getSchema(name);
      if (!validator) {
        return schemaError(name, new Error("Ajv returned no validator"));
      }
      validators.set(name, validator);
    } catch (error) {
      return schemaError(name, error);
    }
  }
  return validators;
}

const checkedSchemas = compileCheckedInSchemas();

function checkedSchema(name: string): ValidateFunction {
  const validator = checkedSchemas.get(name);
  if (!validator) {
    return fail(`checked-in schema ${name} is missing`);
  }
  return validator;
}

function formatValidationErrors(
  validator: ValidateFunction,
  pathPrefix = "",
): string {
  return (validator.errors ?? [])
    .map((error) => {
      const path = error.instancePath || "$";
      const detail =
        error.keyword === "additionalProperties" &&
        typeof error.params["additionalProperty"] === "string"
          ? ` '${error.params["additionalProperty"]}'`
          : "";
      return `${pathPrefix}${path}${detail} ${error.message ?? error.keyword}`;
    })
    .join("; ");
}

export function validateJsonSchema(
  value: unknown,
  schema: JsonSchema,
  _root: JsonSchema = schema,
  path = "",
): void {
  const validator = compileJsonSchema(schema);
  if (!validator(value)) {
    fail(formatValidationErrors(validator, path));
  }
}

function validateCheckedSchema(value: unknown, name: string): void {
  const validator = checkedSchema(name);
  if (!validator(value)) {
    fail(`${name}: ${formatValidationErrors(validator)}`);
  }
}

function validateSignature(value: unknown, path: string): void {
  if (!value || typeof value !== "object") {
    fail(`${path} must be an object`);
  }
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item["parameters"])) {
    fail(`${path}.parameters must be an array`);
  }
  item["parameters"].forEach((parameter, index) => {
    if (!parameter || typeof parameter !== "object") {
      fail(`${path}.parameters[${index}] must be an object`);
    }
    const p = parameter as Record<string, unknown>;
    requireString(p["name"], `${path}.parameters[${index}].name`);
    requireString(p["type"], `${path}.parameters[${index}].type`);
    if (typeof p["optional"] !== "boolean" || typeof p["rest"] !== "boolean") {
      fail(`${path}.parameters[${index}] optional/rest must be booleans`);
    }
    if (p["default"] !== undefined) {
      requireString(p["default"], `${path}.parameters[${index}].default`);
    }
  });
}

function validateMember(value: unknown, path: string): void {
  if (!value || typeof value !== "object") {
    fail(`${path} must be an object`);
  }
  const item = value as Record<string, unknown>;
  requireString(item["name"], `${path}.name`);
  if (typeof item["kind"] !== "string" || !memberKinds.has(item["kind"])) {
    fail(`${path}.kind is invalid`);
  }
  if (
    !(["instance", "static", "type"] as string[]).includes(
      String(item["scope"]),
    )
  ) {
    fail(`${path}.scope is invalid`);
  }
  if (
    typeof item["optional"] !== "boolean" ||
    typeof item["readonly"] !== "boolean" ||
    typeof item["static"] !== "boolean"
  ) {
    fail(`${path} optional/readonly/static must be booleans`);
  }
  if (item["type"] !== undefined) {
    requireString(item["type"], `${path}.type`);
  }
  if (
    item["access"] !== undefined &&
    !["get", "set", "get-set"].includes(String(item["access"]))
  ) {
    fail(`${path}.access is invalid`);
  }
  if (item["signatures"] !== undefined) {
    if (!Array.isArray(item["signatures"])) {
      fail(`${path}.signatures must be an array`);
    }
    item["signatures"].forEach((signature, index) => {
      validateSignature(signature, `${path}.signatures[${index}]`);
    });
  }
}

export function validateManifest(value: unknown): asserts value is ApiManifest {
  validateCheckedSchema(value, "api-manifest.schema.json");
  if (!value || typeof value !== "object") {
    fail("manifest must be an object");
  }
  const manifest = value as Record<string, unknown>;
  if (manifest["schemaVersion"] !== 1) {
    fail("manifest schemaVersion must be 1");
  }
  requireString(manifest["manifestVersion"], "manifestVersion");
  if (!/^\d+\.\d+$/u.test(String(manifest["manifestVersion"]))) {
    fail("manifestVersion must be major.minor");
  }
  if (!manifest["package"] || typeof manifest["package"] !== "object") {
    fail("package must be an object");
  }
  const pkg = manifest["package"] as Record<string, unknown>;
  requireString(pkg["name"], "package.name");
  requireString(pkg["version"], "package.version");
  if (!manifest["surface"] || typeof manifest["surface"] !== "object") {
    fail("surface must be an object");
  }
  const surface = manifest["surface"] as Record<string, unknown>;
  if (typeof surface["id"] !== "string" || !surfaces.has(surface["id"])) {
    fail("surface.id is invalid");
  }
  requireString(surface["name"], "surface.name");
  requireString(surface["entrypoint"], "surface.entrypoint");
  requireString(surface["sourceRoot"], "surface.sourceRoot");
  if (
    !(Array.isArray(manifest["exports"]) && Array.isArray(manifest["symbols"]))
  ) {
    fail("exports and symbols must be arrays");
  }
  const symbols = manifest["symbols"] as unknown[];
  const exports = manifest["exports"] as unknown[];
  const ids = new Set<string>();
  for (const [index, symbolValue] of symbols.entries()) {
    if (!symbolValue || typeof symbolValue !== "object") {
      fail(`symbols[${index}] must be an object`);
    }
    const symbol = symbolValue as Record<string, unknown>;
    requireString(symbol["id"], `symbols[${index}].id`);
    requireString(symbol["name"], `symbols[${index}].name`);
    if (ids.has(symbol["id"])) {
      fail(`duplicate symbol id ${symbol["id"]}`);
    }
    ids.add(symbol["id"] as string);
    if (symbol["id"] !== `${surface["id"]}:${symbol["name"]}`) {
      fail(`symbols[${index}].id must be ${surface["id"]}:${symbol["name"]}`);
    }
    if (typeof symbol["kind"] !== "string" || !kinds.has(symbol["kind"])) {
      fail(`symbols[${index}].kind is invalid`);
    }
    if (
      !(["named", "default", "namespace"] as string[]).includes(
        String(symbol["exportKind"]),
      )
    ) {
      fail(`symbols[${index}].exportKind is invalid`);
    }
    for (const field of [
      "extends",
      "implements",
      "typeParameters",
      "constructors",
      "signatures",
      "members",
    ]) {
      if (!Array.isArray(symbol[field])) {
        fail(`symbols[${index}].${field} must be an array`);
      }
    }
    (symbol["constructors"] as unknown[]).forEach((signature, i) => {
      validateSignature(signature, `symbols[${index}].constructors[${i}]`);
    });
    (symbol["signatures"] as unknown[]).forEach((signature, i) => {
      validateSignature(signature, `symbols[${index}].signatures[${i}]`);
    });
    (symbol["members"] as unknown[]).forEach((member, i) => {
      validateMember(member, `symbols[${index}].members[${i}]`);
    });
  }
  const exportNames = new Set<string>();
  for (const [index, exportValue] of exports.entries()) {
    if (!exportValue || typeof exportValue !== "object") {
      fail(`exports[${index}] must be an object`);
    }
    const item = exportValue as Record<string, unknown>;
    requireString(item["name"], `exports[${index}].name`);
    requireString(item["id"], `exports[${index}].id`);
    if (exportNames.has(item["name"] as string)) {
      fail(`duplicate export ${item["name"]}`);
    }
    exportNames.add(item["name"] as string);
    if (!ids.has(item["id"] as string)) {
      fail(`export ${item["name"]} references missing symbol ${item["id"]}`);
    }
  }
  if (!manifest["provenance"] || typeof manifest["provenance"] !== "object") {
    fail("provenance must be an object");
  }
  const provenance = manifest["provenance"] as Record<string, unknown>;
  for (const field of ["extractor", "compiler", "entrypoint"]) {
    requireString(provenance[field], `provenance.${field}`);
  }
  if (!Array.isArray(provenance["files"])) {
    fail("provenance.files must be an array");
  }
  for (const [index, fileValue] of (
    provenance["files"] as unknown[]
  ).entries()) {
    if (!fileValue || typeof fileValue !== "object") {
      fail(`provenance.files[${index}] must be an object`);
    }
    const file = fileValue as Record<string, unknown>;
    requireString(file["path"], `provenance.files[${index}].path`);
    if (
      typeof file["hash"] !== "string" ||
      !/^[a-f0-9]{64}$/u.test(file["hash"])
    ) {
      fail(`provenance.files[${index}].hash must be sha256`);
    }
  }
}

export function validateCompatibilityMapping(
  value: unknown,
): asserts value is CompatibilityMapping {
  validateCheckedSchema(value, "compatibility-mapping.schema.json");
  parseMapping(value);
}

export function validateCompatibilityReport(
  value: unknown,
): asserts value is CompatibilityReport {
  validateCheckedSchema(value, "diff-report.schema.json");
  if (!value || typeof value !== "object") {
    fail("report must be an object");
  }
  const report = value as Record<string, unknown>;
  if (report["schemaVersion"] !== 1) {
    fail("report schemaVersion must be 1");
  }
  if (!Array.isArray(report["comparisons"])) {
    fail("report.comparisons must be an array");
  }
  const sourceIds = new Set<string>();
  for (const [index, record] of (
    report["comparisons"] as unknown[]
  ).entries()) {
    if (!record || typeof record !== "object") {
      fail(`report.comparisons[${index}] must be an object`);
    }
    const item = record as Record<string, unknown>;
    if (!item["source"] || typeof item["source"] !== "object") {
      fail(`report.comparisons[${index}].source missing`);
    }
    const source = item["source"] as Record<string, unknown>;
    requireString(source["id"], `report.comparisons[${index}].source.id`);
    if (sourceIds.has(source["id"] as string)) {
      fail(`duplicate comparison source ${source["id"]}`);
    }
    sourceIds.add(source["id"] as string);
    if (
      typeof source["name"] !== "string" ||
      typeof source["surface"] !== "string"
    ) {
      fail(`report.comparisons[${index}].source malformed`);
    }
    if (!surfaces.has(source["surface"])) {
      fail(`report.comparisons[${index}].source.surface invalid`);
    }
    if (item["target"] !== undefined) {
      if (!item["target"] || typeof item["target"] !== "object") {
        fail(`report.comparisons[${index}].target malformed`);
      }
      const target = item["target"] as Record<string, unknown>;
      if (
        typeof target["id"] !== "string" ||
        typeof target["name"] !== "string" ||
        typeof target["surface"] !== "string" ||
        !surfaces.has(target["surface"])
      ) {
        fail(`report.comparisons[${index}].target malformed`);
      }
    }
    if (
      typeof item["status"] !== "string" ||
      !(SEMANTIC_STATUSES as readonly string[]).includes(item["status"])
    ) {
      fail(`report.comparisons[${index}].status invalid`);
    }
    if (
      !Array.isArray(item["notes"]) ||
      item["notes"].some((note) => typeof note !== "string")
    ) {
      fail(`report.comparisons[${index}].notes invalid`);
    }
    if (
      item["structural"] !== undefined &&
      (!item["structural"] || typeof item["structural"] !== "object")
    ) {
      fail(`report.comparisons[${index}].structural malformed`);
    }
  }
}

export function validateVersionDiffReport(
  value: unknown,
): asserts value is VersionDiffReport {
  validateCheckedSchema(value, "version-diff.schema.json");
}

export function validateLatestProbe(value: unknown): void {
  validateCheckedSchema(value, "latest-probe.schema.json");
}

export function readJson(path: string): unknown {
  if (!existsSync(path)) {
    fail(`missing file ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(
      `invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function writeDeterministicJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}
