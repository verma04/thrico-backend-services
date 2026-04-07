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
exports.entityClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("@thrico/logging");
const PROTO_PATH = path_1.default.join(__dirname, "../proto/entity.proto");
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
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const entityProto = protoDescriptor.entity;
// Entity gRPC client
class EntityClient {
    constructor() {
        this.isConnected = false;
        const address = `${GRPC_HOST}:${GRPC_PORT}`;
        this.client = new entityProto.EntityService(address, grpc.credentials.createInsecure());
        this.isConnected = true;
    }
    async registerEntity(entity) {
        return new Promise((resolve, reject) => {
            this.client.RegisterEntity(entity, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC RegisterEntity error", { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async getEntityDetails(id) {
        return new Promise((resolve, reject) => {
            this.client.GetEntityDetails({ id }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetEntityDetails error", {
                        id,
                        error: error.message,
                    });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async editEntityLogo(params) {
        return new Promise((resolve, reject) => {
            this.client.EditEntityLogo(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC EditEntityLogo error", {
                        entityId: params.entityId,
                        error: error.message,
                    });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async editEntityProfile(params) {
        return new Promise((resolve, reject) => {
            this.client.EditEntityProfile(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC EditEntityProfile error", {
                        entityId: params.entityId,
                        error: error.message,
                    });
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async getMyAccounts(userId) {
        return new Promise((resolve, reject) => {
            this.client.GetMyAccounts({ userId }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetMyAccounts error", {
                        userId,
                        error: error.message,
                    });
                    reject(error);
                }
                else {
                    resolve(response.accounts);
                }
            });
        });
    }
    close() {
        this.isConnected = false;
        logging_1.log.info("Entity gRPC client closed");
    }
}
// Export singleton instance
exports.entityClient = new EntityClient();
exports.default = EntityClient;
//# sourceMappingURL=entityClient.js.map