import type { Coordinate, Region } from "./geo";
import type { WorldObjectID, WorldObjectPlacedProps } from "./world.object";

import { EventType } from "./event";
import WorldObject, { WorldObjectLayer } from "./world.object";

/**
 * The brick kind.
 */
export const BRICK_KIND = "brick" as const;

/**
 * The brick properties.
 */
export interface BrickProps {
  position: Coordinate;
}

/**
 * A brick object class.
 */
export default class Brick extends WorldObject {
  /**
   * Creates a new brick object.
   * @param props The properties of the brick.
   */
  constructor(props: BrickProps) {
    super(BRICK_KIND, WorldObjectLayer.GROUND, props.position, {
      width: 1,
      height: 1,
    });
  }

  /**
   * Creates brick objects.
   * @param props The properties of the brick.
   * @returns The brick objects.
   */
  public static create(props: Region): Array<WorldObject> {
    const { x, y, width, height } = props;

    const brick = new Brick({ position: { x, y } });
    if (width <= 1 && height <= 1) {
      return [brick];
    }

    const bricks: Array<WorldObject> = [brick];
    for (let yDelta = 1; yDelta < height; yDelta++) {
      for (let xDelta = 1; xDelta < width; xDelta++) {
        bricks.push(new Brick({ position: { x: xDelta + x, y: yDelta + y } }));
      }
    }

    return bricks;
  }

  public placed(data: WorldObjectPlacedProps): void {
    super.placed(data);

    const subscription = this._eventCenter?.event$.subscribe((event) => {
      switch (event.type) {
        case EventType.BOMB_EXPLODED: {
          const { ownerPlayerID, affectedObjectIDs } = event.payload;
          if (affectedObjectIDs.some((objectID) => objectID === this.id)) {
            this.exploded(ownerPlayerID);
          }
          break;
        }
      }
    });
    this.on("displaced", () => {
      subscription?.unsubscribe();
    });
  }

  /**
   * An action when the brick is affected by a bomb explosion.
   * @param _ownerPlayerID The ID of the player who owns the bomb.
   */
  private exploded(_ownerPlayerID: WorldObjectID): void {
    if (!this._world) return;

    this._world.displaceObject(this.id);

    // TODO: increase score to player who owns the bomb.
  }
}
