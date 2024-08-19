import type { DisposableEventMap } from "../model/disposable";
import type { PlayerFacing } from "./object.player";
import type Player from "./object.player";
import type World from "./world";

import { EventEmitter } from "events";

import Server from "./server";

interface GameStateEventMap extends DisposableEventMap {}

export default class GameState
  extends EventEmitter<GameStateEventMap>
  implements Disposable
{
  private _sessionID: string;
  private _map:
    | {
        id: string;
        name: string;
        width: number;
        height: number;
      }
    | undefined;
  private _players: Array<{
    id: string;
    name: string;
    sprite_type: number;
    facing: PlayerFacing;
    level: number;
    state: number;
    kill_count: number;
  }>;
  private _playerPositions: Array<{
    id: string;
    x: number;
    y: number;
  }>;

  public get state() {
    return {
      map: this._map,
      players: this._players,
      player_positions: this._playerPositions,
    };
  }

  public constructor(sessionID: string) {
    super();

    this._sessionID = sessionID;
    this._map = undefined;
    this._players = [];
    this._playerPositions = [];
  }

  public captureWorld(world: World): void {
    this._map = {
      id: world.id,
      name: world.id,
      width: world.width,
      height: world.height,
    };
  }

  public capturePlayer(player: Player): void {
    this._players.push({
      id: player.id,
      name: player.name,
      sprite_type: 0,
      facing: player.facing,
      level: player.level,
      state: 0,
      kill_count: player.killCount,
    });
    this._playerPositions.push({
      id: player.id,
      x: player.position.x,
      y: player.position.y,
    });

    player.on("disposed", () => {
      this._players = this._players.filter(
        (currentPlayer) => currentPlayer.id !== player.id,
      );
      this._playerPositions = this._playerPositions.filter(
        (playerPosition) => playerPosition.id !== player.id,
      );
      this.publishPlayers();
      this.publishPlayerPositions();
    });

    Server.server.publish(
      `player/${player.id}`,
      JSON.stringify({
        your_id: player.id,
        state: this.state,
      }),
    );

    const playerStateSubscription = player.state$.subscribe((state) => {
      console.log(`player ${player.id} state:`, state);
    });

    const playerFacingSubscription = player.facing$.subscribe((facing) => {
      const player = this._players.find((player) => player.id === player.id);
      if (!player) return;

      console.log(`player ${player.id} facing:`, facing);
      player.facing = facing;

      this.publishPlayers();
    });

    const playerPositionSubscription = player.position$.subscribe(
      (position) => {
        const playerPosition = this._playerPositions.find(
          (playerPosition) => playerPosition.id === player.id,
        );
        if (!playerPosition) return;

        console.log(`player ${player.id} position:`, position);
        playerPosition.x = position.x;
        playerPosition.y = position.y;

        this.publishPlayerPositions();
      },
    );

    this.on("disposed", () => {
      playerStateSubscription?.unsubscribe();
      playerFacingSubscription?.unsubscribe();
      playerPositionSubscription?.unsubscribe();
    });
  }

  private publishPlayers(): void {
    Server.server.publish(
      `session/${this._sessionID}`,
      JSON.stringify({
        type: "players",
        data: this._players,
      }),
    );
  }

  private publishPlayerPositions(): void {
    Server.server.publish(
      `session/${this._sessionID}`,
      JSON.stringify({
        type: "player_positions",
        data: this._playerPositions,
      }),
    );
  }

  public [Symbol.dispose](): void {
    this._map = undefined;
    this._players = [];
    this._playerPositions = [];
    this.emit("disposed");
  }
}
