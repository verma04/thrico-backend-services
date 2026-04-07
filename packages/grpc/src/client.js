"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grpcClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("@thrico/logging");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PROTO_PATH = path_1.default.join(__dirname, '../proto/service.proto');
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
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const thrico = protoDescriptor.thrico;
// Create gRPC client
class GrpcClient {
    constructor() {
        this.isConnected = false;
        const address = `${GRPC_HOST}:${GRPC_PORT}`;
        logging_1.log.info('Initializing gRPC client', { address });
        this.userClient = new thrico.UserService(address, grpc.credentials.createInsecure());
        this.entityClient = new thrico.EntityService(address, grpc.credentials.createInsecure());
        this.isConnected = true;
    }
    // User Service Methods
    async getUser(id) {
        return new Promise((resolve, reject) => {
            this.userClient.GetUser({ id }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC GetUser error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            this.userClient.CreateUser(userData, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC CreateUser error', { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async updateUser(id, updates) {
        return new Promise((resolve, reject) => {
            this.userClient.UpdateUser({ id, ...updates }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC UpdateUser error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async deleteUser(id) {
        return new Promise((resolve, reject) => {
            this.userClient.DeleteUser({ id }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC DeleteUser error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async listUsers(filters = {}) {
        return new Promise((resolve, reject) => {
            this.userClient.ListUsers(filters, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC ListUsers error', { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    // Entity Service Methods
    async getEntity(id) {
        return new Promise((resolve, reject) => {
            this.entityClient.GetEntity({ id }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC GetEntity error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async createEntity(entityData) {
        return new Promise((resolve, reject) => {
            this.entityClient.CreateEntity(entityData, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC CreateEntity error', { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async updateEntity(id, updates) {
        return new Promise((resolve, reject) => {
            this.entityClient.UpdateEntity({ id, ...updates }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC UpdateEntity error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async deleteEntity(id) {
        return new Promise((resolve, reject) => {
            this.entityClient.DeleteEntity({ id }, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC DeleteEntity error', { id, error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async listEntities(filters = {}) {
        return new Promise((resolve, reject) => {
            this.entityClient.ListEntities(filters, (error, response) => {
                if (error) {
                    logging_1.log.error('gRPC ListEntities error', { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    close() {
        this.isConnected = false;
        logging_1.log.info('gRPC client closed');
    }
}
// Export singleton instance
exports.grpcClient = new GrpcClient();
exports.default = GrpcClient;
//# sourceMappingURL=client.js.map