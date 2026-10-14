import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { AuthTokenService } from '../auth/auth-token.service';
import { TaeApiClient } from '../api/tae-api.client';
import { BotId } from '../config/bots.config';
import {
  SaldoAsignacionStatus,
  SaldoClientId,
} from './saldo-asignacion.types';

const TEMPLATES: Record<
  SaldoClientId,
  {
    name: string;
    botId: BotId;
    base: Record<string, unknown>;
  }
> = {
  cliente33: {
    name: 'Cliente 33',
    botId: 'bot1',
    base: {
      idCliente: 33,
      idMarca: 6,
      idRegion: 2,
      idCadena: null,
      idSucursal: null,
      idCaja: null,
      nivelBolsa: 1,
      idDeposito: null,
    },
  },
  cliente34: {
    name: 'Cliente 34',
    botId: 'bot2',
    base: {
      idCliente: 34,
      idMarca: 9,
      idRegion: 11,
      idCadena: null,
      idSucursal: null,
      idCaja: null,
      nivelBolsa: 1,
      idDeposito: null,
    },
  },
};

@Injectable()
export class SaldoAsignacionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SaldoAsignacionService.name);
  private readonly timers = new Map<SaldoClientId, NodeJS.Timeout>();
  private readonly minIntervalMs: number;
  private readonly maxIntervalMs: number;
  private readonly states = new Map<SaldoClientId, SaldoAsignacionStatus>();

  constructor(
    private readonly auth: AuthTokenService,
    private readonly api: TaeApiClient,
    private readonly config: ConfigService,
  ) {
    this.minIntervalMs = Number(
      this.config.get('SALDO_MIN_INTERVAL_MS') ?? 60_000,
    );
    this.maxIntervalMs = Number(
      this.config.get('SALDO_MAX_INTERVAL_MS') ?? 300_000,
    );

    for (const id of Object.keys(TEMPLATES) as SaldoClientId[]) {
      this.states.set(id, {
        id,
        name: TEMPLATES[id].name,
        idCliente: Number(TEMPLATES[id].base.idCliente),
        running: false,
        sentCount: 0,
        lastMonto: null,
        lastExecutedAt: null,
        nextRunAt: null,
        lastError: null,
        lastResult: null,
        lastPayload: null,
      });
    }
  }

  onModuleInit(): void {
    const autoStart =
      (this.config.get('SALDO_AUTO_START') ?? 'true').toLowerCase() !== 'false';
    if (autoStart) {
      this.startAll();
    }
  }

  onModuleDestroy(): void {
    this.stopAll();
  }

  getAllStatus(): SaldoAsignacionStatus[] {
    return Array.from(this.states.values()).map((s) => ({ ...s }));
  }

  startAll(): SaldoAsignacionStatus[] {
    for (const id of this.states.keys()) {
      this.start(id);
    }
    return this.getAllStatus();
  }

  stopAll(): SaldoAsignacionStatus[] {
    for (const id of this.states.keys()) {
      this.stop(id);
    }
    return this.getAllStatus();
  }

  start(id: SaldoClientId): SaldoAsignacionStatus {
    const state = this.require(id);
    if (state.running) return { ...state };
    state.running = true;
    state.lastError = null;
    this.logger.log(`Iniciando asignación saldo ${id}`);
    this.scheduleNext(id, true);
    return { ...state };
  }

  stop(id: SaldoClientId): SaldoAsignacionStatus {
    const state = this.require(id);
    state.running = false;
    state.nextRunAt = null;
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.logger.log(`Detenida asignación saldo ${id}`);
    return { ...state };
  }

  private require(id: SaldoClientId): SaldoAsignacionStatus {
    const state = this.states.get(id);
    if (!state) throw new Error(`Cliente saldo desconocido: ${id}`);
    return state;
  }

  private randomMonto(): number {
    return Math.floor(Math.random() * (100_000 - 1_000 + 1)) + 1_000;
  }

  private randomDelayMs(): number {
    const min = Math.max(5_000, this.minIntervalMs);
    const max = Math.max(min, this.maxIntervalMs);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private scheduleNext(id: SaldoClientId, immediate = false): void {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);

    const state = this.require(id);
    if (!state.running) return;

    const delay = immediate ? 2_000 : this.randomDelayMs();
    state.nextRunAt = new Date(Date.now() + delay).toISOString();

    const timer = setTimeout(() => {
      void this.tick(id);
    }, delay);
    this.timers.set(id, timer);
  }

  private async tick(id: SaldoClientId): Promise<void> {
    const state = this.require(id);
    if (!state.running) return;

    const template = TEMPLATES[id];
    const monto = this.randomMonto();
    const payload = { ...template.base, monto };
    state.lastPayload = payload;
    state.lastMonto = monto;

    try {
      let token = await this.auth.getToken(template.botId);
      const run = async (authToken: string) =>
        this.api.asignarSaldo(authToken, payload);

      let result: unknown;
      try {
        result = await run(token);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          this.auth.clearToken(template.botId);
          token = await this.auth.getToken(template.botId, true);
          result = await run(token);
        } else {
          throw error;
        }
      }

      state.sentCount += 1;
      state.lastExecutedAt = new Date().toISOString();
      state.lastResult = result;
      state.lastError = null;
      this.logger.log(
        `${id} asignarSaldo ok monto=${monto} payload=${JSON.stringify(payload)}`,
      );
    } catch (error) {
      state.lastExecutedAt = new Date().toISOString();
      state.lastError = this.formatError(error);
      this.logger.error(`${id} asignarSaldo: ${state.lastError}`);
    }

    this.scheduleNext(id);
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
