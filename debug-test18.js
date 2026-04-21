const fs = require('fs');
const { PdfReader, PdfParser } = require('./dist/index.js');
const { ObjectParser } = require('./dist/core/ObjectParser.js');
const { ContentStreamParser } = require('./dist/core/ContentStreamParser.js');

const buffer = fs.readFileSync('tests/fixtures/simple-text.pdf');
const reader = PdfReader.fromBuffer(buffer);
const xref = reader.parseXRefTable();

const content = reader.extractObjectContent(7, xref);
const dict = ObjectParser.parseContent(content);
console.log('stream text:\n', dict.content);
