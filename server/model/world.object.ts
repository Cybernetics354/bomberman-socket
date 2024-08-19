import type { Observable } from "rxjs";
import type { Coordinate, Size } from "./geo";
import type { DisposableEventMap } from "./disposable";
import type GameSession from "./game.session";
import type World from "./world";
import type Clock from "./clock";
import type EventCenter from "./event.center";

import { EventEmitter } from "events";
import { v4 as uuidV4 } from "uuid";
import { BehaviorSubject, distinctUntilChanged } from "rxjs";
import { freeze } from "immer";

/**
 * The ID of a world object.
 */
export type WorldObjectID = string;

/**
 * The layer of a world object.
 */
export enum WorldObjectLayer {
  /** The underground layer. */
  UNDERGROUND = 0,
  /** The ground layer. */
  GROUND = 1,
  /** The overground layer. */
  OVERGROUND = 2,
}
/**
 * The count of the world object layers.
 */
export const WorldObjectLayerCount = 3;

/**
 * Properties of a world object that is placed.
 */
export interface WorldObjectInitProps {
  session?: GameSession;
  clock?: Clock;
  eventCenter?: EventCenter;
  world: World;
}

/**
 * Properties of a world object that is placed.
 */
export interface WorldObjectPlacedProps {
  position: Coordinate;
}

/**
 * Properties of a world object that is taken out.
 */
export interface WorldObjectTakeoutProps {}

/** The events of a world object. */
export interface WorldObjectEventMap extends DisposableEventMap {
  initialized: [];
  placed: [];
  displaced: [];
}

/**
 * A world object.
 */
export default abstract class WorldObject<
    TKind extends string = string,
    TInitProps extends WorldObjectInitProps = WorldObjectInitProps
  >
  extends EventEmitter<WorldObjectEventMap>
  implements Disposable
{
  /** The ID of the world object. */
  public readonly id: WorldObjectID;
  /** The kind of the world object. */
  public readonly kind: TKind;
  /** The layer of the world object. */
  public readonly layer: WorldObjectLayer;
  /** The observable of the position of the world object. */
  public readonly position$: Observable<Coordinate>;
  /** The observable of the size of the world object. */
  public readonly size$: Observable<Size>;

  /** The flag of the initialization of the world object. */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  /** The position of the world object. */
  public get position(): Coordinate {
    return freeze(this._positionSubject.getValue());
  }

  /** The size of the world object. */
  public get size(): Size {
    return freeze(this._sizeSubject.getValue());
  }

  /** The flag of the initialization of the world object. */
  protected _isInitialized = false;
  /** The game session that the world object belongs to. */
  protected _session: GameSession | undefined;
  /** The world that the world object belongs to. */
  protected _world: World | undefined;
  /** The clock that the world object belongs to. */
  protected _clock: Clock | undefined;
  /** The event center that the world object belongs to. */
  protected _eventCenter: EventCenter | undefined;
  /** The subject of the position of the world object. */
  protected _positionSubject: BehaviorSubject<Coordinate>;
  /** The subject of the size of the world object. */
  protected _sizeSubject: BehaviorSubject<Size>;

  /**
   * Creates a new world object.
   * @param name The name of the world object.
   * @param layer The layer of the world object.
   * @param position The position of the world object. If not provided, the position will be set to (0, 0).
   * @param size The size of the world object. If not provided, the size will be set to (1, 1).
   */
  protected constructor(
    name: TKind,
    layer: WorldObjectLayer,
    position?: Coordinate,
    size?: Size
  ) {
    super();

    this.id = `${name}/${uuidV4()}`;
    this.kind = name;
    this.layer = layer;

    this._positionSubject = new BehaviorSubject<Coordinate>(
      position || { x: 0, y: 0 }
    );
    this.position$ = this._positionSubject.pipe(distinctUntilChanged());

    this._sizeSubject = new BehaviorSubject<Size>(
      size || { width: 1, height: 1 }
    );
    this.size$ = this._sizeSubject.pipe(distinctUntilChanged());

    this.on("disposed", () => {
      this._positionSubject.complete();
      this._sizeSubject.complete();
    });
  }

  /**
   * A callback that is called when the world object is initialized.
   * @param props The properties of the world object that is initialized.
   */
  public init(props: TInitProps): void {
    if (this._isInitialized) return;
    this._isInitialized = true;

    this._session = props.session;
    this._clock = props.clock;
    this._eventCenter = props.eventCenter;
    this._world = props.world;
    this.emit("initialized");
  }

  /**
   * A callback that is called when the world object is placed.
   * @param props The properties of the world object that is placed.
   */
  public placed(props: WorldObjectPlacedProps): void {
    if (!this._isInitialized) {
      throw new Error(`object '${this.id}' is not initialized`);
    }

    this._positionSubject.next(props.position);
    this.emit("placed");
  }

  /**
   * A callback that is called when the world object is taken out.
   * @param props The properties of the world object that is taken out.
   */
  public takeout(_props: WorldObjectTakeoutProps): void {
    this.emit("displaced");
  }

  /**
   * Disposes the world object.
   */
  public [Symbol.dispose](): void {
    this.emit("disposed");
  }
}
