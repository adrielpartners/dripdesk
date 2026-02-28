import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { MessageQueue } from './queues/message.queue';
import { MessageProcessor } from './processors/message.processor';
import { MessagingModule } from '../messaging/messaging.module';
import { QUEUE_NAMES } from '@dripdesk/shared';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.MESSAGES }),
    MessagingModule,
  ],
  providers: [SchedulerService, MessageQueue, MessageProcessor],
  exports: [SchedulerService, MessageQueue],
})
export class SchedulerModule {}
