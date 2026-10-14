export type SaldoClientId = 'cliente33' | 'cliente34';

export interface SaldoAsignacionStatus {
  id: SaldoClientId;
  name: string;
  idCliente: number;
  running: boolean;
  sentCount: number;
  lastMonto: number | null;
  lastExecutedAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
  lastResult: unknown;
  lastPayload: Record<string, unknown> | null;
}
