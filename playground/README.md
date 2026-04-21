# PDF to Markdown - Interactive Playground

An interactive web application to test and explore the PDF to Markdown conversion library.

## 🌐 Live Demo

Visit the live playground at: https://celsowm.github.io/pdf-to-markdown-js/playground/

## 🚀 Features

- **Upload PDF Files**: Drag and drop or click to upload PDF files
- **Convert from URL**: Provide a URL to a PDF file and convert it
- **Real-time Preview**: See the converted markdown with live preview
- **Raw Markdown**: View and copy the raw markdown output
- **Download**: Download the converted markdown as a file
- **Beautiful UI**: Modern dark theme interface

## 📦 Local Development

To run the playground locally:

```bash
# Build the project first
npm run build

# Open the playground in your browser
# For Windows:
start playground/index.html

# For macOS:
open playground/index.html

# For Linux:
xdg-open playground/index.html
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Styling**: Custom CSS with CSS variables
- **Markdown Rendering**: [marked.js](https://github.com/markedjs/marked)
- **Syntax Highlighting**: [highlight.js](https://highlightjs.org/)
- **PDF Conversion**: Custom PDF to Markdown library (TypeScript)

## 📁 Project Structure

```
playground/
├── index.html      # Main HTML file
├── styles.css      # Stylesheet
├── app.js          # Application logic
└── README.md       # This file
```

## 🎨 Design

The playground features a modern dark theme inspired by GitHub's dark mode, with:

- Smooth animations and transitions
- Responsive design (works on mobile and desktop)
- Drag & drop file upload
- Tab-based interface for different input methods
- Live markdown preview with syntax highlighting

## 🔧 Configuration

### GitHub Pages Deployment

The playground is automatically deployed to GitHub Pages when changes are pushed to the main branch. See `.github/workflows/deploy.yml` for the deployment configuration.

### CORS Limitations

When using the "From URL" feature, some PDF URLs might fail due to CORS restrictions. The browser can only fetch PDFs from servers that allow cross-origin requests.

## 🐛 Known Limitations

1. **Browser Compatibility**: The PDF parser works with simple PDFs. Complex PDFs with embedded fonts, images, or complex structures might not convert perfectly.

2. **CORS Issues**: Some PDF URLs might fail to load due to browser CORS policies.

3. **File Size**: Very large PDF files might take longer to convert or fail due to browser memory limitations.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the main project LICENSE file for details.
