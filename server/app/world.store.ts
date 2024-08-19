import type { Region } from "../model/geo";
import type WorldObject from "./world.object";

import Brick from "./object.brick";
import Steel from "./object.steel";

/**
 * A map of object constructors.
 */
const OBJECT_CONSTRUCTOR_MAP: Record<
  string,
  (props: Region) => Array<WorldObject>
> = {
  brick: Brick.create,
  steel: Steel.create,
};

/**
 * An object in the world store.
 */
export interface WorldStoreObject {
  /** The kind of the object. */
  kind: string;
  /**
   * The regions of the object.
   * Each region is represented by a tuple of the form [x, y, width?, height?].
   * If width and height are not provided, they will be set to 1.
   */
  regions: Array<[number, number] | [number, number, number, number]>;
}

/**
 * A world store.
 */
export default class WorldStore {
  /**
   * Returns the parsed objects from the given objects.
   * @param objects The objects to parse.
   * @returns The parsed objects.
   */
  public static parseObjects(objects: Array<WorldStoreObject>) {
    const worldObjects: Array<WorldObject> = [];
    objects.forEach((object) => {
      const kind = object.kind;
      const constructor = OBJECT_CONSTRUCTOR_MAP[kind];
      if (!constructor) {
        throw new Error(`Unknown object kind ${kind}`);
      }

      for (const region of object.regions) {
        const [x, y, width, height] = region;
        worldObjects.push(
          ...constructor({ x, y, width: width ?? 1, height: height ?? 1 }),
        );
      }
    });

    return worldObjects;
  }
}
