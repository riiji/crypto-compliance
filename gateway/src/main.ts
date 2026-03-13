import "./instrument";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors({
    origin: true,
  });

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Crypto Compliance Gateway API")
      .setDescription(
        "HTTP gateway that forwards compliance policy requests to the gRPC backend.",
      )
      .setVersion("1.0")
      .addTag("compliance")
      .build();
    const swaggerDocumentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api", app, swaggerDocumentFactory);
  }

  const httpPort = Number.parseInt(process.env.PORT ?? "3001", 10);
  await app.listen({
    port: Number.isInteger(httpPort) && httpPort > 0 ? httpPort : 3001,
    host: "0.0.0.0",
  });
}

bootstrap();
