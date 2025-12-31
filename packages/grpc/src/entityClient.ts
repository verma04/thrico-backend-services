import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';

const PROTO_PATH = path.join(__dirname, '../proto/entity.proto');
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
const entityProto = protoDescriptor.entity;

// Entity gRPC client
class EntityClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;
    
    

    this.client = new entityProto.EntityService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async registerEntity(entity: {
    domain: string;
    address: string;
    name: string;
    entityType: string;
    industryType: string;
    country: string;
    logo: string;
    website: string;
    designation: string;
    phone: {
      countryCode: number;
      areaCode: string;
      phoneNumber: string;
      isoCode: string;
    };
    language: string;
    agreement: boolean;
    userId: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.RegisterEntity(entity, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC RegisterEntity error', { error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getEntityDetails(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetEntityDetails({ id }, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC GetEntityDetails error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async editEntityLogo(params: {
    entityId: string;
    logo: string;
  }): Promise<{
    success: boolean;
    message: string;
    logo: string;
  }> {
    return new Promise((resolve, reject) => {
      this.client.EditEntityLogo(params, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC EditEntityLogo error', { entityId: params.entityId, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async editEntityProfile(params: { 
    name: string;
    entityId: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return new Promise((resolve, reject) => {
      this.client.EditEntityProfile(params, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC EditEntityProfile error', { entityId: params.entityId, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  close() {
    this.isConnected = false;
    log.info('Entity gRPC client closed');
  }
}

// Export singleton instance
export const entityClient = new EntityClient();
export default EntityClient;
