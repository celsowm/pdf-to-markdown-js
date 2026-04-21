const fs = require('fs');

let code = fs.readFileSync('src/core/table-detection/LatticeDetector.ts', 'utf8');
code = code.replace(/let cellIndex = 0;/g, '// let cellIndex = 0;');
code = code.replace(/cellIndex\+\+;/g, '// cellIndex++;');
fs.writeFileSync('src/core/table-detection/LatticeDetector.ts', code);

code = fs.readFileSync('src/transformers/ListTransformer.ts', 'utf8');
code = code.replace(/const orderedListPattern = \/\^\\d\+\\\.[ \t]\+\/;/g, 'const orderedListPattern = /^\\d+\\.[ \t]+/;');
code = code.replace(/const orderedListPatternWithParenthesis = \/\^\\d\+\\\)[ \t]\+\/;/g, 'const orderedListPatternWithParenthesis = /^\\d+\\)[ \t]+/;');
fs.writeFileSync('src/transformers/ListTransformer.ts', code);
