import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { json, static as expressStatic } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const config = app.get(ConfigService);
  const production = config.get<string>('NODE_ENV') === 'production';
  const host = config.get<string>(
    'API_HOST',
    production ? '0.0.0.0' : '127.0.0.1',
  );
  const port = Number(
    config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? 3000,
  );
  const appOrigin = config.get<string>(
    'APP_ORIGIN',
    config.get<string>('WEB_ORIGIN', 'http://localhost:4200'),
  );
  const allowedOrigin = new URL(appOrigin).origin;
  const express = app.getHttpAdapter().getInstance() as {
    set(name: string, value: unknown): void;
    get(
      path: RegExp,
      handler: (request: Request, response: Response) => void,
    ): void;
  };
  express.set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '10mb' }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; object-src 'none'",
    );
    if (production) {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    const origin = request.header('origin');
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (origin && unsafeMethod && origin !== allowedOrigin) {
      response.status(403).json({
        type: 'about:blank',
        title: 'Origem não permitida',
        status: 403,
        detail: 'A requisição não veio da interface autorizada.',
        instance: request.originalUrl,
      });
      return;
    }
    next();
  });
  app.enableCors({ origin: allowedOrigin, credentials: true });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerEnabled =
    config.get<string>('ENABLE_SWAGGER') === 'true' || !production;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Projeto Radiante API')
      .setDescription('API pessoal para treino deliberado no VALORANT.')
      .setVersion('0.7.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const serveWeb = config.get<string>('SERVE_WEB') === 'true' || production;
  const webDist = resolve(
    process.cwd(),
    config.get<string>('WEB_DIST_PATH', 'public'),
  );
  if (serveWeb) {
    const indexPath = resolve(webDist, 'index.html');
    if (!existsSync(indexPath)) {
      throw new Error(`Build web não encontrado em ${indexPath}.`);
    }
    app.use(
      expressStatic(webDist, {
        index: 'index.html',
        maxAge: production ? '1y' : 0,
        setHeaders(response, filePath) {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('ngsw.json') ||
            filePath.endsWith('ngsw-worker.js') ||
            filePath.endsWith('manifest.webmanifest')
          ) {
            response.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    await app.init();
    express.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => {
      response.setHeader('Cache-Control', 'no-cache');
      response.sendFile(indexPath);
    });
  }

  await app.listen(port, host);
}

void bootstrap();
