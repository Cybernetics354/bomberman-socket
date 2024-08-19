import type { Coordinate } from "../model/geo";

import { test, describe, expect } from "bun:test";

import World, { ErrorOverlappingObject } from "./world";
import Brick from "./object.brick";
import { WorldObjectLayer } from "./world.object";

describe("World.placeObject()", () => {
  const world = new World({
    id: "test",
    width: 10,
    height: 10,
  });
  world.init();

  const position = { x: 0, y: 0 };
  const brick = new Brick({
    position,
  });
  test("normal placement", () => {
    world.installObject(brick);
    const placedPosition = world.placeObject(brick.id);
    expect(placedPosition).toEqual(position);
  });

  test("overlapping placement", () => {
    let placedPosition: Coordinate | undefined;
    const brick2 = new Brick({ position });
    world.installObject(brick2);
    try {
      placedPosition = world.placeObject(brick2.id);
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorOverlappingObject);
      expect((e as ErrorOverlappingObject).objectID).toEqual(brick2.id);
      expect((e as ErrorOverlappingObject).existingObjectID).toEqual(brick.id);
    }
    expect(placedPosition).toBeUndefined();
  });
});

// describe("World.lookup()", () => {
//   const brick = new Brick({
//     position: { x: 0, y: 0 },
//   });
//   const world = new World({
//     id: "test",
//     width: 10,
//     height: 10,
//     objects: [brick],
//   });

//   test("single lookup", () => {
//     const result = world.lookup({ x: 0, y: 0 });
//     expect(result.length).toEqual(1);
//     expect(result[0]).toEqual([null, brick.id, null]);
//   });

//   test("multiple lookup", () => {
//     const result = world.lookup({ x: 0, y: 0 }, { x: 1, y: 1 });
//     expect(result.length).toEqual(2);
//     expect(result[0]).toEqual([null, brick.id, null]);
//     expect(result[1]).toEqual(null);
//   });
// });

describe("World.lookupByLayer()", () => {
  const brick = new Brick({
    position: { x: 0, y: 0 },
  });

  const world = new World({
    id: "test",
    width: 10,
    height: 10,
    objects: [brick],
  });
  world.init();

  test("single lookup", () => {
    const result = world.lookupByLayer(brick.layer, { x: 0, y: 0 });
    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(brick.id);
  });

  test("multiple lookup", () => {
    const result = world.lookupByLayer(
      brick.layer,
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    );
    expect(result.length).toEqual(2);
    expect(result[0]).toEqual(brick.id);
    expect(result[1]).toEqual(null);
  });
});

describe("World.takeoutObject()", () => {
  const world = new World({
    id: "test",
    width: 10,
    height: 10,
  });
  world.init();

  test("normal takeout", () => {
    const position = { x: 0, y: 0 };
    const brick = new Brick({
      position,
    });
    world.installObject(brick);
    world.placeObject(brick.id);

    const result = world.displaceObject(brick.id);
    expect(result).toBeTruthy();

    const [lookupResult] = world.lookupByLayer(brick.layer, position);
    expect(lookupResult).toEqual(null);
  });

  test("non-existent takeout", () => {
    const result = world.displaceObject("non-existent");
    expect(result).toBeFalsy();
  });
});

describe("World.moveObject()", () => {
  const world = new World({
    id: "test",
    width: 10,
    height: 10,
  });
  world.init();

  test("normal move", () => {
    const position = { x: 0, y: 0 };
    const brick = new Brick({
      position,
    });
    world.installObject(brick);
    world.placeObject(brick.id);

    const destinationPosition = { x: 1, y: 1 };
    const newPosition = world.moveObject(brick.id, destinationPosition);
    expect(newPosition).toEqual(destinationPosition);

    const [lookupResult] = world.lookupByLayer(brick.layer, position);
    expect(lookupResult).toEqual(null);

    const [lookupResult2] = world.lookupByLayer(
      brick.layer,
      destinationPosition,
    );
    expect(lookupResult2).toEqual(brick.id);
  });

  test("non-existent move", () => {
    const position = { x: 2, y: 2 };
    const result = world.moveObject("non-existent", position);
    expect(result).toBeFalsy();

    const [lookupResult] = world.lookupByLayer(
      WorldObjectLayer.GROUND,
      position,
    );
    expect(lookupResult).toEqual(null);
  });
});
