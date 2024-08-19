import type {
  IRouteHandlerParameter,
  IRouteWebSocketParameter,
} from "../app/server";
import type { IWebSocketContextBase } from "../model/websocket";

import { ServerWebSocketType } from "../model/websocket";
import Server from "../app/server";
import GameSession from "../model/game.session";
import World from "../model/world";

export default class GameController {
  private static _instace: GameController;
  private readonly _gameSessions: Map<string, GameSession> = new Map();

  private constructor() {
    Server.GET<{ id: string }>(
      "/api/games/:id",
      this.joinGameSessionHandler.bind(this)
    );

    Server.WEBSOCKET(
      ServerWebSocketType.Game,
      this.gameSessionHandler.bind(this)
    );
  }

  public static init() {
    if (!this._instace) {
      this._instace = new GameController();
    }
  }

  private async joinGameSessionHandler({
    request,
    upgrade,
    parameter,
  }: IRouteHandlerParameter<{ id: string }>) {
    const { id } = parameter;
    if (!id) {
      return new Response("Not Found", { status: 404 });
    }

    const gameSession = this.getGameSession(id);
    const player = gameSession.draftPlayer();

    if (
      upgrade(request, {
        context: {
          type: ServerWebSocketType.Game,
          payload: {
            sessionID: id,
            player,
          },
        },
      })
    ) {
      return new Response("Upgraded", { status: 101 });
    }

    return new Response("Something went wrong", { status: 500 });
  }

  private async gameSessionHandler({
    ws,
    ...data
  }: IRouteWebSocketParameter<
    IWebSocketContextBase<ServerWebSocketType.Game>
  >) {
    const sessionID = ws.data.payload.sessionID;
    if (!sessionID) {
      return;
    }

    const gameSession = this.getGameSession(sessionID);

    switch (data.type) {
      case "open": {
        ws.data.payload.player.registerClient(ws);
        gameSession.addPlayer(ws.data.payload.player);
        break;
      }

      case "close": {
        ws.data.payload.player.unregisterClient(ws);
        gameSession.removePlayer(ws.data.payload.player.id);
        break;
      }

      case "message": {
        const player = ws.data.payload.player;
        if (!player.feed(data.payload.toString())) {
          console.debug("unknown input", {
            sessionID,
            playerID: player.id,
            payload: data.payload,
          });
        }
        break;
      }
    }
    return;
  }

  // TODO: this is a temporary solution.
  private getGameSession(sessionID: string): GameSession {
    if (this._gameSessions.has(sessionID)) {
      return this._gameSessions.get(sessionID)!;
    }

    const world = new World({
      id: sessionID,
      width: 15,
      height: 15,
    });
    const gameSession = new GameSession(sessionID, world);
    this._gameSessions.set(sessionID, gameSession);
    gameSession.init();

    return gameSession;
  }
}
GameController.init();
