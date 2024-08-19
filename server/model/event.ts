import type { WorldObjectID } from "../app/world.object";

/**
 * The event type.
 */
export enum EventType {
  /** The player event. */
  PLAYER = "player",

  /** The intersect event. */
  INTERSECT = "intersect",
  /** The bomb placed event. */
  BOMB_PLACED = "bomb_placed",
  /** The bomb exploded event. */
  BOMB_EXPLODED = "bomb_exploded",
}

/**
 * The base event interface.
 */
export interface IEventBase<T extends EventType = EventType> {
  type: T;
  payload: IEventPayloadMap[T];
}

/**
 * The payload of the event.
 */
export interface IEventPayloadMap {
  /** The payload of the event for the player event. */
  [EventType.PLAYER]: {
    /** The ID of the player. */
    playerID: WorldObjectID;
    /**
     * The state of the player.
     * If not provided, the player is removed from the game.
     */
    state:
      | {
          facing?: string;
          position?: [number, number];
          level?: number;
          bombLimit?: number;
          killCount?: number;
        }
      | undefined;
  };

  /** The payload of the event for the intersect event. */
  [EventType.INTERSECT]: {
    initiatorObjectID: WorldObjectID;
    objectIDs: Array<WorldObjectID>;
  };
  /** The payload of the event for the bomb placed event. */
  [EventType.BOMB_PLACED]: {
    bombID: WorldObjectID;
    ownerPlayerID: WorldObjectID;
  };
  /** The payload of the event for the bomb exploded event. */
  [EventType.BOMB_EXPLODED]: {
    bombID: WorldObjectID;
    ownerPlayerID: WorldObjectID;
    affectedObjectIDs: Array<WorldObjectID>;
  };
}

/**
 * The union of all events.
 */
export type IEvent =
  | IEventBase<typeof EventType.PLAYER>
  | IEventBase<typeof EventType.INTERSECT>
  | IEventBase<typeof EventType.BOMB_PLACED>
  | IEventBase<typeof EventType.BOMB_EXPLODED>;
