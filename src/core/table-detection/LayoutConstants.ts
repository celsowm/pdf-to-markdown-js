/**
 * Centralized layout constants to avoid magic numbers.
 * These values are in PDF user space units (points).
 */
export const LAYOUT_CONSTANTS = {
  /**
   * Minimum gap between vertical macro-blocks (projection profile).
   */
  MIN_BLOCK_GAP_Y: 20,

  /**
   * Minimum height for a macro-block to be considered a table candidate.
   */
  MIN_BLOCK_HEIGHT: 40,

  /**
   * Minimum gap between horizontal macro-blocks (side-by-side tables).
   */
  MIN_BLOCK_GAP_X: 30,

  /**
   * Minimum width for a macro-block.
   */
  MIN_BLOCK_WIDTH: 50,

  /**
   * Projection profile bin size (granularity).
   */
  PROJECTION_BIN_SIZE: 5,

  /**
   * Default padding for macro-region element filtering.
   */
  BLOCK_PADDING: 10,

  /**
   * Distance threshold for assigning orphan elements to nearest cells.
   */
  MAX_CELL_DISTANCE: 50,

  /**
   * Minimum density (filled cells / total cells) for large tables.
   */
  MIN_DENSITY_LARGE: 0.4,

  /**
   * Minimum density for small tables (<= 12 cells) to avoid paragraph false positives.
   */
  MIN_DENSITY_SMALL: 0.75,
  
  /**
   * Small table cell count threshold.
   */
  SMALL_TABLE_THRESHOLD: 12,
};
