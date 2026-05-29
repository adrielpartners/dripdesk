import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PersonsModule } from './modules/persons/persons.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { StepsModule } from './modules/steps/steps.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { QueueModule } from './modules/queue/queue.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ProviderCredentialsModule } from './modules/provider-credentials/provider-credentials.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { UnsubscribeModule } from './modules/unsubscribe/unsubscribe.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PortalModule } from './modules/portal/portal.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { loadDripdeskConfig, validateEnvironment } from './config/dripdesk-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [loadDripdeskConfig],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PersonsModule,
    CampaignsModule,
    StepsModule,
    EnrollmentsModule,
    QueueModule,
    TrackingModule,
    ProviderCredentialsModule,
    WebhooksModule,
    UnsubscribeModule,
    DashboardModule,
    PortalModule,
    BillingModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
