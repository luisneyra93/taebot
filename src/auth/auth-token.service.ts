import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaeApiClient } from '../api/tae-api.client';
import { BotId } from '../config/bots.config';

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);
  private readonly tokens = new Map<BotId, string>();

  constructor(
    private readonly api: TaeApiClient,
    private readonly config: ConfigService,
  ) {}

  async getToken(botId: BotId, forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const cached = this.tokens.get(botId);
      if (cached) return cached;
    }

    const username = this.config.get<string>(
      botId === 'bot1' ? 'BOT1_USERNAME' : 'BOT2_USERNAME',
      '',
    );
    const password = this.config.get<string>(
      botId === 'bot1' ? 'BOT1_PASSWORD' : 'BOT2_PASSWORD',
      'P@ssw0rd.',
    );

    if (!username) {
      throw new Error(
        `Falta ${botId === 'bot1' ? 'BOT1_USERNAME' : 'BOT2_USERNAME'} en .env`,
      );
    }

    this.logger.log(`Login ${botId} (${username})`);
    const result = await this.api.login(username, password);
    if (!result?.token) {
      throw new Error(`Login fallido para ${botId}: sin token`);
    }

    this.tokens.set(botId, result.token);
    return result.token;
  }

  clearToken(botId: BotId): void {
    this.tokens.delete(botId);
  }
}
