"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontRegistry = exports.FontStyle = exports.FontWeight = void 0;
/**
 * Font weight values according to CSS/OpenType specification.
 */
var FontWeight;
(function (FontWeight) {
    FontWeight[FontWeight["Thin"] = 100] = "Thin";
    FontWeight[FontWeight["ExtraLight"] = 200] = "ExtraLight";
    FontWeight[FontWeight["Light"] = 300] = "Light";
    FontWeight[FontWeight["Regular"] = 400] = "Regular";
    FontWeight[FontWeight["Medium"] = 500] = "Medium";
    FontWeight[FontWeight["SemiBold"] = 600] = "SemiBold";
    FontWeight[FontWeight["Bold"] = 700] = "Bold";
    FontWeight[FontWeight["ExtraBold"] = 800] = "ExtraBold";
    FontWeight[FontWeight["Black"] = 900] = "Black";
})(FontWeight || (exports.FontWeight = FontWeight = {}));
/**
 * Font style classification.
 */
var FontStyle;
(function (FontStyle) {
    FontStyle["Normal"] = "normal";
    FontStyle["Italic"] = "italic";
    FontStyle["Oblique"] = "oblique";
})(FontStyle || (exports.FontStyle = FontStyle = {}));
/**
 * Registry of known font name patterns for detecting bold and italic variants.
 * Covers major font families and naming conventions used in PDFs.
 */
