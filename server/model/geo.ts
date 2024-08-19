/**
 * The coordinate of a point.
 */
export interface Coordinate {
  /** The x coordinate. */
  x: number;
  /** The y coordinate. */
  y: number;
}

/**
 * The size of a region.
 */
export interface Size {
  /** The width of the region. */
  width: number;
  /** The height of the region. */
  height: number;
}

/**
 * The region of a point.
 */
export interface Region extends Coordinate, Size {}
