"use client";

import { shortAddr, fmtNum } from "@/lib/format";

interface Props {
  address: string | null;
  balance: number | null;
  connecting: boolean;
  isAdmin: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({
  address,
  balance,
  connecting,
  isAdmin,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <header className="flex flex-col gap-3 border-b border-edge pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">
            PARIAH
          </span>
          <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
            testnet
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Bet against the crowd. The pool doesn&apos;t lie.
        </p>
      </div>

      {address ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-sm text-white">
              {isAdmin && (
                <span className="rounded bg-yes/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yes">
                  admin
                </span>
              )}
              <span className="font-mono">{shortAddr(address)}</span>
            </div>
            <div className="font-mono text-xs text-muted">
              {balance === null ? "…" : `${fmtNum(balance)} XLM`}
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="rounded-lg border border-edge px-3 py-2 text-xs text-muted transition hover:border-no/60 hover:text-no"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={connecting}
          className="rounded-lg border border-yes/60 bg-yes/10 px-4 py-2 text-sm font-semibold text-yes shadow-yes transition hover:bg-yes/20 disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
    </header>
  );
}
