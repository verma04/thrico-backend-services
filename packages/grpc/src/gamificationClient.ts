import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { log } from "@thrico/logging";

const PROTO_PATH = path.join(__dirname, "../proto/gamification.proto");
const GRPC_HOST = process.env.GRPC_HOST || "localhost";
const GRPC_PORT = process.env.GRPC_PORT || "50051";

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const gamificationProto = protoDescriptor.gamification;

// Gamification gRPC client
class GamificationClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;

    log.info("Initializing Gamification gRPC client", { address });

    this.client = new gamificationProto.GamificationService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async getGamificationModules(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetGamificationModules(
        {},
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetGamificationModules error", {
              error: error.message,
            });
            reject(error);
          } else {
            resolve(response.modules);
          }
        }
      );
    });
  }

  async getModuleTriggers(moduleId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetModuleTriggers(
        { moduleId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetModuleTriggers error", {
              moduleId,
              error: error.message,
            });
            reject(error);
          } else {
            resolve(response.triggers);
          }
        }
      );
    });
  }

  async getEntityGamificationModules(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetEntityGamificationModules(
        { entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetEntityGamificationModules error", {
              entityId,
              error: error.message,
            });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  close() {
    this.isConnected = false;
    log.info("Gamification gRPC client closed");
  }
}

// Export singleton instance
export const gamificationClient = new GamificationClient();
export default GamificationClient;
