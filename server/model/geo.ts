export interface Coordinate {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Region extends Coordinate, Size {}
