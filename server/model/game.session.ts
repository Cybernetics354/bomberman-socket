import type { DisposableEventMap } from "./disposable";
import type { WorldObjectID } from "./world.object";

import { EventEmitter } from "events";
import { faker } from "@faker-js/faker";

import Clock from "./clock";
import EventCenter from "./event.center";
import GameState from "./game.state";
import Player, { PlayerFacing } from "./object.player";
import World from "./world";

interface GameSessionEventMap extends DisposableEventMap {}

/**
 * The game session class.
 */
export default class GameSession
  extends EventEmitter<GameSessionEventMap>
  implements Disposable
{
  /** The session ID. */
  public readonly id: string;
  /** The clock. */
  public readonly clock: Clock;
  /** The event center. */
  public readonly eventCenter: EventCenter;

  /** The game state. */
  private _state: GameState;
  /** The world. */
  private _world: World;
  /** The players. */
  private _players: Map<WorldObjectID, Player> = new Map();

  /**
   * Creates a new game session.
   * @param world The world.
   */
  public constructor(id: string, world: World) {
    super();

    this.id = id;

    this.clock = new Clock();
    this.eventCenter = new EventCenter();

    this._state = new GameState(id);
    this._world = world;

    this.on("disposed", () => {
      this.clock[Symbol.dispose]();
      this.eventCenter[Symbol.dispose]();
      this._state[Symbol.dispose]();
      this._world[Symbol.dispose]();
    });
  }

  /**
   * Initializes the game session.
   */
  public init(): void {
    this._state.captureWorld(this._world);
    this._world.init(this);
  }

  public draftPlayer(): Player {
    const player = new Player({
      name: faker.person.fullName(),
      facing: PlayerFacing.RIGHT,
      position: {
        x: 0,
        y: 0,
      },
    });
    return player;
  }

  public addPlayer(player: Player): void {
    this._players.set(player.id, player);
    this._world.installObject(player);

    // TODO: temporary solution, ideally this should be random placement.
    this._world.placeObject(player.id);
    this._state.capturePlayer(player);
  }

  public getPlayer(playerID: WorldObjectID): Player | undefined {
    return this._players.get(playerID);
  }

  public removePlayer(playerID: WorldObjectID): void {
    this._players.delete(playerID);
    this._world.uninstallObject(playerID);
  }

  /**
   * Disposes the game session.
   */
  public [Symbol.dispose](): void {
    this.emit("disposed");
  }
}
