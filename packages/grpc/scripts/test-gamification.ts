import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

// 1. Define paths and options
// Adjusted path to point to the correct location of proto files in this repo
const PROTO_PATH = path.join(__dirname, "../proto/gamification.proto");

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// 2. Load the proto definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const gamificationProto = grpc.loadPackageDefinition(packageDefinition) as any;

// 3. Create the client
// Adjust the address if your server runs on a different host/port
const client = new gamificationProto.gamification.GamificationService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

/**
 * Helper to promisify the gRPC call
 */
const getEntityGamificationModules = (entityId: string) => {
  return new Promise((resolve, reject) => {
    client.GetEntityGamificationModules(
      { entityId },
      (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
};

// 4. Run the consumer
async function main() {
  const testEntityId = "test-entity-id"; // Replace with a valid entity ID from your DB
  console.log(`Connecting to gRPC server at localhost:50051...`);
  console.log(`Fetching gamification modules for entity: ${testEntityId}`);

  try {
    const response: any = await getEntityGamificationModules(testEntityId);
    console.log("\nSuccess! Received Response:");
    console.log(JSON.stringify(response, null, 2));

    if (response.modules && response.modules.length > 0) {
      console.log(
        `\nEnabled Modules: ${response.modules
          .map((m: any) => m.name)
          .join(", ")}`
      );
    } else {
      console.log(
        "\nNo modules enabled for this entity (or entity not found)."
      );
    }
  } catch (err) {
    console.error("Error calling GetEntityGamificationModules:", err);
  }
}

main();
