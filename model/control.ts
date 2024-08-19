import z from "zod";

export enum Keycode {
  KEY_UP = 38,
  KEY_DOWN = 40,
  KEY_LEFT = 37,
  KEY_RIGHT = 39,
  SPACE = 32,
  ENTER = 13,
  ESCAPE = 27,
  SHIFT = 16,
  CTRL = 17,
  ALT = 18,
  TAB = 9,
  BACKSPACE = 8,
  DELETE = 46,
  INSERT = 45,
}

const ZKeycodeRaw = z.nativeEnum(Keycode);
export const ZKeycode = z.coerce.number().transform((value, ctx) => {
  const result = ZKeycodeRaw.safeParse(value);
  if (result.success) {
    return result.data;
  }
  result.error.issues.forEach((issue) => ctx.addIssue(issue));
  return z.NEVER;
});
