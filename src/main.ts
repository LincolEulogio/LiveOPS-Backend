import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  const port = configService.get<number>('PORT', 5000);

  // Logger
  app.useLogger(logger);

  // Cookie parser (necesario para httpOnly cookies de refresh token)
  app.use(cookieParser());

  // Security Headers
  app.use(helmet());

  // Strict CORS — fail hard if CORS_ORIGIN is missing in production
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigin && configService.get('NODE_ENV') === 'production') {
    throw new Error('CORS_ORIGIN env variable is required in production');
  }
  app.enableCors({
    origin: corsOrigin || 'http://localhost:4000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // API Prefix
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger — only expose in non-production environments
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LIVEOPSFIN API')
      .setDescription('Live Operations & Finance Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refreshToken')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  logger.log(`Backend is running on port: ${port}`);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
