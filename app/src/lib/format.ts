import { STROOPS_PER_XLM, SECONDS_PER_LEDGER } from "./config";

export function shortAddr(a: string, n = 4): string {
  if (!a) return "";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function stroopsToXlm(stroops: bigint | number | string): number {
  return Number(BigInt(stroops)) / STROOPS_PER_XLM;
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * STROOPS_PER_XLM));
}

export function fmtXlm(stroops: bigint | number | string, digits = 2): string {
  return stroopsToXlm(stroops).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export interface Odds {
  yesPct: number;
  noPct: number;
  yesDecimal: number;
  noDecimal: number;
  total: bigint;
}

/**
 * Pari-mutuel odds derived purely from the on-chain pools.
 *  - implied % = your side's pool / total pool
 *  - decimal odds = total pool / your side's pool  (payout multiple per unit)
 */
export function computeOdds(poolYes: bigint, poolNo: bigint): Odds {
  const total = poolYes + poolNo;
  if (total === 0n) {
    return { yesPct: 50, noPct: 50, yesDecimal: 0, noDecimal: 0, total: 0n };
  }
  const yesPct = Number((poolYes * 10000n) / total) / 100;
  const noPct = 100 - yesPct;
  const yesDecimal = poolYes === 0n ? 0 : Number((total * 1000n) / poolYes) / 1000;
  const noDecimal = poolNo === 0n ? 0 : Number((total * 1000n) / poolNo) / 1000;
  return { yesPct, noPct, yesDecimal, noDecimal, total };
}

/** Human countdown from a ledger delta (~5s/ledger). */
export function ledgersToCountdown(deltaLedgers: number): string {
  if (deltaLedgers <= 0) return "CLOSED";
  const secs = deltaLedgers * SECONDS_PER_LEDGER;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  const s = secs % 60;
  return `${m}m ${s}s`;
}
