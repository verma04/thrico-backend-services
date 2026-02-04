import { GamificationQueryService } from "./packages/services/src/gamification/gamification-query.service";
import { log } from "./packages/logging/src";

async function verify() {
  console.log("Verifying getUserNextLevelProgress...");
  // This is just a structural verification since we don't have a live DB connection here easily
  const service = new GamificationQueryService({} as any);
  if (typeof service.getUserNextLevelProgress === "function") {
    console.log(
      "✅ getUserNextLevelProgress exists in GamificationQueryService",
    );
  } else {
    console.log(
      "❌ getUserNextLevelProgress NOT found in GamificationQueryService",
    );
  }
}

verify().catch(console.error);
