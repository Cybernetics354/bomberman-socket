import type { WorldObjectID } from "./world.object";

/**
 * The event type.
 */
export enum EventType {
  PLAYER = "player",

  INTERSECT = "intersect",
  BOMB_PLACED = "bomb_placed",
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

  [EventType.INTERSECT]: {
    initiatorObjectID: WorldObjectID;
    objectIDs: Array<WorldObjectID>;
  };
  [EventType.BOMB_PLACED]: {
    bombID: WorldObjectID;
    ownerPlayerID: WorldObjectID;
  };
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
