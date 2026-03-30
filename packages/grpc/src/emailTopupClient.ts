import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { log } from "@thrico/logging";

const PROTO_PATH = path.join(__dirname, "../proto/emailTopup.proto");
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
const emailTopupProto = protoDescriptor.emailtopup;

// EmailTopup gRPC client
class EmailTopupClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;

    log.info("Initializing EmailTopup gRPC client", { address });

    this.client = new emailTopupProto.EmailTopupService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async getEmailTopups(countryCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetEmailTopups(
        { countryCode },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetEmailTopups error", {
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

  async buyEmailTopup(data: {
    entityId: string;
    topupId: string;
    countryCode: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.BuyEmailTopup(
        data,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC BuyEmailTopup error", {
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

  async getEmailQuota(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetEmailQuota(
        { entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetEmailQuota error", {
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

  async deductEmailQuota(entityId: string, count: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.DeductEmailQuota(
        { entityId, count },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC DeductEmailQuota error", {
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

  async getEmailOverview(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetEmailOverview(
        { entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error("gRPC GetEmailOverview error", {
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
    log.info("EmailTopup gRPC client closed");
  }
}

// Export singleton instance
export const emailTopupClient = new EmailTopupClient();
export default EmailTopupClient;
