import { BotId } from '../config/bots.config';

export interface BotStatus {
  id: BotId;
  name: string;
  running: boolean;
  ratePerMinute: number;
  sentCount: number;
  lastError: string | null;
  lastResult: unknown;
  lastPayload: CreateTransactionBody | null;
  lastSentAt: string | null;
}

export interface CreateTransactionBody {
  referencia: string;
  sku: string;
  nip: string;
  esFavorito: number;
  monto: number;
  idExterna: string;
}

export interface ListTransactionsBody {
  fechaInicio: string;
  fechaFin: string;
  page: number;
  limit: number;
}
