declare class PageClient {
    private client;
    private isConnected;
    constructor();
    getAllPages(input: {
        value?: string;
        limit?: number;
    }): Promise<any>;
    addPage(input: {
        name: string;
        logo: string;
        location: {
            name: string;
            latitude: number;
            longitude: number;
            address: string;
        };
        type: string;
        industry: string;
        website: string;
        pageType: string;
        size: string;
        tagline: string;
        url: string;
        agreement: boolean;
    }): Promise<any>;
    close(): void;
}
export declare const pageClient: PageClient;
export default PageClient;
//# sourceMappingURL=pageClient.d.ts.map