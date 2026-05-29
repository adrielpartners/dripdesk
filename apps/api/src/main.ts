import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { logger } from '@dripdesk/shared';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('dripdesk.apiPort', 3000);
  const isProduction = configService.get<string>('dripdesk.env') === 'production';

  app.setGlobalPrefix('api');
  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.enableCors({
    origin: configService.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (configService.get<boolean>('dripdesk.enableApiDocs', !isProduction)) {
    const config = new DocumentBuilder()
      .setTitle('DripDesk API')
      .setDescription('Micro-course delivery platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  logger.info('DripDesk API running', { port });
}

bootstrap();
