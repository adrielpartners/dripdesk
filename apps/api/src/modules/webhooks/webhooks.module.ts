import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SubscriberIntakeService } from './subscriber-intake.service';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { SubscriberIntakeController } from './subscriber-intake.controller';

@Module({
  controllers: [WebhooksController, SubscriberIntakeController],
  providers: [WebhooksService, SubscriberIntakeService, EnrollmentsRepository],
})
export class WebhooksModule {}
