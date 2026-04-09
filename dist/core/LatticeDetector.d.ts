/**
 * Represents a line segment detected in the PDF content stream.
 */
export interface LineSegment {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly isHorizontal: boolean;
    readonly isVertical: boolean;
}
/**
 * Represents an intersection point between horizontal and vertical lines.
 */
export interface Intersection {
    readonly x: number;
    readonly y: number;
}
/**
 * Represents a table cell defined by its bounding box.
 */
export interface TableCell {
    readonly rowIndex: number;
    readonly colIndex: number;
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
}
/**
 * Represents a detected table with its grid structure.
 */
export interface DetectedTable {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly rows: number;
    readonly cols: number;
    readonly cells: TableCell[];
    readonly hasHeader: boolean;
}
/**
 * Configuration for Lattice table detection.
 */
export interface LatticeConfig {
    /**
     * Tolerance for line alignment (in user space units).
     * Higher values allow more variation in line positions.
     * Default: 2
     */
    readonly lineTolerance: number;
    /**
     * Minimum table width (in user space units).
     * Tables smaller than this are ignored.
     * Default: 50
     */
    readonly minTableWidth: number;
    /**
     * Minimum table height (in user space units).
     * Tables smaller than this are ignored.
     * Default: 30
     */
    readonly minTableHeight: number;
    /**
     * Minimum cells in a table (rows x cols).
     * Tables with fewer cells are ignored.
     * Default: { rows: 2, cols: 2 }
     */
    readonly minCells: {
        rows: number;
        cols: number;
    };
    /**
     * Weight for table detection confidence.
     * Higher values make the detector more aggressive in finding tables.
     * Range: 0-1, Default: 0.5
     */
    readonly detectionWeight: number;
}
/**
 * Default Lattice configuration.
 */
export declare const DEFAULT_LATTICE_CONFIG: LatticeConfig;
/**
 * Lattice algorithm for table detection in PDFs.
 *
 * Detects tables by finding horizontal and vertical lines that form grid structures.
 * This is the same approach used by Camelot-py and other PDF table extraction tools.
 *
 * PDFs draw tables using line operators:
 * - `m` (moveto) + `l` (lineto) for lines
 * - `re` (rectangle) for boxes
 * - `S` or `s` (stroke) to render them
 *
 * The algorithm:
 * 1. Parse content stream for line-drawing operations
 * 2. Group lines into horizontal and vertical sets
 * 3. Find intersections between line sets
 * 4. Cluster intersections into table grids
 * 5. Extract cell boundaries from the grid
 */
export declare class LatticeDetector {
    private readonly config;
    constructor(config?: Partial<LatticeConfig>);
    /**
     * Detects tables in PDF content stream text.
     * @param content The raw PDF content stream
     * @returns Array of detected tables
     */
    detectTables(content: string): DetectedTable[];
    /**
     * Extracts line segments from PDF content stream.
     * Parses PDF graphics operators: m, l, re, h, S, s
     */
    private extractLines;
    /**
     * Finds intersection points between horizontal and vertical lines.
     */
    private findIntersections;
    /**
     * Clusters intersection points into potential tables.
     * Uses proximity-based clustering to group intersections.
     */
    private clusterIntersections;
    /**
     * Builds a table grid from intersection points.
     * Identifies rows and columns from the intersection pattern.
     */
    private buildTableGrid;
    /**
     * Groups intersection points by a coordinate axis.
     */
    private groupByCoordinate;
    /**
     * Calculates Euclidean distance between two points.
     */
    private distance;
    /**
     * Returns the current configuration.
     */
    getConfig(): LatticeConfig;
}
//# sourceMappingURL=LatticeDetector.d.ts.map