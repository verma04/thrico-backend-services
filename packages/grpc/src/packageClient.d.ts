declare class PackageClient {
    private client;
    private isConnected;
    constructor();
    getCountryPackages(country: string, entityId: string): Promise<any>;
    close(): void;
}
export declare const packageClient: PackageClient;
export default PackageClient;
//# sourceMappingURL=packageClient.d.ts.map