# PDF to Markdown

A TypeScript library that converts PDF files to Markdown using a custom-built parser, following SOLID principles and without external PDF parsing libraries.

## 🌐 Interactive Playground

Try the library in your browser with our [interactive playground](https://your-username.github.io/pdf-to-markdown-js/playground/)!

- Upload PDF files and convert them to Markdown
- Convert PDFs from URLs
- View live preview of converted content
- Download the Markdown output

## Features

- **Custom PDF Parser**: Built from scratch without relying on external PDF libraries
- **SOLID Principles**: Designed with clean architecture and SOLID principles
- **Extensible Transformers**: Easy to add new content detection strategies
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Test Coverage**: Includes integration tests with generated PDF fixtures
- **Multiple Distribution Formats**: CommonJS, ES Modules, and minified browser version
- **URL Support**: Convert PDFs directly from URLs

## Installation

```bash
npm install pdf-to-markdown
```

## Usage

### Basic Usage

```typescript
import { PdfToMarkdown } from 'pdf-to-markdown';

// From file
const markdown = await PdfToMarkdown.fromFile('./document.pdf');
console.log(markdown);

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

```typescript
import {
  PdfReader,
  PdfParser,
  MarkdownWriter,
  HeadingTransformer,
  ListTransformer,
  ParagraphTransformer,
} from 'pdf-to-markdown';

// Create custom transformers
const transformers = [
  new HeadingTransformer(),
  new ListTransformer(),
  new ParagraphTransformer(),
];

// Parse PDF
const pdfReader = PdfReader.fromFile('./document.pdf');
const pdfParser = new PdfParser(pdfReader, transformers);
const markdownAst = pdfParser.parse();

// Convert to markdown string
const markdownWriter = new MarkdownWriter();
const markdown = markdownWriter.write(markdownAst);
```

## Architecture

### Core Components

1. **PdfReader**: Reads and parses the basic PDF structure (header, xref table, trailer)
2. **Tokenizer**: Tokenizes PDF content into lexical tokens
3. **ObjectParser**: Parses PDF objects (dictionaries, arrays, streams, indirect references)
4. **ContentStreamParser**: Parses PDF content streams to extract text operations
5. **TextExtractor**: Organizes extracted text with positioning information

### Transformers

Transformers follow the Strategy pattern and convert text elements to Markdown AST nodes:

- **HeadingTransformer**: Detects headings based on font size and weight
- **ListTransformer**: Detects ordered and unordered lists
- **ParagraphTransformer**: Fallback transformer for regular paragraphs

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

### `PdfToMarkdown.fromFile(filePath: string): Promise<string>`

Converts a PDF file to Markdown string.

### `PdfToMarkdown.fromBuffer(buffer: Buffer): Promise<string>`

Converts a PDF buffer to Markdown string.

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
