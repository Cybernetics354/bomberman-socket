import type { ServerWebSocket } from "bun";
import type { Observable } from "rxjs";
import type { Coordinate } from "../model/geo";
import type { IEventBase } from "../model/event";
import type {
  WorldObjectID,
  WorldObjectInitProps,
  WorldObjectPlacedProps,
} from "./world.object";

import { BehaviorSubject, distinctUntilChanged, Subject, throttle } from "rxjs";

import { Keycode, ZKeycode } from "@model/control";
import { EventType } from "../model/event";
import WorldObject, { WorldObjectLayer } from "./world.object";

/**
 * The player kind.
 */
export const PLAYER_KIND = "player" as const;

/**
 * The player facing direction.
 */
export enum PlayerFacing {
  /** The player is facing up. */
  UP = "U",
  /** The player is facing down. */
  DOWN = "D",
  /** The player is facing left. */
  LEFT = "L",
  /** The player is facing right. */
  RIGHT = "R",
}

/**
 * The player status.
 */
export enum PlayerStatus {
  /** The player is alive. */
  ALIVE = "alive",
  /** The player is dead. */
  DEAD = "dead",
}

/**
 * The player properties.
 */
export interface PlayerProps {
  name: string;
  facing: PlayerFacing;
  position: Coordinate;
  level?: number;
  bombLimit?: number;
}

/**
 * The player object class.
 */
export default class Player extends WorldObject<typeof PLAYER_KIND> {
  public readonly name: string;
  public readonly facing$: Observable<PlayerFacing>;
  public readonly level$: Observable<number>;
  public readonly bombLimit$: Observable<number>;
  public readonly killCount$: Observable<number>;
  public readonly state$: Observable<IEventBase<EventType.PLAYER>>;

  /** The player facing direction. */
  public get facing(): PlayerFacing {
    return this._facingSubject.getValue();
  }

  /** The player level. */
  public get level(): number {
    return this._levelSubject.getValue();
  }

  /** The player bomb limit. */
  public get bombLimit(): number {
    return this._bombLimitSubject.getValue();
  }

  /** The player kill count. */
  public get killCount(): number {
    return this._killCountSubject.getValue();
  }

  private _clients: Set<ServerWebSocket<any>> = new Set();
  private _keycodeSubject = new Subject<Keycode>();
  private _facingSubject: BehaviorSubject<PlayerFacing>;
  private _levelSubject: BehaviorSubject<number>;
  private _bombLimitSubject: BehaviorSubject<number>;
  private _killCountSubject: BehaviorSubject<number>;
  private _stateSubject = new Subject<IEventBase<EventType.PLAYER>>();

  /**
   * Creates a new player object.
   * @param props The properties of the player.
   */
  public constructor(props: PlayerProps) {
    super(PLAYER_KIND, WorldObjectLayer.GROUND, props.position);

    this.name = props.name;

    this._facingSubject = new BehaviorSubject<PlayerFacing>(props.facing);
    this.facing$ = this._facingSubject.pipe(distinctUntilChanged());

    this._levelSubject = new BehaviorSubject<number>(props.level || 1);
    this.level$ = this._levelSubject.pipe(distinctUntilChanged());

    this._bombLimitSubject = new BehaviorSubject<number>(props.bombLimit || 1);
    this.bombLimit$ = this._bombLimitSubject.pipe(distinctUntilChanged());

    this._killCountSubject = new BehaviorSubject<number>(0);
    this.killCount$ = this._killCountSubject.pipe(distinctUntilChanged());

    this.state$ = this.buildStateObservable();

    this.on("disposed", () => {
      this._clients.forEach((ws) => ws.close());
      this._clients.clear();

      this._keycodeSubject.complete();
      this._facingSubject.complete();
      this._levelSubject.complete();
      this._bombLimitSubject.complete();
      this._killCountSubject.complete();
      this._stateSubject.complete();
    });
  }

  public init(props: WorldObjectInitProps): void {
    if (!props.session || !props.clock || !props.eventCenter || !props.world) {
      throw new Error("Invalid init properties");
    }

    super.init(props);

    this._clients.forEach((ws) => this.initClient(ws));
  }

  public registerClient(ws: ServerWebSocket<any>): void {
    this._clients.add(ws);

    if (this._isInitialized) this.initClient(ws);
  }

  public unregisterClient(ws: ServerWebSocket<any>): void {
    this._clients.delete(ws);
  }

  public feed(payload: string): boolean {
    // ignore feed if the player is not in a world yet.
    if (!this._world) return false;

    const keycodeResult = ZKeycode.safeParse(payload);
    if (!keycodeResult.success) {
      return false;
    }

    this._keycodeSubject.next(keycodeResult.data);
    return true;
  }

  public placed(props: WorldObjectPlacedProps): void {
    super.placed(props);

    if (!this._eventCenter || !this._clock) return;

    const eventSubscription = this._eventCenter?.event$.subscribe((event) => {
      switch (event.type) {
        case EventType.BOMB_EXPLODED: {
          const { ownerPlayerID, affectedObjectIDs } = event.payload;
          this.bombExploded(ownerPlayerID === this.id, affectedObjectIDs);
          break;
        }
      }
    });

    const keycodeSubscription = this._keycodeSubject
      .pipe(throttle(() => this._clock!.interval(100)))
      .subscribe((keycode) => {
        console.log("player keycode:", keycode);
        switch (keycode) {
          case Keycode.KEY_UP: {
            this.move(PlayerFacing.UP);
            break;
          }
          case Keycode.KEY_DOWN: {
            this.move(PlayerFacing.DOWN);
            break;
          }
          case Keycode.KEY_LEFT: {
            this.move(PlayerFacing.LEFT);
            break;
          }
          case Keycode.KEY_RIGHT: {
            this.move(PlayerFacing.RIGHT);
            break;
          }
          default:
            return;
        }
      });

    this.on("displaced", () => {
      eventSubscription?.unsubscribe();
      keycodeSubscription?.unsubscribe();
    });
  }

