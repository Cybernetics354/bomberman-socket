enum ObjectType {
  wall = 0,
  brick = 1,
  steel = 2,
}

enum ObjectBehavior {
  passable = 0,
  destroyable = 1,
  unpassable = 2,
}

interface IObject {
  id: string;
  type: ObjectType;
  behavior: ObjectBehavior;
}

export type { IObject };
export { ObjectType, ObjectBehavior };
