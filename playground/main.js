import { PdfToMarkdown } from '@lib/index';

(function() {
  'use strict';

  // State
  let currentFile = null;
  let currentUrl = null;
  let markdownOutput = '';

  // DOM Elements
  const elements = {
    // Tabs
    tabs: document.querySelectorAll('.tab[data-tab]'),
    tabContents: {
      file: document.getElementById('tab-file'),
      url: document.getElementById('tab-url'),
      paste: document.getElementById('tab-paste'),
      settings: document.getElementById('tab-settings'),
    },

    // File Upload
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    btnRemove: document.getElementById('btnRemove'),

    // URL
    urlInput: document.getElementById('urlInput'),
    sampleButtons: document.querySelectorAll('.btn-sample'),

    // Convert Button
    convertBtn: document.getElementById('convertBtn'),

    // Output
    loading: document.getElementById('loading'),
    errorBox: document.getElementById('errorBox'),
    errorMsg: document.getElementById('errorMsg'),
    emptyState: document.getElementById('emptyState'),
    outputPreview: document.getElementById('outputPreview'),
    outputRaw: document.getElementById('outputRaw'),
    previewContent: document.getElementById('previewContent'),
    rawContent: document.getElementById('rawContent'),

    // Output Tabs
    outputTabs: document.querySelectorAll('.tab[data-output]'),
    outputContents: {
      preview: document.getElementById('outputPreview'),
      raw: document.getElementById('outputRaw'),
    },

    // Actions
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    // Settings
    tableTolerance: document.getElementById('tableTolerance'),
    toleranceValue: document.getElementById('toleranceValue'),
    detectorCheckboxes: document.querySelectorAll('input[data-detector]'),
  };

  /**
   * Initialize the application
   */
  function init() {
    setupTabs();
    setupFileUpload();
    setupUrlInput();
    setupConvertButton();
    setupOutputTabs();
    setupActions();
    setupSettings();
  }

  /**
   * Setup input tabs
   */
  function setupTabs() {
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update tab buttons
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab contents
        Object.values(elements.tabContents).forEach(content => {
          content.classList.remove('active');
        });
        elements.tabContents[tabName].classList.add('active');

        updateConvertButton();
      });
    });
  }

  /**
   * Setup file upload
   */
  function setupFileUpload() {
    // Click to upload
    elements.uploadZone.addEventListener('click', () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Drag and drop
    elements.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.uploadZone.classList.add('drag-over');
    });

    elements.uploadZone.addEventListener('dragleave', () => {
      elements.uploadZone.classList.remove('drag-over');
    });

    elements.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.uploadZone.classList.remove('drag-over');

      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
          handleFile(file);
        } else {
          showError('Please upload a PDF file');
        }
      }
    });

    // Remove file
    elements.btnRemove.addEventListener('click', () => {
      currentFile = null;
      elements.fileInput.value = '';
      elements.uploadZone.classList.remove('hidden');
      elements.fileInfo.classList.add('hidden');
      updateConvertButton();
    });
  }

  /**
   * Handle file selection
   */
  async function handleFile(file) {
    currentFile = file;
    currentUrl = null;

    // Update UI
    elements.uploadZone.classList.add('hidden');
    elements.fileInfo.classList.remove('hidden');
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = `(${(file.size / 1024).toFixed(2)} KB)`;

    updateConvertButton();
  }

  /**
   * Setup URL input
   */
  function setupUrlInput() {
    elements.urlInput.addEventListener('input', (e) => {
      currentUrl = e.target.value.trim();
      currentFile = null;
      updateConvertButton();
    });

    // Sample buttons
    elements.sampleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        elements.urlInput.value = url;
        currentUrl = url;
        currentFile = null;
        updateConvertButton();
      });
    });
  }

  /**
   * Update convert button state
   */
  function updateConvertButton() {
    const activeTab = document.querySelector('.tab[data-tab].active').dataset.tab;

    if (activeTab === 'file' && currentFile) {
      elements.convertBtn.disabled = false;
    } else if (activeTab === 'url' && currentUrl && currentUrl.startsWith('http')) {
      elements.convertBtn.disabled = false;
    } else {
      elements.convertBtn.disabled = true;
    }
  }

  /**
   * Setup convert button
   */
  function setupConvertButton() {
    elements.convertBtn.addEventListener('click', async () => {
      const activeTab = document.querySelector('.tab[data-tab].active').dataset.tab;

      if (activeTab === 'file' && currentFile) {
        await convertFromFile();
      } else if (activeTab === 'url' && currentUrl) {
        await convertFromUrl();
      }
    });
  }

  /**
   * Convert from file
   */
  async function convertFromFile() {
    showLoading();

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const options = getOptions();
      
      // Convert ArrayBuffer to binary string for PdfReader
      const binaryString = arrayBufferToBinary(arrayBuffer);
      const markdown = await PdfToMarkdown.fromBinary(binaryString, options);

      showOutput(markdown);
    } catch (error) {
      console.error('Conversion error:', error);
      showError(`Failed to convert PDF: ${error.message}`);
    }
  }

  /**
   * Convert from URL
   */
  async function convertFromUrl() {
    showLoading();

    try {
      const options = getOptions();
      const markdown = await PdfToMarkdown.fromUrl(currentUrl, options);
      showOutput(markdown);
    } catch (error) {
      console.error('Conversion error:', error);
      showError(`Failed to fetch PDF from URL: ${error.message}`);
    }
  }

  /**
   * Setup output tabs
   */
  function setupOutputTabs() {
    elements.outputTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const outputType = tab.dataset.output;

        // Update tab buttons
        elements.outputTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update output contents
        Object.values(elements.outputContents).forEach(content => {
          content.classList.remove('active');
        });
        elements.outputContents[outputType].classList.add('active');
      });
    });
  }

  /**
   * Setup settings inputs
   */
  function setupSettings() {
    elements.tableTolerance.addEventListener('input', (e) => {
      elements.toleranceValue.textContent = e.target.value;
    });
  }

  /**
   * Get current conversion options from UI
   */
  function getOptions() {
    const tolerance = parseFloat(elements.tableTolerance.value);
    const weights = Array.from(elements.detectorCheckboxes).map(cb => ({
      name: cb.dataset.detector,
      enabled: cb.checked,
      weight: 0.5 // Default weight
    }));

    return {
      table: {
        tolerance: tolerance,
        registry: {
          weights: weights
        }
      }
    };
  }

  /**
   * Setup action buttons
   */
  function setupActions() {
    // Copy to clipboard
    elements.copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(markdownOutput);

        // Show feedback
        const originalTitle = elements.copyBtn.title;
        elements.copyBtn.title = 'Copied!';
        setTimeout(() => {
          elements.copyBtn.title = originalTitle;
        }, 2000);
      } catch (error) {
        console.error('Copy error:', error);
      }
    });

    // Download markdown
    elements.downloadBtn.addEventListener('click', () => {
      if (!markdownOutput) return;

      const blob = new Blob([markdownOutput], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Show loading state
   */
  function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.errorBox.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.outputPreview.classList.remove('active');
    elements.outputRaw.classList.remove('active');
  }

  /**
   * Show error state
   */
  function showError(message) {
    elements.loading.classList.add('hidden');
    elements.errorBox.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
    elements.outputPreview.classList.remove('active');
    elements.outputRaw.classList.remove('active');
    elements.errorMsg.textContent = message;
  }

  /**
   * Show output
   */
  function showOutput(markdown) {
    markdownOutput = markdown;

    elements.loading.classList.add('hidden');
    elements.errorBox.classList.add('hidden');
    elements.emptyState.classList.add('hidden');

    // Set preview content
    elements.previewContent.innerHTML = marked.parse(markdown);

    // Set raw content
    elements.rawContent.textContent = markdown;
    hljs.highlightElement(elements.rawContent);

    // Show preview by default
    const previewTab = document.querySelector('.tab[data-output="preview"]');
    previewTab.click();

    // Enable action buttons
    elements.copyBtn.disabled = false;
    elements.downloadBtn.disabled = false;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Helper: Convert ArrayBuffer to binary string
   */
  function arrayBufferToBinary(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return binary;
  }
})();
