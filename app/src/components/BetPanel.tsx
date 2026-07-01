"use client";

import { useState } from "react";
import { fmtNum } from "@/lib/format";

interface Props {
  connected: boolean;
  isOpen: boolean;
  balance: number | null;
  busy: boolean;
  onConnect: () => void;
  onBet: (side: boolean, amountXlm: number) => void;
}

const QUICK = [10, 50, 100];
const FEE_BUFFER = 1.5; // keep a little XLM for base reserve + fees

export default function BetPanel({
  connected,
  isOpen,
  balance,
  busy,
  onConnect,
  onBet,
}: Props) {
  const [side, setSide] = useState<boolean>(true); // true = YES
  const [amount, setAmount] = useState<string>("");

  const amt = parseFloat(amount);
  const maxBet = Math.max(0, (balance ?? 0) - FEE_BUFFER);

  let error: string | null = null;
  if (amount !== "" && (isNaN(amt) || amt <= 0)) error = "Enter an amount greater than 0.";
  else if (connected && amt > maxBet) error = "Insufficient balance (keep ~1.5 XLM for fees).";

  const canSubmit =
    connected && isOpen && !busy && !error && amount !== "" && amt > 0;

  function submit() {
    if (!connected) return onConnect();
    if (!canSubmit) return;
    onBet(side, amt);
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">
        place your bet
      </div>

      {/* side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide(true)}
          className={`rounded-lg border py-3 text-lg font-black tracking-wide transition ${
            side
              ? "border-yes bg-yes/15 text-yes shadow-yes"
              : "border-edge text-muted hover:border-yes/40 hover:text-yes/80"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setSide(false)}
          className={`rounded-lg border py-3 text-lg font-black tracking-wide transition ${
            !side
              ? "border-no bg-no/15 text-no shadow-no"
              : "border-edge text-muted hover:border-no/40 hover:text-no/80"
          }`}
        >
          NO
        </button>
      </div>

      {/* amount */}
      <div className="mt-3">
        <div className="flex items-center rounded-lg border border-edge bg-ink px-3 focus-within:border-gray-500">
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent py-3 font-mono text-lg text-white outline-none placeholder:text-muted"
          />
          <span className="font-mono text-sm text-muted">XLM</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="rounded border border-edge px-2.5 py-1 font-mono text-xs text-muted hover:border-gray-500 hover:text-white"
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => setAmount(maxBet > 0 ? String(Math.floor(maxBet)) : "")}
            disabled={!connected}
            className="rounded border border-edge px-2.5 py-1 font-mono text-xs text-muted hover:border-gray-500 hover:text-white disabled:opacity-40"
          >
            max
          </button>
          <span className="ml-auto font-mono text-xs text-muted">
            bal {balance === null ? "…" : `${fmtNum(balance)}`}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-no">{error}</p>}

      {/* submit */}
      <button
        onClick={submit}
        disabled={connected && (!canSubmit || busy)}
        className={`mt-3 w-full rounded-lg py-3 text-sm font-bold uppercase tracking-widest transition disabled:opacity-40 ${
          side
            ? "bg-yes text-ink hover:bg-yes/90"
            : "bg-no text-white hover:bg-no/90"
        }`}
      >
        {!connected
          ? "Connect Wallet to Bet"
          : !isOpen
            ? "Market Closed"
            : busy
              ? "Working…"
              : `Stake ${amount || "0"} XLM on ${side ? "YES" : "NO"}`}
      </button>
    </div>
  );
}
