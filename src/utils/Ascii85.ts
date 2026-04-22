/**
 * Utility for decoding ASCII85 encoded data.
 */
export class Ascii85 {
  /**
   * Decodes ASCII85 encoded data.
   * @param data ASCII85 encoded data (Buffer or string)
   * @returns Decoded data
   */
  static decode(data: Buffer | string): Buffer {
    const str = typeof data === 'string' ? data : data.toString('binary');
    
    // Find the end marker ~> if present
    let content = str.trim();
    if (content.endsWith('~>')) {
      content = content.substring(0, content.length - 2);
    }
    
    // Remove all whitespace
    content = content.replace(/\s/g, '');
    
    const out: number[] = [];
    let word = 0;
    let count = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const code = char.charCodeAt(0);
      
      if (char === 'z' && count === 0) {
        out.push(0, 0, 0, 0);
        continue;
      }
      
      if (code < 33 || code > 117) {
        continue;
      }
      
      word = word * 85 + (code - 33);
      count++;
      
      if (count === 5) {
        out.push((word >> 24) & 0xff);
        out.push((word >> 16) & 0xff);
        out.push((word >> 8) & 0xff);
        out.push(word & 0xff);
        word = 0;
        count = 0;
      }
    }
    
    if (count > 0) {
      const remaining = 5 - count;
      for (let i = 0; i < remaining; i++) {
        word = word * 85 + 84;
      }
      
      if (count >= 2) out.push((word >> 24) & 0xff);
      if (count >= 3) out.push((word >> 16) & 0xff);
      if (count >= 4) out.push((word >> 8) & 0xff);
    }
    
    return Buffer.from(out);
  }
}
