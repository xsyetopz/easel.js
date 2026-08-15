/** Reads big-endian TrueType table data with bounded offsets. */
export class BinaryReader {
  readonly #view: DataView;
  readonly #end: number;
  #offset: number;

  /** Creates a reader constrained to the requested byte range. */
  constructor(bytes: Uint8Array, start = 0, end = bytes.byteLength) {
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.#offset = start;
    this.#end = end;
    if (start < 0 || end < start || end > bytes.byteLength)
      throw new RangeError("TTFLoader: invalid table bounds.");
  }

  /** Current absolute byte offset within the reader range. */
  get offset(): number {
    return this.#offset;
  }

  /** DataView used for reading the underlying bytes. */
  get view(): DataView {
    return this.#view;
  }

  /** Moves to an absolute byte offset after bounds checking. */
  seek(offset: number): void {
    if (offset < 0 || offset > this.#end)
      throw new RangeError("TTFLoader: read outside table bounds.");
    this.#offset = offset;
  }

  /** Advances the reader by a relative byte count. */
  skip(length: number): void {
    this.seek(this.#offset + length);
  }

  /** Reads one unsigned byte and advances the offset. */
  readUint8(): number {
    this.#require(1);
    return this.#view.getUint8(this.#offset++);
  }

  /** Reads one signed byte and advances the offset. */
  readInt8(): number {
    this.#require(1);
    return this.#view.getInt8(this.#offset++);
  }

  /** Reads one unsigned big-endian 16-bit integer. */
  readUint16(): number {
    this.#require(2);
    const value = this.#view.getUint16(this.#offset, false);
    this.#offset += 2;
    return value;
  }

  /** Reads one signed big-endian 16-bit integer. */
  readInt16(): number {
    this.#require(2);
    const value = this.#view.getInt16(this.#offset, false);
    this.#offset += 2;
    return value;
  }

  /** Reads one unsigned big-endian 32-bit integer. */
  readUint32(): number {
    this.#require(4);
    const value = this.#view.getUint32(this.#offset, false);
    this.#offset += 4;
    return value;
  }

  /** Reads the next four bytes as a TrueType table tag. */
  readTag(): string {
    return String.fromCharCode(
      this.readUint8(),
      this.readUint8(),
      this.readUint8(),
      this.readUint8(),
    );
  }

  #require(length: number): void {
    if (this.#offset + length > this.#end)
      throw new RangeError("TTFLoader: truncated table data.");
  }
}
