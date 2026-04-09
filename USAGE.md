# PDF to Markdown - Exemplos de Uso

## Instalação

```bash
npm install pdf-to-markdown
```

## Uso Básico

### 1. Importação no Node.js (CommonJS)

```javascript
const { PdfToMarkdown } = require('pdf-to-markdown');

async function convertFile() {
  const markdown = await PdfToMarkdown.fromFile('./document.pdf');
  console.log(markdown);
}

convertFile();
```

### 2. Importação como ES Module

```javascript
import { PdfToMarkdown } from 'pdf-to-markdown';

async function convertFile() {
  const markdown = await PdfToMarkdown.fromFile('./document.pdf');
  console.log(markdown);
}

convertFile();
```

### 3. Usando a Versão Minificada (Browser)

```html
<script src="pdf-to-markdown/dist/index.min.js"></script>
<script>
  async function convertFromUrl() {
    try {
      const url = 'https://example.com/document.pdf';
      const markdown = await PdfToMarkdown.fromUrl(url);
      console.log(markdown);
    } catch (error) {
      console.error('Erro ao converter PDF:', error);
    }
  }
  
  convertFromUrl();
</script>
```

### 4. Converter PDF de URL

```javascript
import { PdfToMarkdown } from 'pdf-to-markdown';

async function convertFromUrl() {
  try {
    const url = 'https://example.com/document.pdf';
    const markdown = await PdfToMarkdown.fromUrl(url);
    console.log(markdown);
  } catch (error) {
    console.error('Erro ao converter PDF:', error);
  }
}

convertFromUrl();
```

### 5. Converter Buffer de PDF

```javascript
import { PdfToMarkdown } from 'pdf-to-markdown';
import fs from 'fs';

async function convertFromBuffer() {
  const buffer = fs.readFileSync('./document.pdf');
  const markdown = await PdfToMarkdown.fromBuffer(buffer);
  console.log(markdown);
}

convertFromBuffer();
```

## APIs Disponíveis

### `PdfToMarkdown.fromFile(filePath: string): Promise<string>`

Converte um arquivo PDF local para Markdown.

**Parâmetros:**
- `filePath`: Caminho para o arquivo PDF

**Retorna:**
- Promise com o conteúdo Markdown

### `PdfToMarkdown.fromBuffer(buffer: Buffer): Promise<string>`

Converte um buffer PDF para Markdown.

**Parâmetros:**
- `buffer`: Buffer contendo o PDF

**Retorna:**
- Promise com o conteúdo Markdown

### `PdfToMarkdown.fromUrl(url: string): Promise<string>`

Baixa e converte um PDF de uma URL para Markdown.

**Parâmetros:**
- `url`: URL do PDF

**Retorna:**
- Promise com o conteúdo Markdown

**Exemplo:**

```javascript
const markdown = await PdfToMarkdown.fromUrl('https://arxiv.org/pdf/1234.5678.pdf');
```

## Formatos de Distribuição

A biblioteca está disponível em três formatos:

1. **CommonJS** (`dist/index.js`) - Para Node.js com `require()`
2. **ES Module** (`dist/esm/index.js`) - Para imports modernos com `import`
3. **Minificado** (`dist/index.min.js`) - Para uso no browser

## Configuração Avançada

### Usando Transformers Personalizados

```javascript
import { 
  PdfReader, 
  PdfParser, 
  MarkdownWriter,
  HeadingTransformer,
  TableTransformer 
} from 'pdf-to-markdown';

const pdfReader = PdfReader.fromFile('./document.pdf');

const transformers = [
  new HeadingTransformer(),
  new TableTransformer({ minConfidence: 0.7 }),
  // ... outros transformers
];

const pdfParser = new PdfParser(pdfReader, transformers);
const ast = pdfParser.parse();

const markdown = new MarkdownWriter().write(ast);
console.log(markdown);
```

## Suporte a TypeScript

A biblioteca inclui definições TypeScript completas:

```typescript
import { PdfToMarkdown, TextElement, MarkdownNode } from 'pdf-to-markdown';

// Tipagem automática disponível
const markdown: string = await PdfToMarkdown.fromFile('./doc.pdf');
```

## Requisitos

- Node.js >= 18.0.0
- Suporte a `fetch` API (nativo no Node.js 18+)

Para versões mais antigas do Node.js, use um polyfill para `fetch`:

```bash
npm install node-fetch@2
```

```javascript
import fetch from 'node-fetch';
global.fetch = fetch;

// Agora PdfToMarkdown.fromUrl() funcionará
```

## Licença

MIT
