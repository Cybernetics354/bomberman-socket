import type Player from "../app/object.player";

/**
 * The type of the websocket.
 */
export enum ServerWebSocketType {
  /** The game socket. */
  Game = "game",
}

export interface IWebSocketContextBase<TType extends ServerWebSocketType> {
  /** The type of the socket. */
  type: TType;
  /** The payload of the socket. */
  payload: IWebSocketContextPayloadMap[TType];
}

/**
 * The payload of the websocket.
 */
interface IWebSocketContextPayloadMap {
  /** The payload of the websocket for the game socket. */
  [ServerWebSocketType.Game]: {
    /** The session ID of the socket. */
    sessionID: string;
    /** The player of the socket. */
    player: Player;
  };
}

/**
 * The context of the websocket.
 */
export type IWebSocketContext = IWebSocketContextBase<ServerWebSocketType.Game>;
