import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultDataPath = join(rootDir, "data", "poker-felt-scope.json");

mkdirSync(dirname(defaultDataPath), { recursive: true });

export const config = {
  port: Number.parseInt(process.env.FELTSCOPE_PORT ?? "3400", 10),
  dataPath: process.env.FELTSCOPE_DATA_PATH ?? defaultDataPath
};
