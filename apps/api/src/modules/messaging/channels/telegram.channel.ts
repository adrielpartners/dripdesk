import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { MessageChannel, ChannelSendData, ChannelResult } from './channel.interface';

@Injectable()
export class TelegramChannel implements MessageChannel {
  type = 'TELEGRAM';
  private readonly logger = new Logger(TelegramChannel.name);

  async send(data: ChannelSendData): Promise<ChannelResult> {
    const { organization, recipient, content, parseMode, mediaUrl } = data;

    if (!organization.telegramBotToken) {
      return { success: false, error: 'Telegram bot token not configured' };
    }

    try {
      const bot = new Telegraf(organization.telegramBotToken);
      const chatId = parseInt(recipient, 10) || recipient;

      let result: any;

      if (mediaUrl) {
        result = await bot.telegram.sendPhoto(chatId, mediaUrl, {
          caption: content,
          parse_mode: (parseMode as any) ?? 'HTML',
        });
      } else {
        result = await bot.telegram.sendMessage(chatId, content, {
          parse_mode: (parseMode as any) ?? 'HTML',
        });
      }

      return {
        success: true,
        providerMessageId: String(result.message_id),
      };
    } catch (error) {
      this.logger.error(`Telegram send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
