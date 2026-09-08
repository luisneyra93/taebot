import { Body, Controller, Post } from '@nestjs/common';
import { AuthTokenService } from '../auth/auth-token.service';
import { TaeApiClient } from '../api/tae-api.client';
import { ListTransactionsBody } from '../bots/bot.types';
import { isAxiosError } from 'axios';

@Controller('api/transacciones')
export class DashboardController {
  constructor(
    private readonly auth: AuthTokenService,
    private readonly api: TaeApiClient,
  ) {}

  @Post()
  async list(
    @Body()
    body: Partial<ListTransactionsBody>,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const payload: ListTransactionsBody = {
      fechaInicio: body.fechaInicio ?? '2025-01-01',
      fechaFin: body.fechaFin ?? today,
      page: body.page ?? 1,
      limit: body.limit ?? 20,
    };

    let token = await this.auth.getToken('bot1');
    try {
      return await this.api.listTransactions(token, payload);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        this.auth.clearToken('bot1');
        token = await this.auth.getToken('bot1', true);
        return this.api.listTransactions(token, payload);
      }
      throw error;
    }
  }
}
