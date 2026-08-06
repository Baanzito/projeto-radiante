import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const host = config.get<string>('API_HOST', '127.0.0.1');
  const port = config.get<number>('API_PORT', 3000);
  const webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:4200');

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: webOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Projeto Radiante API')
    .setDescription('API local-first para treino deliberado no VALORANT.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, host);
}

void bootstrap();
