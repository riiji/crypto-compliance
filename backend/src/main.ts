import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['compliance'],
      protoPath: [join(__dirname, 'compliance/compliance.proto')],
    },
  });

  await app.startAllMicroservices();

  const httpPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen({
    port: Number.isInteger(httpPort) && httpPort > 0 ? httpPort : 3000,
    host: '0.0.0.0',
  });
}

bootstrap();
