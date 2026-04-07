declare class EmailTopupClient {
    private client;
    private isConnected;
    constructor();
    getEmailTopups(countryCode: string): Promise<any>;
    buyEmailTopup(data: {
        entityId: string;
        topupId: string;
        countryCode: string;
    }): Promise<any>;
    getEmailQuota(entityId: string): Promise<any>;
    deductEmailQuota(entityId: string, count: number): Promise<any>;
    getEmailOverview(entityId: string): Promise<any>;
    getBillingHistory(entityId: string): Promise<any>;
    close(): void;
}
export declare const emailTopupClient: EmailTopupClient;
export default EmailTopupClient;
//# sourceMappingURL=emailTopupClient.d.ts.map