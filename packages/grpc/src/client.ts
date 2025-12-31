import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';
import dotenv from 'dotenv'
dotenv.config()

const PROTO_PATH = path.join(__dirname, '../proto/service.proto');
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
const thrico = protoDescriptor.thrico;

// Create gRPC client
class GrpcClient {
  private userClient: any;
  private entityClient: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;
    
    log.info('Initializing gRPC client', { address });

    this.userClient = new thrico.UserService(
      address,
      grpc.credentials.createInsecure()
    );

    this.entityClient = new thrico.EntityService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  // User Service Methods
  async getUser(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userClient.GetUser({ id }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC GetUser error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async createUser(userData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userClient.CreateUser(userData, (error: any, response: any) => {
        if (error) {
          log.error('gRPC CreateUser error', { error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userClient.UpdateUser({ id, ...updates }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC UpdateUser error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async deleteUser(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userClient.DeleteUser({ id }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC DeleteUser error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async listUsers(filters: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userClient.ListUsers(filters, (error: any, response: any) => {
        if (error) {
          log.error('gRPC ListUsers error', { error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Entity Service Methods
  async getEntity(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.entityClient.GetEntity({ id }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC GetEntity error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async createEntity(entityData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.entityClient.CreateEntity(entityData, (error: any, response: any) => {
        if (error) {
          log.error('gRPC CreateEntity error', { error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async updateEntity(id: string, updates: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.entityClient.UpdateEntity({ id, ...updates }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC UpdateEntity error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async deleteEntity(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.entityClient.DeleteEntity({ id }, (error: any, response: any) => {
        if (error) {
          log.error('gRPC DeleteEntity error', { id, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async listEntities(filters: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.entityClient.ListEntities(filters, (error: any, response: any) => {
        if (error) {
          log.error('gRPC ListEntities error', { error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  close() {
    this.isConnected = false;
    log.info('gRPC client closed');
  }
}

// Export singleton instance
export const grpcClient = new GrpcClient();
export default GrpcClient;