  private initClient(client: ServerWebSocket<any>): void {
    const sessionTopic = `session/${this._session!.id}`;
    if (!client.isSubscribed(sessionTopic)) {
      client.subscribe(sessionTopic);
    }

    const playerTopic = `player/${this.id}`;
    if (!client.isSubscribed(playerTopic)) {
      client.subscribe(playerTopic);
    }
  }

  private buildStateObservable() {
    const facingSubscription = this.facing$.subscribe((facing) => {
      this._stateSubject.next({
        type: EventType.PLAYER,
        payload: {
          playerID: this.id,
          state: { facing },
        },
      });
    });
    const levelSubscription = this.level$.subscribe((level) => {
      this._stateSubject.next({
        type: EventType.PLAYER,
        payload: {
          playerID: this.id,
          state: { level },
        },
      });
    });
    const positionSubscription = this.position$.subscribe((position) => {
      this._stateSubject.next({
        type: EventType.PLAYER,
        payload: {
          playerID: this.id,
          state: { position: [position.x, position.y] },
        },
      });
    });
    const bombLimitSubscription = this.bombLimit$.subscribe((bombLimit) => {
      this._stateSubject.next({
        type: EventType.PLAYER,
        payload: {
          playerID: this.id,
          state: { bombLimit },
        },
      });
    });
    const killCountSubscription = this.killCount$.subscribe((killCount) => {
      this._stateSubject.next({
        type: EventType.PLAYER,
        payload: {
          playerID: this.id,
          state: { killCount },
        },
      });
    });

    this.on("disposed", () => {
      facingSubscription?.unsubscribe();
      levelSubscription?.unsubscribe();
      positionSubscription?.unsubscribe();
      bombLimitSubscription?.unsubscribe();
      killCountSubscription?.unsubscribe();
    });

    // TODO: the idea is really good but, I think this is too complicated for now.
    //       it will buffer the events and then send them to the client so, the event payload will more compact.
    // return this._stateSubject.pipe(
    //   buffer(interval(1000)),
    //   filter((events) => events.length > 0),
    //   map((events) => {
    //     console.log("player events:", events);
    //     let payload: IEventBase<EventType.PLAYER>["payload"] = {
    //       playerID: this.id,
    //       state: {},
    //     };
    //     for (const event of events) {
    //       if (event.type !== EventType.PLAYER) continue;

    //       // if the player is removed from the game, then immediately return.
    //       if (event.payload === undefined) {
    //         payload.state = undefined;
    //         break;
    //       }

    //       const { state: eventState } = event.payload;
    //       if (!eventState) continue;

    //       if (payload.state === undefined) {
    //         payload.state = {};
    //       }

    //       if (eventState.facing !== undefined)
    //         payload.state.facing = eventState.facing;
    //       if (eventState.position !== undefined)
    //         payload.state.position = eventState.position;
    //       if (eventState.level !== undefined)
    //         payload.state.level = eventState.level;
    //       if (eventState.bombLimit !== undefined)
    //         payload.state.bombLimit = eventState.bombLimit;
    //       if (eventState.killCount !== undefined)
    //         payload.state.killCount = eventState.killCount;
    //     }

    //     return {
    //       type: EventType.PLAYER,
    //       payload,
    //     };
    //   })
    // );
    return this._stateSubject.asObservable();
  }

  private bombExploded(
    isOwner: boolean,
    affectedObjectIDs: Array<WorldObjectID>,
  ): void {
    // if the player is the owner of the bomb, then increment the kill count.
    if (isOwner) {
      const killCount = affectedObjectIDs.reduce((total, objectID) => {
        if (isPlayerObjectID(objectID)) {
          total += 1;
        }

        return total;
      }, 0);
      this._killCountSubject.next(this.killCount + killCount);
      return;
    }

    if (affectedObjectIDs.some((objectID) => objectID === this.id)) {
      // TODO: player died.
    }
  }

  private move(facing: PlayerFacing): void {
    if (!this._world) return;

    // only update the facing if the direction has changed.
    if (this._facingSubject.getValue() !== facing) {
      this._facingSubject.next(facing);
      return;
    }

    const destinationPosition = {
      x: this.position.x,
      y: this.position.y,
    };

    const MOVEMENT_SPEED = 1;
    switch (facing) {
      case PlayerFacing.UP: {
        destinationPosition.y -= MOVEMENT_SPEED;
        break;
      }
      case PlayerFacing.DOWN: {
        destinationPosition.y += MOVEMENT_SPEED;
        break;
      }
      case PlayerFacing.LEFT: {
        destinationPosition.x -= MOVEMENT_SPEED;
        break;
      }
      case PlayerFacing.RIGHT: {
        destinationPosition.x += MOVEMENT_SPEED;
        break;
      }
    }

    try {
      const newPosition = this._world.moveObject(this.id, destinationPosition);
      if (!newPosition) return;

      this._positionSubject.next(newPosition);
    } catch (e) {
      console.error(`failed to move player '${this.id}'`, e);
    }
  }
}

/**
 * Returns true if the object ID is a player object ID.
 * @param objectID The object ID to check.
 * @returns The result of the check.
 */
export function isPlayerObjectID(objectID: WorldObjectID): boolean {
  return objectID.startsWith(`${PLAYER_KIND}/`);
}
