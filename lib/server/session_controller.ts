import { BehaviorSubject, distinct, distinctUntilChanged, map } from "rxjs";
import { freeze, produce } from "immer";
import type { IGameState } from "../interfaces/game_state";
import { MAP_1 } from "../templates/maps";
import KeycodesMap, {
  MOVEMENT_KEYCODES,
  type IMovementKeycodes,
} from "../utils/keycodes_map";
import {
  CharacterFacing,
  CharacterSpriteType,
  CharacterState,
  type IPlayer,
} from "../interfaces/player";
import { server } from "../..";

const MAPPED_MOVEMENT_AND_FACING: Record<IMovementKeycodes, CharacterFacing> = {
  [KeycodesMap.keyup]: CharacterFacing.up,
  [KeycodesMap.keydown]: CharacterFacing.down,
  [KeycodesMap.keyleft]: CharacterFacing.left,
  [KeycodesMap.keyright]: CharacterFacing.right,
};

class SessionController {
  private sessionID: string;

  constructor(sessionID: string) {
    this.sessionID = sessionID;
  }

  private sessionSubject = new BehaviorSubject<IGameState>(
    freeze(
      {
        map: MAP_1,
        players: [],
        player_positions: [],
        bombs: [],
        bomb_positions: [],
        objects: [],
        object_positions: [],
        explosions: [],
        explosion_positions: [],
      },
      true,
    ),
  );

  // getter to get latest value from subject
  _getState = (): IGameState => this.sessionSubject.value;

  getLatestSstate = () => this._getState();

  updateState = (newState: IGameState) => {
    this.sessionSubject.next(newState);
  };

  addNewPlayer = (id: string): string => {
    const _state = this._getState();
    const _newPlayer: IPlayer = {
      id: id,
      name: `Player ${_state.players.length + 1}`,
      sprite_type: CharacterSpriteType.default,
      facing: CharacterFacing.down,
      level: 1,
      state: CharacterState.idle,
      kill_count: 0,
    };

    this.updateState(
      produce(_state, (draft) => {
        draft.players.push(_newPlayer);
        draft.player_positions.push({ id: _newPlayer.id, x: 0, y: 0 });
      }),
    );

    return id;
  };

  removePlayer = (id: string) => {
    const _state = this._getState();
    const _playerIndex = _state.players.findIndex((player) => player.id === id);
    const _playerPositionIndex = _state.player_positions.findIndex(
      (position) => position.id === id,
    );

    if (_playerIndex < 0 || _playerPositionIndex < 0) return;

    this.updateState(
      produce(_state, (draft) => {
        draft.players.splice(_playerIndex, 1);
        draft.player_positions.splice(_playerPositionIndex, 1);
      }),
    );
  };

  movePlayer = (playerID: string, action: IMovementKeycodes) => {
    const _state = this._getState();
    const _playerPositionIndex = _state.player_positions.findIndex(
      (position) => position.id === playerID,
    );

    if (_playerPositionIndex < 0) return;

    const _player = _state.players.find((player) => player.id === playerID);
    if (!_player) return;

    if (_player.facing !== MAPPED_MOVEMENT_AND_FACING[action]) {
      this.updateState(
        produce(_state, (draft) => {
          const _player = draft.players.find(
            (player) => player.id === playerID,
          );
          if (_player) _player.facing = MAPPED_MOVEMENT_AND_FACING[action];
        }),
      );

      return;
    }

    this.updateState(
      produce(_state, (draft) => {
        const _playerPosition = draft.player_positions[_playerPositionIndex];
        draft.player_positions[_playerPositionIndex] = produce(
          _playerPosition,
          (position) => {
            switch (action) {
              case KeycodesMap.keyup:
                if (position.y > 0) position.y -= 1;
                break;
              case KeycodesMap.keydown:
                if (position.y < draft.map.height) position.y += 1;
                break;
              case KeycodesMap.keyleft:
                if (position.x > 0) position.x -= 1;
                break;
              case KeycodesMap.keyright:
                if (position.x < draft.map.width) position.x += 1;
                break;
              default:
                break;
            }
          },
        );
      }),
    );
  };

  doPlayerAction = (playerID: string, action: KeycodesMap) => {
    const _state = this._getState();
    const _playerIndex = _state.players.findIndex(
      (player) => player.id === playerID,
    );

    if (_playerIndex < 0) return;

    if (MOVEMENT_KEYCODES.includes(action)) {
      this.movePlayer(playerID, action);
    }
  };

  init = () => {
    this.sessionSubject
      .pipe(
        map((state) => state.players),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((players) => {
        console.log("players", players);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "players", data: players }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.player_positions),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((positions) => {
        console.log("player_positions", positions);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "player_positions", data: positions }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.bombs),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((bombs) => {
        console.log("bombs", bombs);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "bombs", data: bombs }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.bomb_positions),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((positions) => {
        console.log("bomb_positions", positions);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "bomb_positions", data: positions }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.objects),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((objects) => {
        console.log("objects", objects);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "objects", data: objects }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.object_positions),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((positions) => {
        console.log("object_positions", positions);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "object_positions", data: positions }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.explosions),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((explosions) => {
        console.log("explosions", explosions);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "explosions", data: explosions }),
        );
      });

    this.sessionSubject
      .pipe(
        map((state) => state.explosion_positions),
        distinctUntilChanged(
          (prev, now) => JSON.stringify(prev) === JSON.stringify(now),
        ),
      )
      .subscribe((positions) => {
        console.log("explosion_positions", positions);
        server.publish(
          this.sessionID,
          JSON.stringify({ type: "explosion_positions", data: positions }),
        );
      });
  };

  endSession = () => {
    this.sessionSubject.complete();
  };
}

export default SessionController;
