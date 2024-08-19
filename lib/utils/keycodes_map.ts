enum KeycodesMap {
  keyup = 38,
  keydown = 40,
  keyleft = 37,
  keyright = 39,
  space = 32,
  enter = 13,
  escape = 27,
  shift = 16,
  ctrl = 17,
  alt = 18,
  tab = 9,
  backspace = 8,
  delete = 46,
  insert = 45,
}

const MOVEMENT_KEYCODES = [
  KeycodesMap.keyup,
  KeycodesMap.keydown,
  KeycodesMap.keyleft,
  KeycodesMap.keyright,
] as const;

type IMovementKeycodes = (typeof MOVEMENT_KEYCODES)[number];

export type { IMovementKeycodes };
export { MOVEMENT_KEYCODES };

export default KeycodesMap;
