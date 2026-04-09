"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfReader = void 0;
const fs = __importStar(require("fs"));
/**
 * Reads and parses the basic structure of a PDF file.
 */
class PdfReader {
    constructor(buffer) {
        this.buffer = buffer.toString('binary');
    }
    /**
     * Creates a PdfReader from a file path.
     */
    static fromFile(filePath) {
        const buffer = fs.readFileSync(filePath);
        return new PdfReader(buffer);
    }
    /**
     * Creates a PdfReader from a Buffer.
     */
    static fromBuffer(buffer) {
        return new PdfReader(buffer);
    }
    /**
     * Creates a PdfReader from a binary string (for browser compatibility).
     */
    static fromBinaryString(binaryString) {
        const reader = Object.create(PdfReader.prototype);
        reader.buffer = binaryString;
        return reader;
    }
    /**
     * Gets the raw binary content of the PDF.
     */
    getBinaryContent() {
        return Buffer.from(this.buffer, 'binary');
    }
    /**
     * Gets the raw string content of the PDF.
     */
    getStringContent() {
        return this.buffer;
    }
    /**
     * Validates if the file starts with a valid PDF header.
     */
    validateHeader() {
        return this.buffer.startsWith('%PDF-');
    }
    /**
     * Extracts the PDF version from the header.
     */
    getVersion() {
        if (!this.validateHeader()) {
            throw new Error('Invalid PDF header');
        }
        return this.buffer.substring(5, 8);
    }
    /**
     * Finds and parses the cross-reference table.
     */
    parseXRefTable() {
        const xrefEntries = new Map();
        const xrefPattern = /xref\s*\n([\s\S]*?)trailer/;
        const xrefMatch = xrefPattern.exec(this.buffer);
        if (!xrefMatch) {
            throw new Error('Cross-reference table not found');
        }
        const xrefContent = xrefMatch[1];
        const subsectionPattern = /(\d+)\s+(\d+)\s*\n([\s\S]*?)(?=\d+\s+\d+|$)/g;
        let subsectionMatch;
        while ((subsectionMatch = subsectionPattern.exec(xrefContent)) !== null) {
            const startObjNum = parseInt(subsectionMatch[1], 10);
            const count = parseInt(subsectionMatch[2], 10);
            const entriesText = subsectionMatch[3];
            const entryPattern = /(\d{10})\s+(\d{5})\s+([fn])\s*/g;
            let entryMatch;
            let objNum = startObjNum;
            while ((entryMatch = entryPattern.exec(entriesText)) !== null && objNum < startObjNum + count) {
                const offset = parseInt(entryMatch[1], 10);
                const generation = parseInt(entryMatch[2], 10);
                const inUse = entryMatch[3] === 'n';
                if (inUse) {
                    xrefEntries.set(objNum, { offset, generation, inUse });
                }
                objNum++;
            }
        }
        return xrefEntries;
    }
    /**
     * Finds and parses the trailer dictionary.
     */
    parseTrailer() {
        const trailerPattern = /trailer\s*<<([\s\S]*?)>>/;
        const trailerMatch = trailerPattern.exec(this.buffer);
        if (!trailerMatch) {
            throw new Error('Trailer not found');
        }
        const trailerContent = trailerMatch[1];
        const trailer = {};
        const sizeMatch = /\/Size\s+(\d+)/.exec(trailerContent);
        if (sizeMatch) {
            trailer.size = parseInt(sizeMatch[1], 10);
        }
        const prevMatch = /\/Prev\s+(\d+)/.exec(trailerContent);
        if (prevMatch) {
            trailer.prev = parseInt(prevMatch[1], 10);
        }
        const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/.exec(trailerContent);
        if (rootMatch) {
            trailer.root = parseInt(rootMatch[1], 10);
        }
        const infoMatch = /\/Info\s+(\d+)\s+\d+\s+R/.exec(trailerContent);
        if (infoMatch) {
            trailer.info = parseInt(infoMatch[1], 10);
        }
        return trailer;
    }
    /**
     * Finds the start of the xref or trailer section.
     */
    findStartXRef() {
        const startxrefPattern = /startxref\s*\n\s*(\d+)/;
        const startxrefMatch = startxrefPattern.exec(this.buffer);
        if (!startxrefMatch) {
            throw new Error('startxref not found');
        }
        return parseInt(startxrefMatch[1], 10);
    }
    /**
     * Extracts the raw content of an indirect object.
     */
    extractObjectContent(objNum, xrefTable) {
        const entry = xrefTable.get(objNum);
        if (!entry) {
            throw new Error(`Object ${objNum} not found in xref table`);
        }
        // Find the object definition starting from the offset
        const objPattern = new RegExp(`${objNum}\\s+\\d+\\s+obj([\\s\\S]*?)endobj`);
        const remainingContent = this.buffer.substring(entry.offset);
        const objMatch = objPattern.exec(remainingContent);
        if (!objMatch) {
            throw new Error(`Object ${objNum} content not found`);
        }
        return objMatch[1];
    }
    /**
     * Finds all streams in the PDF content.
     */
    findAllStreams() {
        const streams = [];
        const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
        let match;
        while ((match = streamPattern.exec(this.buffer)) !== null) {
            streams.push({
                start: match.index,
                end: match.index + match[0].length,
                content: match[1],
            });
        }
        return streams;
    }
}
exports.PdfReader = PdfReader;
//# sourceMappingURL=PdfReader.js.map