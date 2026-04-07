declare class EntityClient {
    private client;
    private isConnected;
    constructor();
    registerEntity(entity: {
        domain: string;
        address: string;
        name: string;
        entityType: string;
        industryType: string;
        country: string;
        logo: string;
        website: string;
        designation: string;
        phone: {
            countryCode: number;
            areaCode: string;
            phoneNumber: string;
            isoCode: string;
        };
        language: string;
        agreement: boolean;
        userId: string;
    }): Promise<any>;
    getEntityDetails(id: string): Promise<any>;
    editEntityLogo(params: {
        entityId: string;
        logo: string;
    }): Promise<{
        success: boolean;
        message: string;
        logo: string;
    }>;
    editEntityProfile(params: {
        name: string;
        entityId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getMyAccounts(userId: string): Promise<any>;
    close(): void;
}
export declare const entityClient: EntityClient;
export default EntityClient;
//# sourceMappingURL=entityClient.d.ts.map