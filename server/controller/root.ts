import Path from "path";
import { Glob } from "bun";

import Server from "../app/server";

export default class RootController {
  private static _instace: RootController;

  private constructor() {
    const glob = new Glob("**/*");

    const baseDirectory = Path.join(__dirname, "../../client");
    for (const file of glob.scanSync(baseDirectory)) {
      Server.GET(`/${file}`, async () => {
        return new Response(Bun.file(Path.join(baseDirectory, file)));
      });
    }
  }

  public static init() {
    if (!this._instace) {
      this._instace = new RootController();
    }
  }
}
RootController.init();
