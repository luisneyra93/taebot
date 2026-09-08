import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AuthTokenService } from '../auth/auth-token.service';
import { TaeApiClient } from '../api/tae-api.client';
import {
  BOT1_FIXED,
  BOT2_FIXED,
  BotId,
  RANDOM_AMOUNTS,
  TAE_SKU_AMOUNTS,
} from '../config/bots.config';
import { BotStatus, CreateTransactionBody } from './bot.types';
import { isAxiosError } from 'axios';

@Injectable()
export class BotRunnerService implements OnModuleDestroy {
  private readonly logger = new Logger(BotRunnerService.name);
  private readonly timers = new Map<BotId, NodeJS.Timeout>();
  private readonly skuIndex = new Map<BotId, number>([['bot1', 0]]);
  private readonly states = new Map<BotId, BotStatus>([
    [
      'bot1',
      {
        id: 'bot1',
        name: 'Bot 1 — TAE',
        running: false,
        ratePerMinute: 6,
        sentCount: 0,
        lastError: null,
        lastResult: null,
        lastPayload: null,
        lastSentAt: null,
      },
    ],
    [
      'bot2',
      {
        id: 'bot2',
        name: 'Bot 2 — CFE',
        running: false,
        ratePerMinute: 6,
        sentCount: 0,
        lastError: null,
        lastResult: null,
        lastPayload: null,
        lastSentAt: null,
      },
    ],
  ]);

  constructor(
    private readonly auth: AuthTokenService,
    private readonly api: TaeApiClient,
  ) {}

  onModuleDestroy(): void {
    for (const id of this.states.keys()) {
      this.stop(id);
    }
  }

  getAllStatus(): BotStatus[] {
    return Array.from(this.states.values()).map((s) => ({ ...s }));
  }

  getStatus(botId: BotId): BotStatus {
    return { ...this.requireState(botId) };
  }

  setRate(botId: BotId, ratePerMinute: number): BotStatus {
    if (!Number.isFinite(ratePerMinute) || ratePerMinute < 1) {
      throw new Error('ratePerMinute debe ser >= 1');
    }
    const state = this.requireState(botId);
    state.ratePerMinute = Math.floor(ratePerMinute);
    if (state.running) {
      this.scheduleNext(botId);
    }
    return this.getStatus(botId);
  }

  start(botId: BotId): BotStatus {
    const state = this.requireState(botId);
    if (state.running) return this.getStatus(botId);
    state.running = true;
    state.lastError = null;
    this.logger.log(`Iniciando ${botId} @ ${state.ratePerMinute}/min`);
    void this.tick(botId);
    return this.getStatus(botId);
  }

  stop(botId: BotId): BotStatus {
    const state = this.requireState(botId);
    state.running = false;
    const timer = this.timers.get(botId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(botId);
    }
    this.logger.log(`Detenido ${botId}`);
    return this.getStatus(botId);
  }

  private requireState(botId: BotId): BotStatus {
    const state = this.states.get(botId);
    if (!state) throw new Error(`Bot desconocido: ${botId}`);
    return state;
  }

  private scheduleNext(botId: BotId): void {
    const existing = this.timers.get(botId);
    if (existing) clearTimeout(existing);

    const state = this.requireState(botId);
    if (!state.running) return;

    const delayMs = Math.max(1000, Math.floor(60000 / state.ratePerMinute));
    const timer = setTimeout(() => {
      void this.tick(botId);
    }, delayMs);
    this.timers.set(botId, timer);
  }

  private async tick(botId: BotId): Promise<void> {
    const state = this.requireState(botId);
    if (!state.running) return;

    try {
      const result = await this.sendOne(botId);
      state.sentCount += 1;
      state.lastResult = result;
      state.lastError = null;
      state.lastSentAt = new Date().toISOString();
    } catch (error) {
      const message = this.formatError(error);
      state.lastError = message;
      this.logger.error(`${botId}: ${message}`);
    }

    this.scheduleNext(botId);
  }

  private async sendOne(botId: BotId): Promise<unknown> {
    let token = await this.auth.getToken(botId);

    const run = async (authToken: string) => {
      const idExterna = await this.api.generateExternalId(authToken);
      this.logger.log(`${botId} idExterna desde API (sin modificar)=${idExterna}`);
      const body = this.buildBody(botId, idExterna);
      this.requireState(botId).lastPayload = body;
      this.logger.log(
        `${botId} POST /transacciones/transaccion body=${JSON.stringify(body)}`,
      );
      return this.api.createTransaction(authToken, body);
    };

    try {
      return await run(token);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        this.auth.clearToken(botId);
        token = await this.auth.getToken(botId, true);
        return run(token);
      }
      throw error;
    }
  }

  private buildBody(botId: BotId, idExterna: string): CreateTransactionBody {
    if (botId === 'bot1') {
      const idx = this.skuIndex.get('bot1') ?? 0;
      const pair = TAE_SKU_AMOUNTS[idx % TAE_SKU_AMOUNTS.length];
      this.skuIndex.set('bot1', idx + 1);
      return {
        ...BOT1_FIXED,
        sku: pair.sku,
        monto: pair.monto,
        idExterna,
      };
    }

    const monto =
      RANDOM_AMOUNTS[Math.floor(Math.random() * RANDOM_AMOUNTS.length)];
    return {
      ...BOT2_FIXED,
      monto,
      idExterna,
    };
  }

  private formatError(error: unknown): string {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const detail =
        typeof data === 'string' ? data : JSON.stringify(data ?? error.message);
      return status ? `HTTP ${status}: ${detail}` : detail;
    }
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
