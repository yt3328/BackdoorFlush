import { config } from "./config.js";
import { createApplication } from "./app.js";

const { server } = createApplication({ persistencePath: config.dataPath });

server.listen(config.port, () => {
  console.log(`Backdoor Flush running at http://localhost:${config.port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("\nBackdoor Flush stopped.");
    process.exit(0);
  });
});
