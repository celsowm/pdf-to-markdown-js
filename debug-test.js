const fs = require('fs');
const { PdfReader, PdfParser } = require('./dist/index.js');
const buffer = fs.readFileSync('tests/fixtures/simple-text.pdf');
const reader = PdfReader.fromBuffer(buffer);
const parser = new PdfParser(reader, []);
const ast = parser.parse();
console.log('AST:', JSON.stringify(ast, null, 2));
