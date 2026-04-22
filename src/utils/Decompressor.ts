import * as fflate from 'fflate';

/**
 * Utility for decompressing PDF streams.
 */
export class Decompressor {
  /**
   * Decompresses a FlateDecode stream.
   * @param data Compressed data
   * @returns Decompressed data
   */
  static decompress(data: Uint8Array): Buffer {
    try {
      // fflate is faster and works in both Node and Browser
      const decompressed = fflate.inflateSync(data);
      return Buffer.from(decompressed);
    } catch (error) {
      // Fallback for some PDF streams that might be slightly malformed or use a different deflate format
      try {
        const decompressed = fflate.unzlibSync(data);
        return Buffer.from(decompressed);
      } catch {
        return Buffer.from(data);
      }
    }
  }
}
