import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';

const PROTO_PATH = path.join(__dirname, '../proto/subscription.proto');
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
const subscriptionProto = protoDescriptor.subscription;

// Subscription gRPC client
class SubscriptionClient {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const address = `${GRPC_HOST}:${GRPC_PORT}`;
    
    log.info('Initializing Subscription gRPC client', { address });

    this.client = new subscriptionProto.SubscriptionService(
      address,
      grpc.credentials.createInsecure()
    );

    this.isConnected = true;
  }

  async checkEntitySubscription(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.CheckEntitySubscription({ entityId }, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          log.error('gRPC CheckEntitySubscription error', { entityId, error: error.message });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async updateTrialToPackage(
    entityId: string,
    packageId: string,
    countryCode: string,
    billingCycle: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.UpdateTrialToPackage(
        { entityId, packageId, countryCode, billingCycle },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC UpdateTrialToPackage error', { entityId, packageId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async subscribeTrial(entityId: string, countryCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.SubscribeTrial(
        { entityId, countryCode },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC SubscribeTrial error', { entityId, countryCode, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async verifyRazorpayPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature?: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.VerifyRazorpayPayment(
        { razorpayOrderId, razorpayPaymentId, razorpaySignature },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC VerifyRazorpayPayment error', { razorpayOrderId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getPlanOverview(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetPlanOverview(
        { entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC GetPlanOverview error', { entityId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getUpgradePlanSummary(params: {
    entityId: string;
    newPackageId: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.upgradePlanSummary(
        params,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC upgradePlanSummary error', { ...params, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async updateToYearly(params: {
    entityId: string;
    packageId: string;
    countryCode: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.UpdateToYearly(
        params,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC UpdateToYearly error', { ...params, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async upgradePlan(params: {
    entityId: string;
    newPackageId: string;
    billingCycle: 'monthly' | 'yearly';
    countryCode: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.UpgradePlan(
        params,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC UpgradePlan error', { ...params, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async updateEntityModules(
    entityId: string,
    modules: Array<{
      id: string;
      name: string;
      enabled: boolean;
      required: boolean;
      showInMobileNavigation: boolean;
      isEnabled: boolean;
      showInWebNavigation: boolean;
      isPopular: boolean;
      showInMobileNavigationSortNumber: number;
    }>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.UpdateEntityModules(
        { entityId, modules },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC UpdateEntityModules error', { entityId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getAllEntityInvoice(entityId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetAllEntityInvoice(
        { entityId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC GetAllEntityInvoice error', { entityId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async updateBillingInvoicePdfUrl(billingId: string, invoicePdfUrl: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.updateBillingInvoicePdfUrl(
        { billingId, invoicePdfUrl },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            log.error('gRPC updateBillingInvoicePdfUrl error', { billingId, error: error.message });
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  close() {
    this.isConnected = false;
    log.info('Subscription gRPC client closed');
  }
}

// Export singleton instance
export const subscriptionClient = new SubscriptionClient();
export default SubscriptionClient;
