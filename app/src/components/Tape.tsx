"use client";

import { PariahEvent } from "@/lib/stellar";
import { STELLAR_EXPERT } from "@/lib/config";
import { fmtXlm, shortAddr } from "@/lib/format";

// Each tape row links to its own transaction on Stellar Expert when we have the
// hash (getEvents returns it), otherwise it's a plain row.
function RowShell({
  ev,
  children,
}: {
  ev: PariahEvent;
  children: React.ReactNode;
}) {
  const cls =
    "flex items-center gap-2 border-b border-edge/60 py-2 font-mono text-xs animate-slidein";
  if (ev.txHash) {
    return (
      <a
        href={`${STELLAR_EXPERT}/tx/${ev.txHash}`}
        target="_blank"
        rel="noreferrer"
        className={`${cls} transition hover:bg-white/5`}
        title="View transaction on Stellar Expert"
      >
        {children}
      </a>
    );
  }
  return <div className={cls}>{children}</div>;
}

function Row({ ev }: { ev: PariahEvent }) {
  if (ev.type === "bet") {
    const yes = ev.side;
    return (
      <RowShell ev={ev}>
        <span className={yes ? "text-yes" : "text-no"}>{yes ? "▲" : "▼"}</span>
        <span className="text-gray-300">{shortAddr(ev.address ?? "", 4)}</span>
        <span className="text-muted">staked</span>
        <span className="text-white">{fmtXlm(ev.amount ?? 0n)}</span>
        <span className="text-muted">on</span>
        <span className={`font-bold ${yes ? "text-yes" : "text-no"}`}>
          {yes ? "YES" : "NO"}
        </span>
        <span className="ml-auto text-muted">#{ev.ledger} ↗</span>
      </RowShell>
    );
  }
  if (ev.type === "resolve") {
    return (
      <RowShell ev={ev}>
        <span>⚑</span>
        <span className="text-muted">resolved</span>
        <span className={`font-bold ${ev.outcome ? "text-yes" : "text-no"}`}>
          {ev.outcome ? "YES" : "NO"}
        </span>
        <span className="ml-auto text-muted">#{ev.ledger} ↗</span>
      </RowShell>
    );
  }
  return (
    <RowShell ev={ev}>
      <span>💰</span>
      <span className="text-gray-300">{shortAddr(ev.address ?? "", 4)}</span>
      <span className="text-muted">claimed</span>
      <span className="text-yes">{fmtXlm(ev.amount ?? 0n)} XLM</span>
      <span className="ml-auto text-muted">#{ev.ledger} ↗</span>
    </RowShell>
  );
}

export default function Tape({ tape }: { tape: PariahEvent[] }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yes" />
          the tape · live
        </span>
        <span>getEvents · 4s poll</span>
      </div>

      <div className="max-h-[320px] overflow-y-auto pr-1">
        {tape.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">
            Listening for on-chain bets…
          </p>
        ) : (
          tape.map((ev) => <Row key={ev.id} ev={ev} />)
        )}
      </div>

      <a
        href={`${STELLAR_EXPERT}/contract/${process.env.NEXT_PUBLIC_CONTRACT_ID}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-[11px] text-muted underline decoration-dotted hover:text-white"
      >
        view contract on Stellar Expert ↗
      </a>
    </div>
  );
}
