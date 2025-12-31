import { log } from "@thrico/logging";

// Mock Custom Request Client
class CustomRequestClient {
  async createCustomRequest(params: {
    teamRequirements?: any;
    features?: any;
    timeLine?: any;
    contact?: any;
    security?: any;
    entityId: string;
  }): Promise<any> {
    log.info("Mocking createCustomRequest gRPC call", params);
    // Return a mock ID simulating a successful creation
    return {
      id: "mock-custom-request-id",
      ...params,
      createdAt: new Date().toISOString(),
    };
  }
}

export const createCustomRequest = async (params: any) => {
  const client = new CustomRequestClient();
  return client.createCustomRequest(params);
};

export default CustomRequestClient;