class FontRegistry {
    /**
     * Analyzes a font name and returns its characteristics.
     */
    static analyze(fontName) {
        const familyName = this.extractFamilyName(fontName);
        const variantName = this.extractVariantName(fontName);
        const weight = this.detectWeight(fontName);
        const style = this.detectStyle(fontName);
        return {
            weight,
            style,
            isBold: this.isBold(fontName, weight),
            isItalic: this.isItalic(fontName, style),
            familyName,
            variantName,
        };
    }
    /**
     * Detects font weight from name.
     */
    static detectWeight(fontName) {
        const lower = fontName.toLowerCase();
        // Check for numeric weight
        const weightMatch = lower.match(/(\d{3})/);
        if (weightMatch) {
            const numericWeight = parseInt(weightMatch[1], 10);
            if ([100, 200, 300, 400, 500, 600, 700, 800, 900].includes(numericWeight)) {
                return numericWeight;
            }
        }
        // Check patterns
        if (this.BOLD_PATTERNS.some((pattern) => pattern.test(fontName))) {
            if (/black|heavy|fat|900/.test(lower)) {
                return FontWeight.Black;
            }
            if (/extrabold|ultra|800/.test(lower)) {
                return FontWeight.ExtraBold;
            }
            if (/demibold|semibold|600|700/.test(lower)) {
                return FontWeight.SemiBold;
            }
            return FontWeight.Bold;
        }
        if (/medium|500/.test(lower)) {
            return FontWeight.Medium;
        }
        if (/light|300/.test(lower)) {
            return FontWeight.Light;
        }
        return FontWeight.Regular;
    }
    /**
     * Detects font style from name.
     */
    static detectStyle(fontName) {
        const lower = fontName.toLowerCase();
        if (this.ITALIC_PATTERNS.some((pattern) => pattern.test(fontName))) {
            if (/oblique/.test(lower)) {
                return FontStyle.Oblique;
            }
            return FontStyle.Italic;
        }
        return FontStyle.Normal;
    }
    /**
     * Determines if font is bold based on weight.
     */
    static isBold(_fontName, weight) {
        return weight >= FontWeight.Bold;
    }
    /**
     * Determines if font is italic/oblique.
     */
    static isItalic(_fontName, style) {
        return style === FontStyle.Italic || style === FontStyle.Oblique;
    }
    /**
     * Extracts the family name from a full font name.
     */
    static extractFamilyName(fontName) {
        // Try to match known families
        for (const family of this.FONT_FAMILIES.keys()) {
            if (fontName.toLowerCase().includes(family.toLowerCase())) {
                return family;
            }
        }
        // Extract from common patterns
        const patterns = [
            /^(.+?)[-_]/, // Before hyphen or underscore
            /^(.+?)(Bold|Italic|Oblique|MT|PS)/i, // Before variant indicators
            /^(.+?)[A-Z]/, // Before uppercase (for camelCase)
        ];
        for (const pattern of patterns) {
            const match = fontName.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return fontName;
    }
    /**
     * Extracts the variant name from a full font name.
     */
    static extractVariantName(fontName) {
        const family = this.extractFamilyName(fontName);
        return fontName.substring(family.length);
    }
}
exports.FontRegistry = FontRegistry;
/**
 * Patterns that indicate bold weight in font names.
 */
FontRegistry.BOLD_PATTERNS = [
    /bold/i,
    /demibold/i,
    /semi[- ]?bold/i,
    /extrabold/i,
    /ultrabold/i,
    /heavy/i,
    /black/i,
    /fat/i,
    /super[- ]?bold/i,
    /ultra/i,
    /extra[- ]?bold/i,
    /[7-9]00/, // Weight numbers 700-900
];
/**
 * Patterns that indicate italic/oblique style in font names.
 */
FontRegistry.ITALIC_PATTERNS = [
    /italic/i,
    /oblique/i,
    /slanted/i,
    /inclined/i,
    /kursiv/i, // German
    /corsiva/i, // Italian
    /cursiva/i, // Spanish/Portuguese
    /[^a-z]i[^a-z]/i, // "I" as separate indicator
];
/**
 * Known font family mappings with their variant names.
 */
FontRegistry.FONT_FAMILIES = new Map([
    [
        'Helvetica',
        {
            bold: ['Helvetica-Bold', 'Helvetica-BoldOblique', 'Helv'],
            italic: ['Helvetica-Oblique', 'Helvetica-Italic'],
            boldItalic: ['Helvetica-BoldOblique'],
        },
    ],
    [
        'Arial',
        {
            bold: ['Arial-BoldMT', 'Arial-Bold', 'ArialMT-Bold'],
            italic: ['Arial-ItalicMT', 'Arial-Italic'],
            boldItalic: ['Arial-BoldItalicMT'],
        },
    ],
    [
        'Times',
        {
            bold: ['TimesNewRomanPS-BoldMT', 'Times-Bold', 'TimesNewRoman-Bold'],
            italic: ['TimesNewRomanPS-ItalicMT', 'Times-Italic'],
            boldItalic: ['TimesNewRomanPS-BoldItalicMT'],
        },
    ],
    [
        'Courier',
        {
            bold: ['CourierNewPS-BoldMT', 'Courier-Bold'],
            italic: ['CourierNewPS-ItalicMT', 'Courier-Oblique'],
            boldItalic: ['CourierNewPS-BoldItalicMT'],
        },
    ],
    [
        'Calibri',
        {
            bold: ['Calibri-Bold', 'Calibri-BoldMT'],
            italic: ['Calibri-Italic', 'Calibri-ItalicMT'],
            boldItalic: ['Calibri-BoldItalic'],
        },
    ],
    [
        'Verdana',
        {
            bold: ['Verdana-Bold', 'Verdana-BoldMT'],
            italic: ['Verdana-Italic', 'Verdana-ItalicMT'],
            boldItalic: ['Verdana-BoldItalic'],
        },
    ],
    [
        'Georgia',
        {
            bold: ['Georgia-Bold', 'Georgia-BoldMT'],
            italic: ['Georgia-Italic', 'Georgia-ItalicMT'],
            boldItalic: ['Georgia-BoldItalic'],
        },
    ],
    [
        'Roboto',
        {
            bold: ['Roboto-Bold', 'Roboto-BoldMT', 'Roboto_Bold'],
            italic: ['Roboto-Italic', 'Roboto-ItalicMT'],
            boldItalic: ['Roboto-BoldItalic'],
        },
    ],
    [
        'OpenSans',
        {
            bold: ['OpenSans-Bold', 'OpenSans-BoldMT'],
            italic: ['OpenSans-Italic', 'OpenSans-ItalicMT'],
            boldItalic: ['OpenSans-BoldItalic'],
        },
    ],
    [
        'Liberation',
        {
            bold: ['LiberationSans-Bold', 'LiberationMono-Bold'],
            italic: ['LiberationSans-Italic', 'LiberationMono-Italic'],
            boldItalic: ['LiberationSans-BoldItalic'],
        },
    ],
    [
        'DejaVu',
        {
            bold: ['DejaVuSans-Bold', 'DejaVuSansMono-Bold'],
            italic: ['DejaVuSans-Oblique'],
            boldItalic: ['DejaVuSans-BoldOblique'],
        },
    ],
]);
//# sourceMappingURL=FontRegistry.js.map