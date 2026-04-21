const fs = require('fs');
const { PdfReader, PdfParser, ParagraphTransformer } = require('./dist/index.js');

const buffer = fs.readFileSync('tests/fixtures/simple-text.pdf');
const reader = PdfReader.fromBuffer(buffer);
const trailer = reader.parseTrailer();
const xref = reader.parseXRefTable();
const ObjectParser = require('./dist/core/ObjectParser').ObjectParser;
const ContentStreamParser = require('./dist/core/ContentStreamParser').ContentStreamParser;
const TextExtractor = require('./dist/core/TextExtractor').TextExtractor;

const getDictionaryEntry = (dict, key) => {
    if (dict.type !== 'dictionary') return null;
    let val = dict.entries.get(key);
    if (!val && key.startsWith('/')) val = dict.entries.get(key.substring(1));
    else if (!val) val = dict.entries.get('/' + key);
    return val || null;
}

const catalogContent = reader.extractObjectContent(trailer.root, xref);
const catalogDict = ObjectParser.parseContent(catalogContent);
const pagesObj = getDictionaryEntry(catalogDict, 'Pages');
const pagesContent = reader.extractObjectContent(pagesObj.objNum, xref);
const pagesDict = ObjectParser.parseContent(pagesContent);
const kidsObj = getDictionaryEntry(pagesDict, 'Kids');

for (const kid of kidsObj.elements) {
    if (kid.type === 'reference') {
      const pageContent = reader.extractObjectContent(kid.objNum, xref);
      const pageDict = ObjectParser.parseContent(pageContent);
      const contentsObj = getDictionaryEntry(pageDict, 'Contents');
      if (contentsObj) {
        const textContent = reader.extractObjectContent(contentsObj.objNum, xref);
        const textDict = ObjectParser.parseContent(textContent);
        const csParser = new ContentStreamParser(textDict.content);
        const ops = csParser.parse();
        console.log('ops length:', ops.length);
        if (ops.length > 0) console.log(ops[0], ops[ops.length - 1]);
      }
    }
}
