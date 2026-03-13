import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { createGrpcMicroserviceOptions } from './grpc.config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    createGrpcMicroserviceOptions(),
  );
  await app.listen();
}

bootstrap();
