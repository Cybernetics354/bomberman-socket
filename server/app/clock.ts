import type { SchedulerLike } from "rxjs";
import type { DisposableEventMap } from "../model/disposable";

import { EventEmitter } from "events";
import { asyncScheduler, Observable } from "rxjs";

/**
 * The event map of the clock.
 */
interface ClockEventMap extends DisposableEventMap {}

/**
 * The clock class.
 */
export default class Clock
  extends EventEmitter<ClockEventMap>
  implements Disposable
{
  /** The flag indicating whether the clock is disposed. */
  private _isDisposed = false;
  /** The clock scheduler. */
  private _scheduler: SchedulerLike = asyncScheduler;

  /**
   * Creates a new clock.
   */
  public constructor() {
    super();
  }

  /**
   * Creates an interval observable.
   * @param delayMS The delay in milliseconds.
   * @returns The interval observable.
   */
  public interval(delayMS: number): Observable<any> {
    return new Observable((subscriber) => {
      if (this._isDisposed) return;
      return this._scheduler.schedule(function () {
        if (subscriber.closed) return;
        subscriber.next(null);

        console.log("interval", delayMS);

        this.schedule(null, delayMS);
      }, delayMS);
    });
  }

  /**
   * Disposes the clock.
   */
  public [Symbol.dispose](): void {
    this.emit("disposed");
  }
}
