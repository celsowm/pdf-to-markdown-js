# PDF to Markdown

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

A high-performance, zero-dependency TypeScript library that converts PDF files to clean Markdown. Built from the ground up following SOLID principles, it provides a robust and extensible engine for document transformation without relying on heavy external PDF parsing libraries.

## 🌐 Interactive Playground

> [!IMPORTANT]
> **[🚀 Try the PDF to Markdown Interactive Playground!](https://your-username.github.io/pdf-to-markdown-js/playground/)**
>
> *Experience fast, clean PDF-to-Markdown conversion right in your browser. Fine-tune extraction settings and see results in real-time.*

- **Interactive Settings:** Choose between different table extraction techniques (Lattice, Stream, R-XY-Cut, etc.)
- **Live Preview:** See rendered Markdown instantly
- **Multi-Source:** Upload local files or fetch from public URLs
- **Instant Export:** Copy to clipboard or download as `.md`

## Features

- **🚀 Zero Dependencies**: No external PDF libraries required.
- **🛠️ SOLID Architecture**: Highly maintainable and extensible codebase.
- **📊 Advanced Table Extraction**: Multiple detection techniques (Lattice, Stream, SCA, etc.) to handle complex layouts.
- **🌐 Browser & Node.js Support**: Works seamlessly in both environments with dedicated builds.
- **🔍 Intelligent Content Detection**: Automatic detection of headings, lists, tables, and formatted text.
- **🔗 URL Direct Conversion**: Convert PDFs directly from public URLs.
- **💪 Type-Safe**: Written entirely in TypeScript with full type definitions.

## Installation

```bash
npm install pdf-to-markdown
```

## Usage

### Basic Usage

```typescript
import { PdfToMarkdown } from 'pdf-to-markdown';

// From buffer
import * as fs from 'fs';
const buffer = fs.readFileSync('./document.pdf');
const markdown = await PdfToMarkdown.fromBuffer(buffer);
console.log(markdown);

// From URL (Node.js 18+)
const markdown = await PdfToMarkdown.fromUrl('https://example.com/document.pdf');
console.log(markdown);
```

### Distribution Formats

The library is available in multiple formats:

```javascript
// CommonJS (Node.js)
const { PdfToMarkdown } = require('pdf-to-markdown');

// ES Modules (Modern bundlers)
import { PdfToMarkdown } from 'pdf-to-markdown';

// Browser (Minified)
// <script src="pdf-to-markdown/dist/index.min.js"></script>
```

### Advanced Usage

#### Custom Conversion Options

Fine-tune how tables and other elements are extracted:

```typescript
import { PdfToMarkdown } from 'pdf-to-markdown';

const options = {
  table: {
    tolerance: 4.5,
    autoDetectHeader: true,
    registry: {
      weights: [
        { name: 'Lattice', enabled: true, weight: 0.9 },
        { name: 'Stream', enabled: true, weight: 0.7 }
      ]
    }
  }
};

const markdown = await PdfToMarkdown.fromUrl('https://example.com/report.pdf', options);
```

#### Manual Pipeline Control

For full control over the conversion process, you can use the underlying components:

```typescript
import {
  PdfReader,
  PdfParser,
  MarkdownWriter,
  HeadingTransformer,
  TableTransformer,
  ListTransformer,
  ParagraphTransformer,
} from 'pdf-to-markdown';

// 1. Initialize Reader with a buffer
const buffer = await getPdfBuffer();
const pdfReader = PdfReader.fromBuffer(buffer);

// 2. Configure Transformers
const transformers = [
  new HeadingTransformer(),
  new TableTransformer({ tolerance: 3 }),
  new ListTransformer(),
  new ParagraphTransformer(),
];

// 3. Parse to AST
const pdfParser = new PdfParser(pdfReader, transformers);
const markdownAst = pdfParser.parse();

// 4. Generate Markdown
const markdownWriter = new MarkdownWriter();
const markdown = markdownWriter.write(markdownAst);
```

## Configuration

### `PdfToMarkdownOptions`

| Property | Type | Description |
|----------|------|-------------|
| `table` | `TableTransformerConfig` | Configuration for table detection and extraction. |

### `TableTransformerConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tolerance` | `number` | `3` | Distance tolerance for aligning text into columns/rows. |
| `autoDetectHeader` | `boolean` | `true` | Whether to automatically identify the first row as a header. |
| `minConfidence` | `number` | `0.4` | Threshold for keeping detected tables (0.0 to 1.0). |
| `registry` | `object` | - | Configuration for individual detectors and their weights. |

## Architecture

### Core Components

1. **PdfReader**: Reads and parses the basic PDF structure (header, xref table, trailer)
2. **Tokenizer**: Tokenizes PDF content into lexical tokens
3. **ObjectParser**: Parses PDF objects (dictionaries, arrays, streams, indirect references)
4. **ContentStreamParser**: Parses PDF content streams to extract text operations
5. **TextExtractor**: Organizes extracted text with positioning information

### Transformers

Transformers follow the Strategy pattern and convert text elements to Markdown AST nodes. They are executed in priority order:

- **HeadingTransformer**: Detects document structure based on font characteristics and relative positioning.
- **TableTransformer**: A multi-engine orchestrator that uses various techniques (Lattice, Stream, Graph-based, etc.) to detect and reconstruct tables.
- **ListTransformer**: Identifies ordered and unordered list patterns.
- **InlineFormatterTransformer**: Handles bold, italic, and other text styles.
- **ParagraphTransformer**: The fallback engine that ensures all text is captured in meaningful blocks.

### Models

- **TextElement**: Represents extracted text with position and styling
- **Page**: Represents a PDF page with its text elements
- **PdfDocument**: Represents the complete PDF document
- **MarkdownNode**: AST nodes for Markdown output

## Project Structure

```
src/
├── core/                  # Core parsing components
│   ├── Tokenizer.ts
│   ├── ObjectParser.ts
│   ├── ContentStreamParser.ts
│   ├── TextExtractor.ts
│   └── PdfParser.ts
├── transformers/          # Content transformers
│   ├── MarkdownTransformer.ts
│   ├── HeadingTransformer.ts
│   ├── ListTransformer.ts
│   └── ParagraphTransformer.ts
├── models/                # Data models
│   ├── TextElement.ts
│   ├── Page.ts
│   ├── PdfDocument.ts
│   └── MarkdownNode.ts
├── utils/                 # Utilities
│   ├── PdfReader.ts
│   └── MarkdownWriter.ts
└── index.ts               # Public API

tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── fixtures/              # Test PDF fixtures

scripts/
└── generate-test-pdfs.py  # Script to generate test PDFs
```

## SOLID Principles

### Single Responsibility Principle (SRP)
Each class has a single, well-defined responsibility:
- `Tokenizer`: Lexical analysis
- `ObjectParser`: Object parsing
- `ContentStreamParser`: Content stream parsing
- `TextExtractor`: Text organization

### Open/Closed Principle (OCP)
New transformers can be added without modifying existing code:
```typescript
class CustomTransformer implements MarkdownTransformer {
  transform(elements, allElements) { /* ... */ }
  canTransform(elements) { /* ... */ }
  getPriority() { return 50; }
}
```

### Liskov Substitution Principle (LSP)
All transformers implement the same interface and are interchangeable.

### Interface Segregation Principle (ISP)
The `MarkdownTransformer` interface is focused and specific.

### Dependency Inversion Principle (DIP)
The system depends on abstractions (interfaces), not concrete implementations.

## Development

### Install Dependencies

```bash
npm install
```

### Generate Test PDFs

```bash
pip install reportlab
npm run generate-pdfs
```

### Run Tests

```bash
npm test           # Watch mode
npm run test:run   # Single run
npm run test:coverage  # With coverage
```

### Build

```bash
npm run build
```

### Lint & Format

```bash
npm run lint
npm run lint:fix
npm run format
```

## Testing

The project includes comprehensive tests:

- **Unit Tests**: Test individual components (Tokenizer, ObjectParser, ContentStreamParser)
- **Integration Tests**: Test the complete PDF-to-Markdown conversion pipeline
- **Test Fixtures**: PDF files generated with controlled content for reliable testing

## API Reference

### `PdfToMarkdown.fromBuffer(buffer: Buffer, options?: PdfToMarkdownOptions): Promise<string>`

Converts a PDF buffer to Markdown string.

### `PdfToMarkdown.fromBinary(binaryString: string, options?: PdfToMarkdownOptions): Promise<string>`

Converts a PDF from binary string to Markdown string (ideal for browser usage).

### `PdfToMarkdown.fromUrl(url: string, options?: PdfToMarkdownOptions): Promise<string>`

Converts a PDF from a URL to Markdown string.

## Limitations

- Basic text extraction (no image support)
- Simple table detection
- Font-based heading detection
- No form field extraction
- No annotation support

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Acknowledgments

- PDF Reference (Adobe)
- ReportLab for test PDF generation
