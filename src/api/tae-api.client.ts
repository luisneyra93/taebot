import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CreateTransactionBody,
  ListTransactionsBody,
} from '../bots/bot.types';

@Injectable()
export class TaeApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('TAE_API_BASE');
  }

  async login(username: string, password: string): Promise<{ token: string }> {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth`, { username, password }),
    );
    return data;
  }

  async generateExternalId(token: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/transaccion-tae/generate/externalId`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'text',
          transformResponse: [(body) => body],
        },
      ),
    );

    // Usar exactamente lo que responde el API (solo limpia comillas JSON si vienen).
    const raw = response.data;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    }

    if (raw != null && typeof raw === 'object' && 'idExterna' in raw) {
      return String((raw as { idExterna: string }).idExterna);
    }

    return String(raw);
  }

  async createTransaction(
    token: string,
    body: CreateTransactionBody,
  ): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/transacciones/transaccion`, body, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data;
  }

  async listTransactions(
    token: string,
    body: ListTransactionsBody,
  ): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/transaccion-tae`, body, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data;
  }

  async asignarSaldo(token: string, body: Record<string, unknown>): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/saldos/asignarSaldo`, body, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return data;
  }

  async setProductoProveedorEstatus(
    token: string,
    id: number,
    estado: 0 | 1,
  ): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/switcher/estatus-producto-proveedor/${id}`,
        { Id: id, Estado: estado },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    );
    return data;
  }
}
