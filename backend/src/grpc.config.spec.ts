import type { PackageDefinition } from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import { Transport } from '@nestjs/microservices';
import {
  addReflectionToGrpcServer,
  createGrpcMicroserviceOptions,
} from './grpc.config';

describe('grpc.config', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates grpc transport options with reflection enabled', () => {
    const options = createGrpcMicroserviceOptions('50061');

    expect(options.transport).toBe(Transport.GRPC);
    expect(options.options.url).toBe('0.0.0.0:50061');
    expect(options.options.package).toEqual(['compliance']);
    expect(options.options.protoPath).toEqual([
      expect.stringMatching(/compliance\/compliance\.proto$/),
    ]);
    expect(options.options.onLoadPackageDefinition).toBe(
      addReflectionToGrpcServer,
    );
  });

  it('falls back to the default grpc port when the env value is invalid', () => {
    const options = createGrpcMicroserviceOptions('not-a-port');

    expect(options.options.url).toBe('0.0.0.0:50051');
  });

  it('adds the reflection service to the grpc server', () => {
    const packageDefinition = {} as PackageDefinition;
    const server = {
      addService: jest.fn(),
    };
    const addToServer = jest
      .spyOn(ReflectionService.prototype, 'addToServer')
      .mockImplementation(() => undefined);

    addReflectionToGrpcServer(packageDefinition, server);

    expect(addToServer).toHaveBeenCalledWith(server);
  });
});
