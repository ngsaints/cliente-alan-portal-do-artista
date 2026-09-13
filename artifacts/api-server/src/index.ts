import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });


import { initLogger } from "./lib/logger.js";
initLogger();

import app from "./app";
import { startReactivation } from './lib/reactivation';

const rawPort = process.env["PORT"] || (typeof (globalThis as any).Deno !== "undefined" ? "8000" : "3000");
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  startReactivation();
  console.log(`Server listening on port ${port}`);
});
