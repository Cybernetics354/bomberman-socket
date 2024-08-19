import Bun from "bun";
import { addRoute, createRouter, findRoute } from "rou3";
import type { IWebSocketContext } from "../model/websocket";

/**
 * The default port of the server.
 */
export const DEFAULT_SERVER_PORT = 3333;

/**
 * The method of the route.
 */
enum RouteMethod {
  /** The GET method. */
  GET = "GET",
  /** The POST method. */
  POST = "POST",
  /** The PUT method. */
  PUT = "PUT",
  /** The DELETE method. */
  DELETE = "DELETE",
  /** The WEBSOCKET method. */
  WEBSOCKET = "WEBSOCKET",
}

/**
 * The handler's parameter of the route.
 */
export interface IRouteHandlerParameter<
  TParameter extends Record<string, unknown> = {}
> {
  /** The server of the route. */
  server: Bun.Server;
  /** The request of the route. */
  request: Request;
  /** Upgrade the connection to websocket. */
  upgrade: (
    /** The request of the upgrade. */
    request: Request,
    /** The upgrade options. */
    options?: {
      /** The response headers during the upgrade. */
      headers?: globalThis.Bun.HeadersInit;
      /** The data to be an context during the upgrade. */
      context: IWebSocketContext;
    }
  ) => boolean;
  /** The parameter of the route. */
  parameter: TParameter;
}

/**
 * The handler of the socket.
 */
interface IRouteContext<TParameter extends Record<string, unknown> = {}> {
  /** The type of the route. */
  type: "fetch";
  /**
   * The handler of the route.
   * @param pars The parameters of the route.
   * @returns The response of the route.
   */
  handler: (pars: IRouteHandlerParameter<TParameter>) => Promise<Response>;
}

/**
 * The event of the web socket.
 */
type IRouteWebSocketEvent =
  | {
      type: "open" | "close";
    }
  | {
      type: "message";
      payload: Buffer;
    };

/**
 * The handler's parameter of the web socket.
 */
export type IRouteWebSocketParameter<
  TContext extends IWebSocketContext = IWebSocketContext
> = IRouteWebSocketEvent & {
  /** The websocket of the socket. */
  ws: Bun.ServerWebSocket<TContext>;
};

/**
 * The handler of the websocket.
 */
interface IRouteWebSocketContext<
  TContext extends IWebSocketContext = IWebSocketContext
> {
  /** The type of the route. */
  type: "websocket";
  /**
   * The handler of the socket.
   * @param pars The parameters of the socket.
   */
  handler: (pars: IRouteWebSocketParameter<TContext>) => void;
}

/**
 * The server of the game.
 */
export default class Server {
  /** The server of the game. */
  private static _server?: Bun.Server;
  /** The router of the game. */
  private static _router = createRouter<
    IRouteContext<any> | IRouteWebSocketContext<any>
  >();

  /**
   * Get the server of the game.
   * @returns The server of the game.
   */
  public static get server(): Bun.Server {
    if (!this._server) {
      throw new Error("Server is not running");
    }
    return this._server;
  }

  /**
   * The class cannot be instantiated.
   */
  private constructor() {}

  /**
   * Start the server.
   * @param port The port of the server.
   */
  public static start(port: number = DEFAULT_SERVER_PORT) {
    if (this._server) {
      throw new Error("Server is already running");
    }

    this._server = Bun.serve<IWebSocketContext>({
      port,
      fetch: async (request, server) => {
        const route = findRoute(
          Server._router,
          request.method,
          new URL(request.url).pathname
        );
        if (!route || !route.data || route.data.type !== "fetch") {
          return new Response("Not Found", { status: 404 });
        }

        return await route.data.handler({
          server,
          request,
          parameter: route.params ?? {},
          upgrade: (request, options) =>
            server.upgrade(request, {
              headers: options?.headers,
              data: options?.context,
            }),
        });
      },
      websocket: {
        open: (ws) => {
          const route = findRoute(
            Server._router,
            RouteMethod.WEBSOCKET,
            ws.data.type
          );
          if (!route || !route.data || route.data.type !== "websocket") {
            return;
          }

          route.data.handler({ ws, type: "open" });
        },
        close: (ws) => {
          const route = findRoute(
            Server._router,
            RouteMethod.WEBSOCKET,
            ws.data.type
          );
          if (!route || !route.data || route.data.type !== "websocket") {
            return;
          }

          route.data.handler({ ws, type: "close" });
        },
        message: (ws, message) => {
          const route = findRoute(
            Server._router,
            RouteMethod.WEBSOCKET,
            ws.data.type
          );
          if (!route || !route.data || route.data.type !== "websocket") {
            return;
          }

          route.data.handler({
            ws,
            type: "message",
            payload: Buffer.from(message),
          });
        },
      },
    });
  }

  /**
   * Stop the server.
   */
  public static stop() {
    this._server?.stop();
    this._server = undefined;
  }

  /**
   * Register a GET route.
   * @param path The path of the route.
   * @param handler The handler of the route.
   */
  public static GET<TParameter extends Record<string, unknown>>(
    path: string,
    handler: IRouteContext<TParameter>["handler"]
  ) {
    addRoute(this._router, RouteMethod.GET, path, {
      type: "fetch",
      handler,
    });
  }

  /**
   * Register a POST route.
   * @param path The path of the route.
   * @param handler The handler of the route.
   */
  public static POST<TParameter extends Record<string, unknown>>(
    path: string,
    handler: IRouteContext<TParameter>["handler"]
  ) {
    addRoute(this._router, RouteMethod.POST, path, {
      type: "fetch",
      handler,
    });
  }

  /**
   * Register a PATCH route.
   * @param path The path of the route.
   * @param handler The handler of the route.
   */
  public static PUT<TParameter extends Record<string, unknown>>(
    path: string,
    handler: IRouteContext<TParameter>["handler"]
  ) {
    addRoute(this._router, RouteMethod.PUT, path, {
      type: "fetch",
      handler,
    });
  }

  /**
   * Register a DELETE route.
   * @param path The path of the route.
   * @param handler The handler of the route.
   */
  public static DELETE<TParameter extends Record<string, unknown> = {}>(
    path: string,
    handler: IRouteContext<TParameter>["handler"]
  ) {
    addRoute(this._router, RouteMethod.DELETE, path, {
      type: "fetch",
      handler,
    });
  }

  /**
   * Register a WEBSOCKET route.
   * @param type The type of the socket.
   * @param handler The handler of the socket.
   */
  public static WEBSOCKET<
    TContext extends IWebSocketContext = IWebSocketContext
  >(
    type: TContext["type"],
    handler: IRouteWebSocketContext<TContext>["handler"]
  ) {
    addRoute(this._router, RouteMethod.WEBSOCKET, type, {
      type: "websocket",
      handler,
    });
  }
}
