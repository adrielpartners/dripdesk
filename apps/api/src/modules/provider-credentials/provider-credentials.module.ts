import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { ProviderCredentialsController } from './provider-credentials.controller';
import { ProviderCredentialsService } from './provider-credentials.service';

@Module({
  imports: [QueueModule],
  controllers: [ProviderCredentialsController],
  providers: [ProviderCredentialsService],
})
export class ProviderCredentialsModule {}
