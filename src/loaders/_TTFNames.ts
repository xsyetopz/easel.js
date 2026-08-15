import { BinaryReader } from "./_TTFBinaryReader.ts";

/** Names and raw name records extracted from a TrueType name table. */
export interface NameTable {
  /** Preferred family name, or an empty string when the table has none. */
  readonly familyName: string;
  /** Full face name, or an empty string when the table has none. */
  readonly fullName: string;
  /** All decoded records keyed by normalized name identifier. */
  readonly records: Readonly<Record<string, string>>;
}

interface NameRecords extends Record<string, string> {
  familyName?: string;
  fullName?: string;
}

/** Decodes family, full, and platform-specific records from a name table. */
export function readNames(bytes: Uint8Array | undefined): NameTable {
  if (!bytes) return emptyNameTable();
  const reader = new BinaryReader(bytes);
  const format = reader.readUint16();
  if (format > 1) return emptyNameTable();
  const count = reader.readUint16();
  const stringOffset = reader.readUint16();
  const records: NameRecords = {};
  for (let i = 0; i < count; i++) {
    const platform = reader.readUint16();
    reader.skip(2);
    reader.skip(2);
    const nameId = reader.readUint16();
    const length = reader.readUint16();
    const offset = reader.readUint16();
    const value = decodeName(
      bytes.subarray(stringOffset + offset, stringOffset + offset + length),
      platform,
    );
    if (!value) continue;
    const key = nameRecordKey(nameId);
    if (!(key in records)) records[key] = value;
  }
  return {
    familyName: records.familyName ?? "",
    fullName: records.fullName ?? "",
    records,
  };
}

function emptyNameTable(): NameTable {
  return { familyName: "", fullName: "", records: {} };
}

function nameRecordKey(nameId: number): string {
  if (nameId === 1) return "familyName";
  if (nameId === 4) return "fullName";
  return `name${nameId}`;
}

function decodeName(bytes: Uint8Array, platform: number): string {
  if (platform === 0 || platform === 3) {
    let value = "";
    for (let i = 0; i + 1 < bytes.length; i += 2)
      value += String.fromCharCode((bytes[i] ?? 0) * 256 + (bytes[i + 1] ?? 0));
    return value;
  }
  return new TextDecoder().decode(bytes);
}
