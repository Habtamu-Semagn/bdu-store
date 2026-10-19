import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BDU Store — Campus Device Storage API')
    .setDescription(
      'University-ID based authentication, device storage requests, storage tokens and release requests. ' +
        'There is no email anywhere in this system.',
    )
    .setVersion('1.0.0')
    .addCookieAuth('token', { type: 'apiKey', in: 'cookie', name: 'token' })
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.APP_PORT ?? process.env.PORT ?? 4000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`BDU Store API listening on http://localhost:${port}/api`);
  logger.log(`Swagger documentation at http://localhost:${port}/api/docs`);
}

void bootstrap();
