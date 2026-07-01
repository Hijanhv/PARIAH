"use client";

import { MarketState } from "@/lib/stellar";

interface Props {
  market: MarketState;
  ledger: number;
  busy: boolean;
  onResolve: (outcome: boolean) => void;
}

export default function AdminPanel({ market, ledger, busy, onResolve }: Props) {
  const canResolve = !market.resolved && ledger >= market.closeLedger;
  const beforeClose = !market.resolved && ledger < market.closeLedger;

  return (
    <div className="rounded-xl border border-dashed border-yes/30 bg-yes/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-yes/70">
        <span>◈ admin · resolve market</span>
      </div>

      {market.resolved ? (
        <p className="text-sm text-muted">
          Resolved as{" "}
          <span className={market.outcome ? "text-yes" : "text-no"}>
            {market.outcome ? "YES" : "NO"}
          </span>
          . Winners can now claim.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            {beforeClose
              ? `Market closes at ledger #${market.closeLedger} (now #${ledger}). Resolution unlocks after close.`
              : "Market has closed. Declare the winning outcome."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onResolve(true)}
              disabled={!canResolve || busy}
              className="rounded-lg border border-yes/60 bg-yes/10 py-2.5 text-sm font-bold text-yes transition hover:bg-yes/20 disabled:opacity-40"
            >
              Resolve YES
            </button>
            <button
              onClick={() => onResolve(false)}
              disabled={!canResolve || busy}
              className="rounded-lg border border-no/60 bg-no/10 py-2.5 text-sm font-bold text-no transition hover:bg-no/20 disabled:opacity-40"
            >
              Resolve NO
            </button>
          </div>
        </>
      )}
    </div>
  );
}
