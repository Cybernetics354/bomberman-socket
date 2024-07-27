// For character direction
enum CharacterFacing {
  up = 0,
  right = 1,
  down = 2,
  left = 3,
}

enum CharacterState {
  dead = -1,
  idle = 0,
  walking = 1,
  running = 2,
  jumping = 3,
  taunting = 4,
}

enum CharacterSpriteType {
  default = 0,
}

interface IPlayer {
  id: string;
  name: string;
  sprite_type: CharacterSpriteType;
  facing: CharacterFacing;
  state: CharacterState;
  // for level of the bomb it will produce
  level: number;
  kill_count: number;
}

export { CharacterFacing, CharacterSpriteType, CharacterState };
export type { IPlayer };
