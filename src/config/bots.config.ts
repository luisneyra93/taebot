export type BotId = 'bot1' | 'bot2';

export const TAE_SKU_AMOUNTS: Array<{ sku: string; monto: number }> = [
  { sku: 'TAE010', monto: 10 },
  { sku: 'TAE020', monto: 20 },
  { sku: 'TAE030', monto: 30 },
  { sku: 'TAE050', monto: 50 },
  { sku: 'TAE080', monto: 80 },
  { sku: 'TAE100', monto: 100 },
  { sku: 'TAE150', monto: 150 },
  { sku: 'TAE200', monto: 200 },
  { sku: 'TAE300', monto: 300 },
  { sku: 'TAE500', monto: 500 },
];

export const RANDOM_AMOUNTS = [10, 20, 30, 50, 80, 100, 150, 200, 300, 500];

export const BOT1_FIXED = {
  referencia: '6722289963',
  nip: '',
  esFavorito: 0,
};

export const BOT2_FIXED = {
  referencia: '1234',
  sku: 'CFE',
  nip: '',
  esFavorito: 0,
};
