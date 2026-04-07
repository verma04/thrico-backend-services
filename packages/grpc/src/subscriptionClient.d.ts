declare class SubscriptionClient {
    private client;
    private isConnected;
    constructor();
    checkEntitySubscription(entityId: string): Promise<any>;
    updateTrialToPackage(entityId: string, packageId: string, countryCode: string, billingCycle: string): Promise<any>;
    subscribeTrial(entityId: string, countryCode: string): Promise<any>;
    verifyRazorpayPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature?: string): Promise<any>;
    getPlanOverview(entityId: string): Promise<any>;
    getUpgradePlanSummary(params: {
        entityId: string;
        newPackageId: string;
    }): Promise<any>;
    updateToYearly(params: {
        entityId: string;
        countryCode: string;
    }): Promise<any>;
    updateToYearlySummary(params: {
        entityId: string;
        countryCode: string;
    }): Promise<any>;
    upgradePlan(params: {
        entityId: string;
        newPackageId: string;
        billingCycle: "monthly" | "yearly";
        countryCode: string;
    }): Promise<any>;
    updateEntityModules(entityId: string, modules: Array<{
        id: string;
        name: string;
        enabled: boolean;
        required: boolean;
        showInMobileNavigation: boolean;
        isEnabled: boolean;
        showInWebNavigation: boolean;
        isPopular: boolean;
        showInMobileNavigationSortNumber: number;
    }>): Promise<any>;
    getAllEntityInvoice(entityId: string): Promise<any>;
    updateBillingInvoicePdfUrl(billingId: string, invoicePdfUrl: string): Promise<any>;
    close(): void;
}
export declare const subscriptionClient: SubscriptionClient;
export default SubscriptionClient;
//# sourceMappingURL=subscriptionClient.d.ts.map