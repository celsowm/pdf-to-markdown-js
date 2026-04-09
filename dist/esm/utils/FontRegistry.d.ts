/**
 * Font weight values according to CSS/OpenType specification.
 */
export declare enum FontWeight {
    Thin = 100,
    ExtraLight = 200,
    Light = 300,
    Regular = 400,
    Medium = 500,
    SemiBold = 600,
    Bold = 700,
    ExtraBold = 800,
    Black = 900
}
/**
 * Font style classification.
 */
export declare enum FontStyle {
    Normal = "normal",
    Italic = "italic",
    Oblique = "oblique"
}
/**
 * Detected font characteristics.
 */
export interface FontCharacteristics {
    readonly weight: FontWeight;
    readonly style: FontStyle;
    readonly isBold: boolean;
    readonly isItalic: boolean;
    readonly familyName: string;
    readonly variantName: string;
}
/**
 * Registry of known font name patterns for detecting bold and italic variants.
 * Covers major font families and naming conventions used in PDFs.
 */
export declare class FontRegistry {
    /**
     * Patterns that indicate bold weight in font names.
     */
    private static readonly BOLD_PATTERNS;
    /**
     * Patterns that indicate italic/oblique style in font names.
     */
    private static readonly ITALIC_PATTERNS;
    /**
     * Known font family mappings with their variant names.
     */
    private static readonly FONT_FAMILIES;
    /**
     * Analyzes a font name and returns its characteristics.
     */
    static analyze(fontName: string): FontCharacteristics;
    /**
     * Detects font weight from name.
     */
    private static detectWeight;
    /**
     * Detects font style from name.
     */
    private static detectStyle;
    /**
     * Determines if font is bold based on weight.
     */
    private static isBold;
    /**
     * Determines if font is italic/oblique.
     */
    private static isItalic;
    /**
     * Extracts the family name from a full font name.
     */
    private static extractFamilyName;
    /**
     * Extracts the variant name from a full font name.
     */
    private static extractVariantName;
}
//# sourceMappingURL=FontRegistry.d.ts.map