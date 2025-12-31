import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';

const PROTO_PATH = path.join(__dirname, '../proto/page.proto');
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
const pageProto = protoDescriptor.page;

// Page gRPC client
class PageClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;
    
    log.info('Initializing Page gRPC client', { address });

    this.client = new pageProto.PageService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async getAllPages(input: {
    value?: string;
    limit?: number;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetAllPages(input, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC GetAllPages error', { ...input, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async addPage(input: {
    name: string;
    logo: string;
    location: {
      name: string;
      latitude: number;
      longitude: number;
      address: string;
    };
    type: string;
    industry: string;
    website: string;
    pageType: string;
    size: string;
    tagline: string;
    url: string;
    agreement: boolean;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.AddPage(input, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC AddPage error', { name: input.name, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  close() {
    this.isConnected = false;
    log.info('Page gRPC client closed');
  }
}

// Export singleton instance
export const pageClient = new PageClient();
export default PageClient;
