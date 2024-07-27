import type { IWebSocketData } from "./lib/interfaces/websocket_data";
import { v4 as uuidv4 } from "uuid";
import SessionController from "./lib/server/session_controller";
import { BehaviorSubject } from "rxjs";

const SESSION_ID = "session_1";

const SESSIONS = new BehaviorSubject<Map<string, SessionController>>(new Map());

const server = Bun.serve<IWebSocketData>({
  fetch: (req, server) => {
    const uuid = uuidv4();
    const success = server.upgrade(req, {
      data: { id: uuid, session_id: SESSION_ID },
    });
    if (success) return;

    return new Response("Hello");
  },
  port: 3333,
  websocket: {
    open: async (ws) => {
      const message = `Connect >> ${ws.data.id}`;
      if (!SESSIONS.getValue().has(ws.data.session_id)) {
        const controller = new SessionController(ws.data.session_id);
        controller.init();

        SESSIONS.next(SESSIONS.getValue().set(ws.data.session_id, controller));
      }

      const session = SESSIONS.getValue().get(ws.data.session_id);
      if (session) {
        session.addNewPlayer(ws.data.id);
      }

      console.log(message);

      ws.subscribe(ws.data.session_id);
      ws.send(
        JSON.stringify({
          your_id: ws.data.id,
          state: session!.getLatestSstate(),
        }),
      );
    },
    close: async (ws) => {
      const message = `Disconnect >> ${ws.data.id}`;
      console.log(message);

      const session = SESSIONS.getValue().get(ws.data.session_id);
      if (session) {
        session.removePlayer(ws.data.id);
      }

      ws.unsubscribe(ws.data.session_id);
    },
    message: async (ws, message) => {
      const session = SESSIONS.getValue().get(ws.data.session_id);
      if (session) {
        session.doPlayerAction(ws.data.id, parseInt(message as string));
      }
    },
  },
});

export { server };
