import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { randomUUID } from 'crypto';
import { AuditService } from './audit/audit.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditExceptionFilter } from './audit/audit-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const auditService = app.get(AuditService);

  app.use((req: { requestId?: string }, _res: unknown, next: () => void) => {
    req.requestId = randomUUID();
    next();
  });

  app.useGlobalInterceptors(new AuditInterceptor(auditService));
  app.useGlobalFilters(new AuditExceptionFilter(auditService));
  app.enableCors(false);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Milatec API')
      .setDescription('Documentacao da API do backend Milatec')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
