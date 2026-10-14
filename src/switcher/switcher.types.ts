export type SwitcherSetId = 'paso1' | 'paso3';

export interface SwitcherPersistedState {
  activeSet: SwitcherSetId;
}

export interface SwitcherStatus {
  running: boolean;
  activeSet: SwitcherSetId;
  activeLabel: string;
  taeActiveId: number;
  serviciosActiveId: number;
  switchCount: number;
  lastExecutedAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
  lastPayloads: Array<{ Id: number; Estado: 0 | 1 }>;
}

export const SWITCHER_SETS: Record<
  SwitcherSetId,
  {
    label: string;
    taeId: number;
    serviciosId: number;
  }
> = {
  paso1: { label: 'Paso 1 — proveedores 12 / 13', taeId: 12, serviciosId: 13 },
  paso3: { label: 'Paso 3 — proveedores 10 / 11', taeId: 10, serviciosId: 11 },
};
