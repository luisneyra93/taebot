import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { AuthTokenService } from '../auth/auth-token.service';
import { TaeApiClient } from '../api/tae-api.client';
import { BotId } from '../config/bots.config';
import {
  SWITCHER_SETS,
  SwitcherPersistedState,
  SwitcherSetId,
  SwitcherStatus,
} from './switcher.types';

@Injectable()
export class SwitcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SwitcherService.name);
  private readonly stateFile: string;
  private readonly minIntervalMs: number;
  private readonly maxIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private activeSet: SwitcherSetId = 'paso1';
  private switchCount = 0;
  private lastExecutedAt: string | null = null;
  private nextRunAt: string | null = null;
  private lastError: string | null = null;
  private lastPayloads: Array<{ Id: number; Estado: 0 | 1 }> = [];

  constructor(
    private readonly auth: AuthTokenService,
    private readonly api: TaeApiClient,
    private readonly config: ConfigService,
  ) {
    this.stateFile = join(process.cwd(), 'data', 'switcher-state.json');
    this.minIntervalMs = Number(
      this.config.get('SWITCHER_MIN_INTERVAL_MS') ?? 60_000,
    );
    this.maxIntervalMs = Number(
      this.config.get('SWITCHER_MAX_INTERVAL_MS') ?? 300_000,
    );
    this.activeSet = this.loadPersistedSet();
  }

  onModuleInit(): void {
    const autoStart =
      (this.config.get('SWITCHER_AUTO_START') ?? 'true').toLowerCase() !==
      'false';
    if (autoStart) {
      this.start();
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  getStatus(): SwitcherStatus {
    const set = SWITCHER_SETS[this.activeSet];
    return {
      running: this.running,
      activeSet: this.activeSet,
      activeLabel: set.label,
      taeActiveId: set.taeId,
      serviciosActiveId: set.serviciosId,
      switchCount: this.switchCount,
      lastExecutedAt: this.lastExecutedAt,
      nextRunAt: this.nextRunAt,
      lastError: this.lastError,
      lastPayloads: [...this.lastPayloads],
    };
  }

  start(): SwitcherStatus {
    if (this.running) return this.getStatus();
    this.running = true;
    this.lastError = null;
    this.logger.log(
      `Switcher iniciado. Activo ahora: ${this.activeSet} (TAE ${SWITCHER_SETS[this.activeSet].taeId} / Servicios ${SWITCHER_SETS[this.activeSet].serviciosId})`,
    );
    this.scheduleNext();
    return this.getStatus();
  }

  stop(): SwitcherStatus {
    this.running = false;
    this.nextRunAt = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('Switcher detenido');
    return this.getStatus();
  }

  private loadPersistedSet(): SwitcherSetId {
    try {
      if (!existsSync(this.stateFile)) {
        this.persistSet('paso1');
        this.logger.log('Sin estado previo: se asume paso 1 activo (ids 12 y 13)');
        return 'paso1';
      }
      const raw = JSON.parse(
        readFileSync(this.stateFile, 'utf8'),
      ) as SwitcherPersistedState;
      if (raw?.activeSet === 'paso1' || raw?.activeSet === 'paso3') {
        this.logger.log(`Estado switcher restaurado: ${raw.activeSet}`);
        return raw.activeSet;
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo leer ${this.stateFile}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    this.persistSet('paso1');
    return 'paso1';
  }

  private persistSet(activeSet: SwitcherSetId): void {
    const dir = dirname(this.stateFile);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      this.stateFile,
      JSON.stringify({ activeSet } satisfies SwitcherPersistedState, null, 2),
      'utf8',
    );
  }

  private otherSet(current: SwitcherSetId): SwitcherSetId {
    return current === 'paso1' ? 'paso3' : 'paso1';
  }

  private randomDelayMs(): number {
    const min = Math.max(5_000, this.minIntervalMs);
    const max = Math.max(min, this.maxIntervalMs);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private scheduleNext(): void {
    if (this.timer) clearTimeout(this.timer);
    if (!this.running) return;

    const delay = this.randomDelayMs();
    this.nextRunAt = new Date(Date.now() + delay).toISOString();
    this.timer = setTimeout(() => {
      void this.tick();
    }, delay);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const from = this.activeSet;
    const to = this.otherSet(from);
    const deactivate = SWITCHER_SETS[from];
    const activate = SWITCHER_SETS[to];

    const payloads: Array<{
      id: number;
      estado: 0 | 1;
      botId: BotId;
    }> = [
      { id: deactivate.taeId, estado: 0, botId: 'bot1' },
      { id: deactivate.serviciosId, estado: 0, botId: 'bot2' },
      { id: activate.taeId, estado: 1, botId: 'bot1' },
      { id: activate.serviciosId, estado: 1, botId: 'bot2' },
    ];

    this.lastPayloads = payloads.map((p) => ({ Id: p.id, Estado: p.estado }));
    this.logger.log(
      `Switch ${from} → ${to}: ${JSON.stringify(this.lastPayloads)}`,
    );

    try {
      const results: unknown[] = [];
      for (const item of payloads) {
        results.push(
          await this.putEstatus(item.botId, item.id, item.estado),
        );
      }

      this.activeSet = to;
      this.persistSet(to);
      this.switchCount += 1;
      this.lastExecutedAt = new Date().toISOString();
      this.lastError = null;
      this.logger.log(
        `Switch ok. Ahora activo ${to} (TAE ${activate.taeId} / Servicios ${activate.serviciosId}) results=${JSON.stringify(results)}`,
      );
    } catch (error) {
      this.lastExecutedAt = new Date().toISOString();
      this.lastError = this.formatError(error);
      this.logger.error(`Switch falló, se mantiene ${from}: ${this.lastError}`);
    }

    this.scheduleNext();
  }

  private async putEstatus(
    botId: BotId,
    id: number,
    estado: 0 | 1,
  ): Promise<unknown> {
    let token = await this.auth.getToken(botId);
    const run = (authToken: string) =>
      this.api.setProductoProveedorEstatus(authToken, id, estado);

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
