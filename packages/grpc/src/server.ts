import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { log } from '@thrico/logging';

const SERVICE_PROTO_PATH = path.join(__dirname, '../proto/service.proto');
const COUNTRY_PROTO_PATH = path.join(__dirname, '../proto/country.proto');

// Load service proto file
const servicePackageDefinition = protoLoader.loadSync(SERVICE_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Load country proto file
const countryPackageDefinition = protoLoader.loadSync(COUNTRY_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const serviceProtoDescriptor = grpc.loadPackageDefinition(servicePackageDefinition) as any;
const countryProtoDescriptor = grpc.loadPackageDefinition(countryPackageDefinition) as any;
const thrico = serviceProtoDescriptor.thrico;
const thricoCountry = countryProtoDescriptor.thrico;

export interface GrpcServiceImplementations {
  userService: any;
  entityService: any;
  countryService: any;
}

export function createGrpcServer(
  implementations: GrpcServiceImplementations,
  port: string = '50051'
): grpc.Server {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': parseInt(
      process.env.GRPC_MAX_RECEIVE_MESSAGE_LENGTH || '4194304',
      10
    ),
    'grpc.max_send_message_length': parseInt(
      process.env.GRPC_MAX_SEND_MESSAGE_LENGTH || '4194304',
      10
    ),
  });

  // Add UserService
  server.addService(thrico.UserService.service, implementations.userService);

  // Add EntityService
  server.addService(thrico.EntityService.service, implementations.entityService);

  // Add CountryService
  server.addService(thricoCountry.CountryService.service, implementations.countryService);

  // Bind server
  const address = `0.0.0.0:${port}`;
  server.bindAsync(
    address,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        log.error('Failed to start gRPC server', { error: error.message });
        throw error;
      }
      log.info(`gRPC server started`, { address, port });
    }
  );

  return server;
}
