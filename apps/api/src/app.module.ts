import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { StepsModule } from './modules/steps/steps.module';
import { PersonsModule } from './modules/persons/persons.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BillingModule } from './modules/billing/billing.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PortalModule } from './modules/portal/portal.module';
import { TagsModule } from './modules/tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CampaignsModule,
    StepsModule,
    PersonsModule,
    EnrollmentsModule,
    MessagingModule,
    SchedulerModule,
    TrackingModule,
    WebhooksModule,
    BillingModule,
    DashboardModule,
    PortalModule,
    TagsModule,
  ],
})
export class AppModule {}
