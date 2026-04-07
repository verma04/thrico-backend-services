declare class GamificationClient {
    private client;
    private isConnected;
    constructor();
    getGamificationModules(): Promise<any>;
    getModuleTriggers(moduleId?: string): Promise<any>;
    getEntityGamificationModules(entityId: string): Promise<any>;
    close(): void;
}
export declare const gamificationClient: GamificationClient;
export default GamificationClient;
//# sourceMappingURL=gamificationClient.d.ts.map