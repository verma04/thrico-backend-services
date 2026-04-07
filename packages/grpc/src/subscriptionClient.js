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
exports.subscriptionClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const logging_1 = require("@thrico/logging");
const PROTO_PATH = path_1.default.join(__dirname, "../proto/subscription.proto");
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
const subscriptionProto = protoDescriptor.subscription;
// Subscription gRPC client
class SubscriptionClient {
    constructor() {
        this.isConnected = false;
        const address = `${GRPC_HOST}:${GRPC_PORT}`;
        logging_1.log.info("Initializing Subscription gRPC client", { address });
        this.client = new subscriptionProto.SubscriptionService(address, grpc.credentials.createInsecure());
        this.isConnected = true;
    }
    async checkEntitySubscription(entityId) {
        return new Promise((resolve, reject) => {
            this.client.CheckEntitySubscription({ entityId }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC CheckEntitySubscription error", {
                        entityId,
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
    async updateTrialToPackage(entityId, packageId, countryCode, billingCycle) {
        return new Promise((resolve, reject) => {
            this.client.UpdateTrialToPackage({ entityId, packageId, countryCode, billingCycle }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC UpdateTrialToPackage error", {
                        entityId,
                        packageId,
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
    async subscribeTrial(entityId, countryCode) {
        return new Promise((resolve, reject) => {
            this.client.SubscribeTrial({ entityId, countryCode }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC SubscribeTrial error", {
                        entityId,
                        countryCode,
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
    async verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        return new Promise((resolve, reject) => {
            this.client.VerifyRazorpayPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC VerifyRazorpayPayment error", {
                        razorpayOrderId,
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
    async getPlanOverview(entityId) {
        return new Promise((resolve, reject) => {
            this.client.GetPlanOverview({ entityId }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetPlanOverview error", {
                        entityId,
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
    async getUpgradePlanSummary(params) {
        return new Promise((resolve, reject) => {
            this.client.upgradePlanSummary(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC upgradePlanSummary error", {
                        ...params,
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
    async updateToYearly(params) {
        return new Promise((resolve, reject) => {
            this.client.UpdateToYearly(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC UpdateToYearly error", {
                        ...params,
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
    async updateToYearlySummary(params) {
        return new Promise((resolve, reject) => {
            this.client.UpdateToYearlySummary(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC UpdateToYearlySummary error", {
                        ...params,
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
    async upgradePlan(params) {
        return new Promise((resolve, reject) => {
            this.client.UpgradePlan(params, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC UpgradePlan error", {
                        ...params,
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
    async updateEntityModules(entityId, modules) {
        return new Promise((resolve, reject) => {
            this.client.UpdateEntityModules({ entityId, modules }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC UpdateEntityModules error", {
                        entityId,
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
    async getAllEntityInvoice(entityId) {
        return new Promise((resolve, reject) => {
            this.client.GetAllEntityInvoice({ entityId }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC GetAllEntityInvoice error", {
                        entityId,
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
    async updateBillingInvoicePdfUrl(billingId, invoicePdfUrl) {
        return new Promise((resolve, reject) => {
            this.client.updateBillingInvoicePdfUrl({ billingId, invoicePdfUrl }, (error, response) => {
                if (error) {
                    logging_1.log.error("gRPC updateBillingInvoicePdfUrl error", {
                        billingId,
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
    close() {
        this.isConnected = false;
        logging_1.log.info("Subscription gRPC client closed");
    }
}
// Export singleton instance
exports.subscriptionClient = new SubscriptionClient();
exports.default = SubscriptionClient;
//# sourceMappingURL=subscriptionClient.js.map