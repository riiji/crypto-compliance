import { HttpException, HttpStatus } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

function grpcCodeForHttpStatus(status: number): GrpcStatus {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return GrpcStatus.INVALID_ARGUMENT;
    case HttpStatus.UNAUTHORIZED:
      return GrpcStatus.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return GrpcStatus.PERMISSION_DENIED;
    case HttpStatus.NOT_FOUND:
      return GrpcStatus.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return GrpcStatus.FAILED_PRECONDITION;
    case HttpStatus.TOO_MANY_REQUESTS:
      return GrpcStatus.RESOURCE_EXHAUSTED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return GrpcStatus.UNAVAILABLE;
    case HttpStatus.GATEWAY_TIMEOUT:
      return GrpcStatus.DEADLINE_EXCEEDED;
    default:
      return GrpcStatus.INTERNAL;
  }
}

export function toGrpcException(error: unknown): RpcException {
  if (error instanceof RpcException) {
    return error;
  }

  if (error instanceof HttpException) {
    return new RpcException({
      code: grpcCodeForHttpStatus(error.getStatus()),
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return new RpcException({
      code: GrpcStatus.INTERNAL,
      message: error.message,
    });
  }

  return new RpcException({
    code: GrpcStatus.INTERNAL,
    message: 'Internal server error',
  });
}
