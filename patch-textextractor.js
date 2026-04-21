const fs = require('fs');

let code = fs.readFileSync('src/core/TextExtractor.ts', 'utf8');

code = code.replace(/    \/\/ Step 3: Extract final TextElements\n    \/\/ Fallback if no lines were formed but we have texts/, `    // Organize text
    for (const text of positionedTexts) {
      let added = false;
      for (const line of lines) {
        if (Math.abs(line[0].y - text.y) < LINE_TOLERANCE) {
          line.push(text);
          added = true;
          break;
        }
      }
      if (!added) {
        lines.push([text]);
      }
    }

    // Sort lines by Y (descending)
    lines.sort((a, b) => b[0].y - a[0].y);

    // Sort text within lines by X (ascending)
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
    }

    // Step 3: Extract final TextElements`);

fs.writeFileSync('src/core/TextExtractor.ts', code);
