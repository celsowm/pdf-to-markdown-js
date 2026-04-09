/**
 * Default identity matrix.
 */
export const IDENTITY_MATRIX = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
};
/**
 * Parses PDF content streams to extract text operations.
 * Handles PDF text positioning operators as per PDF Reference Section 9.
 */
export class ContentStreamParser {
    constructor(streamContent) {
        this.position = 0;
        this.streamContent = streamContent;
    }
    /**
     * Parses the content stream and returns text operations.
     */
    parse() {
        const operations = [];
        let currentFontName;
        let currentFontSize;
        while (this.position < this.streamContent.length) {
            this.skipWhitespace();
            if (this.position >= this.streamContent.length) {
                break;
            }
            // Try to parse text showing operators (Tj, TJ, ', ")
            const textOperation = this.tryParseTextOperator(currentFontName, currentFontSize);
            if (textOperation) {
                operations.push(textOperation);
                continue;
            }
            // Try to parse text matrix operator (Tm)
            const matrixOperation = this.tryParseTextMatrix();
            if (matrixOperation) {
                operations.push(matrixOperation);
                continue;
            }
            // Try to parse font operator (Tf)
            const fontOperation = this.tryParseFontOperator();
            if (fontOperation) {
                currentFontName = fontOperation.fontName;
                currentFontSize = fontOperation.fontSize;
                operations.push(fontOperation);
                continue;
            }
            // Try to parse text line move operators (T*, TD, TD, TL)
            const lineOperation = this.tryParseTextLineMove();
            if (lineOperation) {
                operations.push(lineOperation);
                continue;
            }
            // Skip unknown content until next operator
            this.skipUntilOperator();
        }
        return operations;
    }
    /**
     * Skips whitespace characters.
     */
    skipWhitespace() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                this.position++;
            }
            else {
                break;
            }
        }
    }
    /**
     * Tries to parse text showing operators: Tj, TJ, ', "
     */
    tryParseTextOperator(fontName, fontSize) {
        const startPosition = this.position;
        // Skip to find potential text operator
        this.skipUntilPotentialTextOperator();
        if (this.position >= this.streamContent.length) {
            this.position = startPosition;
            return null;
        }
        // Check for TJ (array of strings)
        if (this.streamContent[this.position] === '[') {
            const text = this.parseTJOperator();
            if (text !== null) {
                return {
                    type: 'text',
                    text,
                    fontName,
                    fontSize,
                };
            }
            this.position = startPosition;
            return null;
        }
        // Check for Tj (string)
        if (this.streamContent[this.position] === '(') {
            const text = this.parseParenthesizedString();
            if (text !== null && this.streamContent[this.position] === 'T') {
                this.position++; // Skip T
                this.position++; // Skip j
                return {
                    type: 'text',
                    text,
                    fontName,
                    fontSize,
                };
            }
            this.position = startPosition;
            return null;
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Parses a TJ operator (array of strings with positioning).
     */
    parseTJOperator() {
        if (this.streamContent[this.position] !== '[') {
            return null;
        }
        this.position++; // Skip [
        let result = '';
        let bracketCount = 1;
        while (this.position < this.streamContent.length && bracketCount > 0) {
            const char = this.streamContent[this.position];
            if (char === '(') {
                const text = this.parseParenthesizedString();
                if (text !== null) {
                    result += text;
                }
            }
            else if (char === '[') {
                bracketCount++;
                this.position++;
            }
            else if (char === ']') {
                bracketCount--;
                this.position++;
            }
            else {
                this.position++;
            }
        }
        // Skip TJ
        if (this.position < this.streamContent.length &&
            this.streamContent[this.position] === 'T' &&
            this.streamContent[this.position + 1] === 'J') {
            this.position += 2;
            return result;
        }
        return result || null;
    }
    /**
     * Parses a parenthesized string.
     */
    parseParenthesizedString() {
        if (this.streamContent[this.position] !== '(') {
            return null;
        }
        this.position++; // Skip (
        let result = '';
        let depth = 1;
        while (this.position < this.streamContent.length && depth > 0) {
            const char = this.streamContent[this.position];
            if (char === '\\') {
                this.position++;
                const nextChar = this.streamContent[this.position];
                switch (nextChar) {
                    case 'n':
                        result += '\n';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    case '(':
                        result += '(';
                        break;
                    case ')':
                        result += ')';
                        break;
                    case '\\':
                        result += '\\';
                        break;
                    default:
                        result += nextChar;
                }
            }
            else if (char === '(') {
                depth++;
                result += char;
            }
            else if (char === ')') {
                depth--;
                if (depth > 0) {
                    result += char;
                }
            }
            else {
                result += char;
            }
            this.position++;
        }
        return result;
    }
    /**
     * Tries to parse text matrix operator (Tm).
     */
    tryParseTextMatrix() {
        // Look for pattern: number number number number number number Tm
        const tmPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+Tm/;
        const substring = this.streamContent.substring(this.position);
        const match = tmPattern.exec(substring);
        if (match) {
            this.position += match[0].length;
            return {
                type: 'setTextMatrix',
                matrix: {
                    a: parseFloat(match[1]),
                    b: parseFloat(match[2]),
                    c: parseFloat(match[3]),
                    d: parseFloat(match[4]),
                    e: parseFloat(match[5]),
                    f: parseFloat(match[6]),
                },
            };
        }
        return null;
    }
    /**
     * Tries to parse font operator (Tf).
     */
    tryParseFontOperator() {
        const startPosition = this.position;
        // Look for pattern: /FontName Size Tf
        const tfPattern = /\/(\S+)\s+([+-]?\d*\.?\d+)\s+Tf/;
        const substring = this.streamContent.substring(this.position);
        const match = tfPattern.exec(substring);
        if (match) {
            this.position += match[0].length;
            return {
                type: 'setFont',
                fontName: match[1],
                fontSize: parseFloat(match[2]),
            };
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Tries to parse text line move operators (T*, TD, TD, TL).
     */
    tryParseTextLineMove() {
        const startPosition = this.position;
        // T* - move to next line
        if (this.streamContent.substring(this.position, this.position + 2) === 'T*') {
            this.position += 2;
            return { type: 'moveToNextLine' };
        }
        // TL - set text leading
        const tlPattern = /([+-]?\d*\.?\d+)\s+TL/;
        const tlMatch = tlPattern.exec(this.streamContent.substring(this.position));
        if (tlMatch) {
            this.position += tlMatch[0].length;
            return { type: 'moveToNextLine' };
        }
        // TD or Td - move to next line and offset
        const tdPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+T[Dd]/;
        const tdMatch = tdPattern.exec(this.streamContent.substring(this.position));
        if (tdMatch) {
            this.position += tdMatch[0].length;
            return {
                type: 'moveToNextLine',
                x: parseFloat(tdMatch[1]),
                y: parseFloat(tdMatch[2]),
            };
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Skips content until a potential text operator is found.
     */
    skipUntilPotentialTextOperator() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            // Look for ( or [ which indicates text content
            if (char === '(' || char === '[') {
                return;
            }
            this.position++;
        }
    }
    /**
     * Skips content until the next operator.
     */
    skipUntilOperator() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            // Operators are typically uppercase letters at word boundaries
            if (char >= 'A' && char <= 'Z') {
                return;
            }
            this.position++;
        }
    }
}
