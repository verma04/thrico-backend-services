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
exports.createGrpcServer = createGrpcServer;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("@thrico/logging");
const SERVICE_PROTO_PATH = path_1.default.join(__dirname, '../proto/service.proto');
const COUNTRY_PROTO_PATH = path_1.default.join(__dirname, '../proto/country.proto');
const ADDON_PROTO_PATH = path_1.default.join(__dirname, '../proto/addon.proto');
const EMAIL_TOPUP_PROTO_PATH = path_1.default.join(__dirname, '../proto/emailTopup.proto');
// Load service proto file
const servicePackageDefinition = protoLoader.loadSync(SERVICE_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
// Load country proto file
const countryPackageDefinition = protoLoader.loadSync(COUNTRY_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
// Load addon proto file
const addonPackageDefinition = protoLoader.loadSync(ADDON_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
// Load email topup proto file
const emailTopupPackageDefinition = protoLoader.loadSync(EMAIL_TOPUP_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const serviceProtoDescriptor = grpc.loadPackageDefinition(servicePackageDefinition);
const countryProtoDescriptor = grpc.loadPackageDefinition(countryPackageDefinition);
const addonProtoDescriptor = grpc.loadPackageDefinition(addonPackageDefinition);
const emailTopupProtoDescriptor = grpc.loadPackageDefinition(emailTopupPackageDefinition);
const thrico = serviceProtoDescriptor.thrico;
const thricoCountry = countryProtoDescriptor.countryapi;
const addonProto = addonProtoDescriptor.addon;
const emailTopupProto = emailTopupProtoDescriptor.emailtopup;
function createGrpcServer(implementations, port = '50051') {
    const server = new grpc.Server({
        'grpc.max_receive_message_length': parseInt(process.env.GRPC_MAX_RECEIVE_MESSAGE_LENGTH || '4194304', 10),
        'grpc.max_send_message_length': parseInt(process.env.GRPC_MAX_SEND_MESSAGE_LENGTH || '4194304', 10),
    });
    // Add UserService
    server.addService(thrico.UserService.service, implementations.userService);
    // Add EntityService
    server.addService(thrico.EntityService.service, implementations.entityService);
    // Add CountryService
    server.addService(thricoCountry.CountryService.service, implementations.countryService);
    // Add AddonService
    server.addService(addonProto.AddonService.service, implementations.addonService);
    // Add EmailTopupService
    server.addService(emailTopupProto.EmailTopupService.service, implementations.emailTopupService);
    // Bind server
    const address = `0.0.0.0:${port}`;
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            logging_1.log.error('Failed to start gRPC server', { error: error.message });
            throw error;
        }
        logging_1.log.info(`gRPC server started`, { address, port });
    });
    return server;
}
//# sourceMappingURL=server.js.map