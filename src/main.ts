import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Logger
  app.useLogger(app.get(Logger));

  // Security Headers
  app.use(helmet());

  // Strict CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001', // Updated to match new frontend port
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // API Prefix
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
  console.log(`Backend is running on port: ${port}`);
}
bootstrap();
