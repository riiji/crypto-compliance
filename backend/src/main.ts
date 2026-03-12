import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { type MicroserviceOptions } from '@nestjs/microservices';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createGrpcMicroserviceOptions } from './grpc.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors({
    origin: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Crypto Compliance API')
      .setDescription('HTTP API for crypto compliance policy management.')
      .setVersion('1.0')
      .addTag('compliance')
      .build();
    const swaggerDocumentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocumentFactory);
  }

  app.connectMicroservice<MicroserviceOptions>(createGrpcMicroserviceOptions());

  await app.startAllMicroservices();

  const httpPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({
    port: Number.isInteger(httpPort) && httpPort > 0 ? httpPort : 3000,
    host: '0.0.0.0',
  });
}

bootstrap();
