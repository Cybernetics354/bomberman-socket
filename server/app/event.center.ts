import type { Observable } from "rxjs";
import type { DisposableEventMap } from "../model/disposable";
import type { IEvent } from "../model/event";
import type { WorldObjectID } from "./world.object";

import { EventEmitter } from "events";
import { Subject } from "rxjs";

import { EventType } from "../model/event";

interface EventCenterEventMap extends DisposableEventMap {}

/**
 * The event center class.
 */
export default class EventCenter
  extends EventEmitter<EventCenterEventMap>
  implements Disposable
{
  /** The event observable. */
  public readonly event$: Observable<IEvent>;

  /** The event subject. */
  private readonly _eventSubject = new Subject<IEvent>();

  /**
   * Creates a new event center.
   */
  public constructor() {
    super();

    this.event$ = this._eventSubject.asObservable();
  }

  /**
   * Emits an intersect event.
   * @param initiatorObjectID The initiator object ID.
   * @param objectIDs The intersected object IDs.
   */
  public objectIntersect(
    initiatorObjectID: WorldObjectID,
    ...objectIDs: Array<WorldObjectID>
  ): void {
    if (!objectIDs || objectIDs.length === 0) {
      return;
    }

    this._eventSubject.next({
      type: EventType.INTERSECT,
      payload: {
        initiatorObjectID,
        objectIDs,
      },
    });
  }

  /**
   * Emits a bomb placed event.
   * @param bombID The bomb ID.
   * @param ownerPlayerID The owner of the bomb.
   */
  public bombPlaced(bombID: WorldObjectID, ownerPlayerID: WorldObjectID): void {
    this._eventSubject.next({
      type: EventType.BOMB_PLACED,
      payload: {
        bombID,
        ownerPlayerID,
      },
    });
  }

  /**
   * Emits a bomb exploded event.
   * @param bombID The bomb ID.
   * @param ownerPlayerID The owner of the bomb.
   * @param affectedObjectIDs The affected object IDs.
   */
  public bombExploded(
    bombID: WorldObjectID,
    ownerPlayerID: WorldObjectID,
    affectedObjectIDs: Array<WorldObjectID>,
  ): void {
    this._eventSubject.next({
      type: EventType.BOMB_EXPLODED,
      payload: {
        bombID,
        ownerPlayerID,
        affectedObjectIDs,
      },
    });
  }

  /**
   * Disposes the event center.
   */
  public [Symbol.dispose](): void {
    this._eventSubject.complete();
    this.emit("disposed");
  }
}
