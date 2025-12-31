import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';

const PROTO_PATH = path.join(__dirname, '../proto/package.proto');
const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
const GRPC_PORT = process.env.GRPC_PORT || '50051';

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const packageProto = protoDescriptor.packageapi;

// Package gRPC client
class PackageClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;
    
    log.info('Initializing Package gRPC client', { address });

    this.client = new packageProto.PackageService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async getCountryPackages(
    country: string,
    entityId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetCountryPackages(
        { country, entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC GetCountryPackages error', { country, entityId, error: error.message });
            reject(error);
          } else {
            resolve(response.packages);
          }
        }
      );
    });
  }

  close() {
    this.isConnected = false;
    log.info('Package gRPC client closed');
  }
}

// Export singleton instance
export const packageClient = new PackageClient();
export default PackageClient;
