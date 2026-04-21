const fs = require('fs');
const { PdfReader, PdfParser, ParagraphTransformer } = require('./dist/index.js');
const { TextExtractor } = require('./dist/core/TextExtractor.js');
const { ContentStreamParser } = require('./dist/core/ContentStreamParser.js');
const { ObjectParser } = require('./dist/core/ObjectParser.js');

const buffer = fs.readFileSync('tests/fixtures/simple-text.pdf');
const reader = PdfReader.fromBuffer(buffer);
const xref = reader.parseXRefTable();

const content = reader.extractObjectContent(7, xref);
const dict = ObjectParser.parseContent(content);
const csParser = new ContentStreamParser(dict.content);
const ops = csParser.parse();
const textExtractor = new TextExtractor(612, 792, 0);
const elements = textExtractor.extractTextElements(ops);
console.log('ops len:', ops.length);
console.log('elements len:', elements.length);
if (elements.length > 0) {
    console.log(elements[0]);
}
