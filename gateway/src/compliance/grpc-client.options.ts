import { Transport, type ClientProviderOptions } from "@nestjs/microservices";
import { join } from "node:path";

export const COMPLIANCE_BACKEND_GRPC_CLIENT = "COMPLIANCE_BACKEND_GRPC_CLIENT";

export function createComplianceBackendGrpcClientOptions(
  rawTarget: string | undefined = process.env.COMPLIANCE_BACKEND_GRPC_URL,
): ClientProviderOptions {
  return {
    name: COMPLIANCE_BACKEND_GRPC_CLIENT,
    transport: Transport.GRPC,
    options: {
      url: rawTarget?.trim() || "127.0.0.1:50051",
      package: ["compliance"],
      protoPath: [join(__dirname, "compliance.proto")],
    },
  };
}
