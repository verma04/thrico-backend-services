"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomRequest = void 0;
const logging_1 = require("@thrico/logging");
// Mock Custom Request Client
class CustomRequestClient {
    async createCustomRequest(params) {
        logging_1.log.info("Mocking createCustomRequest gRPC call", params);
        // Return a mock ID simulating a successful creation
        return {
            id: "mock-custom-request-id",
            ...params,
            createdAt: new Date().toISOString(),
        };
    }
}
const createCustomRequest = async (params) => {
    const client = new CustomRequestClient();
    return client.createCustomRequest(params);
};
exports.createCustomRequest = createCustomRequest;
exports.default = CustomRequestClient;
//# sourceMappingURL=customRequest.js.map