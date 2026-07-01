"use client";

import { MarketState } from "@/lib/stellar";
import { fmtXlm, ledgersToCountdown } from "@/lib/format";

interface Props {
  market: MarketState;
  ledger: number;
  yourYes: bigint;
  yourNo: bigint;
}

export default function MarketCard({ market, ledger, yourYes, yourNo }: Props) {
  const remaining = market.closeLedger - ledger;
  const isOpen = !market.resolved && remaining > 0;

  const statusLabel = market.resolved
    ? `RESOLVED · ${market.outcome ? "YES" : "NO"}`
    : isOpen
      ? "OPEN"
      : "CLOSED";

  const statusClass = market.resolved
    ? market.outcome
      ? "border-yes/50 bg-yes/10 text-yes"
      : "border-no/50 bg-no/10 text-no"
    : isOpen
      ? "border-yes/40 bg-yes/5 text-yes"
      : "border-edge bg-panel text-muted";

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${statusClass}`}
        >
          {statusLabel}
        </span>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {isOpen ? "closes in" : "close ledger"}
          </div>
          <div className="font-mono text-sm text-white">
            {isOpen ? ledgersToCountdown(remaining) : `#${market.closeLedger}`}
          </div>
        </div>
      </div>

      <h1 className="text-xl font-bold leading-snug text-white sm:text-2xl">
        {market.question}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>ledger #{ledger || "…"}</span>
        <span>·</span>
        <span>{fmtXlm(market.poolYes + market.poolNo)} XLM total pool</span>
      </div>

      {(yourYes > 0n || yourNo > 0n) && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-edge pt-4 font-mono text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted">
              your YES
            </div>
            <div className="text-yes">{fmtXlm(yourYes)} XLM</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted">
              your NO
            </div>
            <div className="text-no">{fmtXlm(yourNo)} XLM</div>
          </div>
        </div>
      )}
    </div>
  );
}
