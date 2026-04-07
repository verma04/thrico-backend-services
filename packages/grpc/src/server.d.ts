import * as grpc from '@grpc/grpc-js';
export interface GrpcServiceImplementations {
    userService: any;
    entityService: any;
    countryService: any;
    addonService: any;
    emailTopupService: any;
}
export declare function createGrpcServer(implementations: GrpcServiceImplementations, port?: string): grpc.Server;
//# sourceMappingURL=server.d.ts.map