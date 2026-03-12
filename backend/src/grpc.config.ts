import type { Server } from '@grpc/grpc-js';
import type { PackageDefinition } from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import { Transport, type GrpcOptions } from '@nestjs/microservices';
import { join } from 'path';

export function createGrpcMicroserviceOptions(
  rawPort: string | undefined = process.env.COMPLIANCE_GRPC_PORT,
): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${parseGrpcPort(rawPort)}`,
      package: ['compliance'],
      protoPath: [join(__dirname, 'compliance/compliance.proto')],
      onLoadPackageDefinition: addReflectionToGrpcServer,
    },
  };
}

export function addReflectionToGrpcServer(
  pkg: PackageDefinition,
  server: Pick<Server, 'addService'>,
): void {
  new ReflectionService(pkg).addToServer(server);
}

function parseGrpcPort(rawPort: string | undefined): number {
  const grpcPort = Number.parseInt(rawPort ?? '50051', 10);

  return Number.isInteger(grpcPort) && grpcPort > 0 ? grpcPort : 50051;
}
