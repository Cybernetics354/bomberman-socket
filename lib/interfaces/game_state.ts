import type { IBomb } from "./bomb";
import type { IExplosion } from "./explosion";
import type { IMap } from "./map";
import type { IObject } from "./object";
import type { IPlayer } from "./player";
import type { IPosition } from "./position";

interface IGameState {
  map: IMap;
  players: IPlayer[];
  player_positions: IPosition[];
  bombs: IBomb[];
  bomb_positions: IPosition[];
  objects: IObject[];
  object_positions: IPosition[];
  explosions: IExplosion[];
  explosion_positions: IPosition[];
}

export type { IGameState };
