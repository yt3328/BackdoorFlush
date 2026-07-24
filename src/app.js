import { createHttpServer } from "./http/apiServer.js";
import { HandStore } from "./storage/handStore.js";

export function createApplication(options = {}) {
  const store = new HandStore({
    persistencePath: options.persistencePath
  });

  const server = createHttpServer({ store });

  return {
    server,
    store
  };
}

