import * as models from "../models/index.js";
import runSeed from "./runSeed.js";

(async () => {
  try {
    console.log("Invoking JS seeder...");
    await runSeed(models);
    console.log("Seeder finished OK");
    process.exit(0);
  } catch (err) {
    console.error("Seeder failed:", err);
    process.exit(1);
  }
})();