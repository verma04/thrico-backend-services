declare class AddonClient {
    private client;
    private isConnected;
    constructor();
    getAddonPricing(countryCode: string): Promise<any>;
    addAddon(data: {
        entityId: string;
        addonPricingId: string;
        countryCode: string;
        quantity: number;
    }): Promise<any>;
    removeAddon(entityId: string, addonId: string): Promise<any>;
    close(): void;
}
export declare const addonClient: AddonClient;
export default AddonClient;
//# sourceMappingURL=addonClient.d.ts.map