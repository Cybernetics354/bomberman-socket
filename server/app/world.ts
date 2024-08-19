import type { Coordinate, Size } from "../model/geo";
import type Clock from "../app/clock";
import type EventCenter from "../app/event.center";
import type { WorldObjectID, WorldObjectLayer } from "../app/world.object";
import type WorldObject from "../app/world.object";
import type GameSession from "../app/game.session";
import type { DisposableEventMap } from "../model/disposable";

import { EventEmitter } from "events";

import { WorldObjectLayerCount } from "../app/world.object";

/**
 * Properties of a world.
 */
export interface WorldProps {
  id: string;
  width: number;
  height: number;
  objects?: Array<WorldObject>;
}

interface WorldEventMap extends DisposableEventMap {}

/**
 * A world class.
 */
export default class World
  extends EventEmitter<WorldEventMap>
  implements Disposable
{
  /** The ID of the world. */
  public readonly id: string;
  /** The width of the world. */
  public readonly width: number;
  /** The height of the world. */
  public readonly height: number;
  /** The objects in the world. */
  public readonly objects: Map<WorldObjectID, WorldObject> = new Map();

  /** The game session. */
  public get gameSession(): GameSession | undefined {
    return this._gameSession;
  }

  /** The game session. */
  private _gameSession: GameSession | undefined;
  /** The clock. */
  private _clock: Clock | undefined;
  /** The event center. */
  private _eventCenter: EventCenter | undefined;
  /** Whether the world is initialized. */
  private _isInitialized = false;
  /** The map of the world. */
  private _map: Array<Array<WorldObjectID | null>> = [];

  /**
   * Creates a new world.
   * @param props The properties of the world.
   */
  constructor(props: WorldProps) {
    super();

    this.id = props.id;
    this.width = props.width;
    this.height = props.height;

    for (let y = 0; y < this.height; y++) {
      this._map[y] = [];
      const mapSize = this.width * WorldObjectLayerCount;
      for (let x = 0; x < mapSize; x++) {
        this._map[y][x] = null;
      }
    }

    for (const object of props.objects || []) {
      this.objects.set(object.id, object);
    }

    this.on("disposed", () => {
      this._isInitialized = false;
      this._map = [];

      this.objects.forEach((object) => object[Symbol.dispose]());
      this.objects.clear();
    });
  }

  /**
   * Initializes the world.
   * @param gameSession The game session to initialize the world with.
   */
  public init(gameSession?: GameSession): void {
    if (gameSession) {
      this._gameSession = gameSession;
      this._clock = gameSession.clock;
      this._eventCenter = gameSession.eventCenter;
    }

    this._isInitialized = true;
    this.objects.forEach((object) => {
      this.initObject(object);
      this.placeObject(object.id);
    });
  }

  /**
   * Returns the IDs of the objects at the given positions.
   * @param layer The layer to lookup.
   * @param positions The positions to lookup.
   * @returns The IDs of the objects at the given positions.
   */
  public lookupByLayer(
    layer: WorldObjectLayer,
    ...positions: Array<Coordinate>
  ): Array<WorldObjectID | null> {
    const result: Array<WorldObjectID | null> = [];
    for (const position of positions) {
      const { x, y } = position;
      result.push(this._map[y][x + layer]);
    }
    return result;
  }

  /**
   * Installs the given object.
   * The object will be initialized if it is not initialized.
   *
   * This operation is only installing the object, not placing it.
   * To place the object, use `placeObject` instead.
   * @param object The object to install.
   * @returns The flag indicating whether the object was installed successfully.
   */
  public installObject(object: WorldObject): boolean {
    if (!this._isInitialized) {
      throw new Error("World is not initialized");
    }

    if (this.objects.has(object.id)) {
      return false;
    }

    this.objects.set(object.id, object);
    this.initObject(object);
    return true;
  }

  /**
   * Uninstalls the given object.
   * @param objectID The ID of the object to uninstall.
   * @returns The flag indicating whether the object was uninstalled successfully.
   */
  public uninstallObject(objectID: WorldObjectID): boolean {
    if (!this._isInitialized) {
      throw new Error("World is not initialized");
    }

    const object = this.objects.get(objectID);
    if (!object) {
      return false;
    }

    this.objects.delete(object.id);
    object[Symbol.dispose]();
    return true;
  }

  /**
   * Places the given object at the given position.
   * The object must be installed before placing.
   * @param objectID The ID of the object to place.
   * @param position The position to place the object at. If not provided, the object's position will be used.
   * @returns The position of the object, or undefined if the object was not placed successfully.
   */
  public placeObject(
    objectID: WorldObjectID,
    position?: Coordinate,
  ): Coordinate | undefined {
    if (!this._isInitialized) {
      throw new Error("World is not initialized");
    }

    const object = this.objects.get(objectID);
    if (!object) {
      return;
    }

    const { x, y } = position || object.position;

    this.objects.set(object.id, object);
    const isSuccessful = this.restructureMap({
      id: object.id,
      layer: object.layer,
      size: object.size,
      newPosition: { x, y },
    });
    if (!isSuccessful) {
      return;
    }

    object.placed({ position: { x, y } });
    return { x, y };
  }

  /**
   * Displaces the given object.
   * @param objectID The ID of the object to displace.
   * @returns Whether the object was displaced successfully.
   */
  public displaceObject(objectID: WorldObjectID): boolean {
    if (!this._isInitialized) {
      throw new Error("World is not initialized");
    }

    const object = this.objects.get(objectID);
    if (!object) {
      return false;
    }

    const isSuccessful = this.restructureMap({
      id: object.id,
      layer: object.layer,
      size: object.size,
      oldPosition: object.position,
    });
    if (!isSuccessful) {
      return false;
    }

    object.takeout({});
    return true;
  }

  /**
   * Installs and places the given object.
   * @param object The object to install and place.
   * @returns The position of the object, or undefined if the object was not installed or placed successfully.
   */
  public installAndPlaceObject(object: WorldObject): Coordinate | undefined {
    if (!this.installObject(object)) {
      return;
    }
    return this.placeObject(object.id);
  }

  /**
   * Uninstalls and displaces the given object.
   * @param objectID The ID of the object to uninstall and displace.
   * @returns The flag indicating whether the object was uninstalled and displaced successfully.
   */
  public uninstallAndDisplaceObject(objectID: WorldObjectID): boolean {
    if (!this.uninstallObject(objectID)) {
      return false;
    }
    return this.displaceObject(objectID);
  }

  /**
   * Moves the given object to the given position.
   * @param object The object to move.
   * @param newPosition The new position to move the object to.
   * @returns The new position of the object, or undefined if the object was not found.
   */
  public moveObject(
    objectID: WorldObjectID,
    newPosition: Coordinate,
  ): Coordinate | undefined {
    if (!this._isInitialized) return;

    const object = this.objects.get(objectID);
    if (!object) {
      return;
    }

    const { x, y } = newPosition;
    if (
      !this.restructureMap({
        id: object.id,
        layer: object.layer,
        size: object.size,
        oldPosition: object.position,
        newPosition: { x, y },
      })
    ) {
      return;
    }

    return { x, y };
  }

  /**
   * Disposes the world.
   */
  public [Symbol.dispose](): void {
    this.emit("disposed");
  }

  /**
   * Initializes the given object.
   * @param object The object to initialize.
   */
  private initObject(object: WorldObject): void {
    if (!object.isInitialized) {
      object.init({
        session: this._gameSession,
        clock: this._clock,
        eventCenter: this._eventCenter,
        world: this,
      });
    }
  }

  /**
   * Restructures the map to accommodate the given object.
   * @param object The object to restructure.
   * @returns Whether the restructuring was successful.
   */
  private restructureMap({
    id,
    layer,
    size,
    oldPosition,
    newPosition,
  }: {
    /** The ID of the object to restructure. */
    id: WorldObjectID;
    /** The layer of the object to restructure. */
    layer: WorldObjectLayer;
    /** The size of the object to restructure. */
    size: Size;
    /**
     * The old position of the object to restructure.
     * If not provided, it means the object is initial placement.
     */
    oldPosition?: Coordinate;
    /**
     * The new position of the object to restructure.
     * If not provided it means the object will be removed from the map.
     */
    newPosition?: Coordinate;
  }): boolean {
    if (!oldPosition && !newPosition) {
      throw new Error("Either oldPosition or newPosition must be provided");
    }

    const { width, height } = size;

    if (newPosition) {
      const { x: newX, y: newY } = newPosition;
      if (
        newX < 0 ||
        newY < 0 ||
        newX + width > this.width ||
        newY + height > this.height
      ) {
        return false;
      }
    }

    // only removing the old position.
    if (oldPosition && !newPosition) {
      const { x: oldX, y: oldY } = oldPosition;

      for (let x = oldX; x < oldX + width; x++) {
        for (let y = oldY; y < oldY + height; y++) {
          this.setMapCell({ x, y }, layer, null);
        }
      }
      return true;
    }

    // only adding the new position.
    if (!oldPosition && newPosition) {
      const { x: newX, y: newY } = newPosition;
      for (let x = newX; x < newX + width; x++) {
        for (let y = newY; y < newY + height; y++) {
          this.setMapCell({ x, y }, layer, id);
        }
      }
      return true;
    }

    const { x: oldX, y: oldY } = oldPosition!;
    const { x: newX, y: newY } = newPosition!;

    // calculate overlapping region.
    const overlapX = Math.max(oldX, newX);
    const overlapY = Math.max(oldY, newY);
    const overlapWidth = Math.min(oldX + width, newX + width) - overlapX;
    const overlapHeight = Math.min(oldY + height, newY + height) - overlapY;

    // remove old object, excluding overlap.
    for (let x = oldX; x < overlapX; x++) {
      for (let y = oldY; y < oldY + height; y++) {
        this.setMapCell({ x, y }, layer, null);
      }
    }
    for (let x = overlapX + overlapWidth; x < oldX + width; x++) {
      for (let y = oldY; y < oldY + height; y++) {
        this.setMapCell({ x, y }, layer, null);
      }
    }
    for (let x = overlapX; x < overlapX + overlapWidth; x++) {
      for (let y = oldY; y < overlapY; y++) {
        this.setMapCell({ x, y }, layer, null);
      }
    }
    for (let x = overlapX; x < overlapX + overlapWidth; x++) {
      for (let y = overlapY + overlapHeight; y < oldY + height; y++) {
        this.setMapCell({ x, y }, layer, null);
      }
    }

    // add new object, excluding overlap.
    for (let x = newX; x < overlapX; x++) {
      for (let y = newY; y < newY + height; y++) {
        this.setMapCell({ x, y }, layer, id);
      }
    }
    for (let x = overlapX + overlapWidth; x < newX + width; x++) {
      for (let y = newY; y < newY + height; y++) {
        this.setMapCell({ x, y }, layer, id);
      }
    }
    for (let x = overlapX; x < overlapX + overlapWidth; x++) {
      for (let y = newY; y < overlapY; y++) {
        this.setMapCell({ x, y }, layer, id);
      }
    }
    for (let x = overlapX; x < overlapX + overlapWidth; x++) {
      for (let y = overlapY + overlapHeight; y < newY + height; y++) {
        this.setMapCell({ x, y }, layer, id);
      }
    }

    return true;
  }

  /**
   * Sets the map cell at the given position.
   * @param position The position to set the map cell at.
   * @param layer The layer to set the map cell at.
   * @param id The ID to set the map cell at.
   */
  private setMapCell(
    position: Coordinate,
    layer: WorldObjectLayer,
    id: WorldObjectID | null,
  ): void {
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= this.width ||
      position.y >= this.height
    ) {
      throw new Error(`Position ${position.x}, ${position.y} is out of bounds`);
    }

    // if takeout operation, no need to check for intersections.
    if (id === null) {
      this._map[position.y][position.x + layer] = null;
      return;
    }

    const currentCellObjectID = this._map[position.y][position.x + layer];
    if (currentCellObjectID !== null) {
      throw new ErrorOverlappingObject(id, currentCellObjectID);
    }

    if (!this._isInitialized) {
      this._map[position.y][position.x + layer] = id;
      return;
    }

    const intersectedObjectIDs: Array<WorldObjectID> = [];
    for (let index = 0; index < WorldObjectLayerCount; index++) {
      if (index === layer) {
        this._map[position.y][position.x + index] = id;
        continue;
      }

      const objectID = this._map[position.y][position.x + index];
      if (objectID !== null) {
        intersectedObjectIDs.push(objectID);
      }
    }

    if (intersectedObjectIDs.length > 0) {
      this.gameSession?.eventCenter.objectIntersect(
        id,
        ...intersectedObjectIDs,
      );
    }
  }
}

/**
 * An error thrown when an object overlaps with another object.
 */
export class ErrorOverlappingObject extends Error {
  /** The ID of the object that overlaps with another object. */
  public readonly objectID: WorldObjectID;
  /** The ID of the existing object. */
  public readonly existingObjectID: WorldObjectID;

  /**
   * Creates a new overlapping object error.
   * @param objectID The ID of the object that overlaps with another object.
   * @param existingObjectID The ID of the existing object.
   */
  constructor(objectID: WorldObjectID, existingObjectID: WorldObjectID) {
    super(`Object '${objectID}' overlaps with object '${existingObjectID}'`);

    this.objectID = objectID;
    this.existingObjectID = existingObjectID;
  }
}
