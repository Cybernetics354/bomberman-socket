import type { Coordinate, Region } from "./geo";
import type { WorldObjectPlacedProps } from "./world.object";

import WorldObject, { WorldObjectLayer } from "./world.object";

/**
 * The steel kind.
 */
export const STEEL_KIND = "steel" as const;

/**
 * The steel properties.
 */
export interface SteelProps {
  /** The position of the steel. */
  position: Coordinate;
}

/**
 * A steel object class.
 */
export default class Steel extends WorldObject {
  /**
   * Creates a new steel object.
   * @param props The properties of the steel.
   */
  constructor(props: SteelProps) {
    super(STEEL_KIND, WorldObjectLayer.GROUND, props.position, {
      width: 1,
      height: 1,
    });
  }

  /**
   * Creates steel objects.
   * @param props The properties of the steel.
   * @returns The steel objects.
   */
  public static create(props: Region): Array<WorldObject> {
    const { x, y, width, height } = props;

    const steel = new Steel({ position: { x, y } });
    if (width <= 1 && height <= 1) {
      return [steel];
    }

    const steels: Array<WorldObject> = [steel];
    for (let yDelta = 1; yDelta < height; yDelta++) {
      for (let xDelta = 1; xDelta < width; xDelta++) {
        steels.push(new Steel({ position: { x: xDelta + x, y: yDelta + y } }));
      }
    }

    return steels;
  }

  public placed(data: WorldObjectPlacedProps): void {
    super.placed(data);
  }
}
