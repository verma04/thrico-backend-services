import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { log } from "@thrico/logging";

const PROTO_PATH = path.join(__dirname, "../proto/addon.proto");
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
const addonProto = protoDescriptor.addon;

// Addon gRPC client
class AddonClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;

    log.info("Initializing Addon gRPC client", { address });

    this.client = new addonProto.AddonService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async getAddonPricing(countryCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetAddonPricing(
        { countryCode },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetAddonPricing error", {
              countryCode,
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

  async addAddon(data: {
    entityId: string;
    addonPricingId: string;
    countryCode: string;
    quantity: number;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.AddAddon(
        data,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC AddAddon error", {
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

  async removeAddon(entityId: string, addonId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.RemoveAddon(
        { entityId, addonId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC RemoveAddon error", {
              entityId,
              addonId,
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
    log.info("Addon gRPC client closed");
  }
}

// Export singleton instance
export const addonClient = new AddonClient();
export default AddonClient;
