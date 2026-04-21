const fs = require('fs');

let code = fs.readFileSync('src/core/ContentStreamParser.ts', 'utf8');

code = code.replace(/      if \(text \!== null && this\.streamContent\[this\.position\] === 'T'\) \{/, `      this.skipWhitespace();
      if (text !== null && this.position < this.streamContent.length && this.streamContent[this.position] === 'T' && this.streamContent[this.position + 1] === 'j') {`);

fs.writeFileSync('src/core/ContentStreamParser.ts', code);
