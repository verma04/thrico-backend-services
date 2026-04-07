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
exports.countryClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("@thrico/logging");
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env from monorepo root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../../.env") });
// Proto file path - different in dev vs production
const fs = require("fs");
const devProtoPath = path_1.default.resolve(__dirname, "../proto/country.proto");
const prodProtoPath = path_1.default.resolve(__dirname, "../../../proto/country.proto");
const PROTO_PATH = fs.existsSync(devProtoPath) ? devProtoPath : prodProtoPath;
const GRPC_HOST = process.env.GRPC_HOST || "localhost";
const GRPC_PORT = process.env.GRPC_PORT || "50051";
const GRPC_URL = `${GRPC_HOST}:${GRPC_PORT}`;
// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const thrico = protoDescriptor.countryapi.CountryService;
// Country gRPC client
class CountryClient {
    constructor() {
        this.isConnected = false;
        logging_1.log.info("Initializing Country gRPC client", { address: GRPC_URL });
        this.client = new thrico(GRPC_URL, grpc.credentials.createInsecure());
        this.isConnected = true;
    }
    async getAllCountries() {
        return new Promise((resolve, reject) => {
            this.client.GetAllCountries({}, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetAllCountries error", { error: error.message });
                    reject(error);
                }
                else {
                    resolve(response.countries || []);
                }
            });
        });
    }
    async getCountryDetails(code) {
        return new Promise((resolve, reject) => {
            this.client.GetCountryDetails({ code }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetCountryDetails error", { error: error.message, code });
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
        logging_1.log.info("Country gRPC client closed");
    }
}
// Export singleton instance
exports.countryClient = new CountryClient();
exports.default = CountryClient;
//# sourceMappingURL=countryClient.js.map