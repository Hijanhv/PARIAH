"use client";

import { STELLAR_EXPERT } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { TxPhase, TxStatus } from "@/hooks/useTxFlow";

const STEPS: { key: TxPhase; label: string }[] = [
  { key: "building", label: "Build" },
  { key: "signing", label: "Sign" },
  { key: "submitting", label: "Submit" },
  { key: "pending", label: "Confirm" },
];

const ORDER: TxPhase[] = [
  "building",
  "signing",
  "submitting",
  "pending",
  "success",
];

interface Props {
  status: TxStatus;
  onReset: () => void;
}

export default function TxTracker({ status, onReset }: Props) {
  if (status.phase === "idle") return null;

  const activeIdx = ORDER.indexOf(status.phase);
  const isDone = status.phase === "success";
  const isFail = status.phase === "failed";

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted">
          {status.label ?? "transaction"}
        </span>
        {(isDone || isFail) && (
          <button
            onClick={onReset}
            className="text-[11px] uppercase tracking-widest text-muted hover:text-white"
          >
            dismiss
          </button>
        )}
      </div>

      {/* stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const stepIdx = ORDER.indexOf(step.key);
          const reached = activeIdx >= stepIdx || isDone;
          const current = status.phase === step.key;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-1">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition ${
                    isFail && current
                      ? "bg-no"
                      : reached
                        ? "bg-yes"
                        : "bg-edge"
                  } ${current && !isFail ? "animate-pulse" : ""}`}
                />
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    current ? "text-white" : reached ? "text-yes/70" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* status line */}
      <div className="mt-3 text-sm">
        {isDone && (
          <span className="text-yes">✓ Confirmed on-chain.</span>
        )}
        {isFail && (
          <span className="text-no">✕ {status.error ?? "Transaction failed."}</span>
        )}
        {!isDone && !isFail && (
          <span className="text-gray-300">
            {status.phase === "signing"
              ? "Waiting for you to sign in your wallet…"
              : status.phase === "pending"
                ? "Waiting for network confirmation…"
                : status.phase === "building"
                  ? "Simulating & building transaction…"
                  : "Submitting to the network…"}
          </span>
        )}
      </div>

      {status.hash && (
        <a
          href={`${STELLAR_EXPERT}/tx/${status.hash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-muted underline decoration-dotted hover:text-white"
        >
          {shortAddr(status.hash, 8)} ↗ Stellar Expert
        </a>
      )}
    </div>
  );
}
