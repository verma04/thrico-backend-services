declare class GrpcClient {
    private userClient;
    private entityClient;
    private isConnected;
    constructor();
    getUser(id: string): Promise<any>;
    createUser(userData: any): Promise<any>;
    updateUser(id: string, updates: any): Promise<any>;
    deleteUser(id: string): Promise<any>;
    listUsers(filters?: any): Promise<any>;
    getEntity(id: string): Promise<any>;
    createEntity(entityData: any): Promise<any>;
    updateEntity(id: string, updates: any): Promise<any>;
    deleteEntity(id: string): Promise<any>;
    listEntities(filters?: any): Promise<any>;
    close(): void;
}
export declare const grpcClient: GrpcClient;
export default GrpcClient;
//# sourceMappingURL=client.d.ts.map