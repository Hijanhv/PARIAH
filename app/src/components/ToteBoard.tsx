"use client";

import { useEffect, useRef, useState } from "react";
import { computeOdds, fmtNum, fmtXlm } from "@/lib/format";

interface Props {
  poolYes: bigint;
  poolNo: bigint;
}

// A racetrack tote board: implied odds derived live from the pools, animating
// on change, with a 🔥 STEAM flash when a side's implied % jumps >5 points in
// one update (betting slang for a fast line move).
export default function ToteBoard({ poolYes, poolNo }: Props) {
  const odds = computeOdds(poolYes, poolNo);
  const prev = useRef<{ yesPct: number } | null>(null);
  const [steam, setSteam] = useState<null | "yes" | "no">(null);

  useEffect(() => {
    const prevYes = prev.current?.yesPct;
    if (prevYes != null) {
      const delta = odds.yesPct - prevYes;
      if (Math.abs(delta) >= 5) {
        setSteam(delta > 0 ? "yes" : "no");
        const t = setTimeout(() => setSteam(null), 1400);
        prev.current = { yesPct: odds.yesPct };
        return () => clearTimeout(t);
      }
    }
    prev.current = { yesPct: odds.yesPct };
  }, [odds.yesPct]);

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted">
        <span>tote board · live odds</span>
        <span className="font-mono">{fmtXlm(odds.total)} XLM pooled</span>
      </div>

      {/* the bar */}
      <div className="relative h-11 w-full overflow-hidden rounded-lg border border-edge bg-ink">
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start bg-yes/20 transition-[width] duration-700 ease-out ${
            steam === "yes" ? "animate-steam" : ""
          }`}
          style={{ width: `${odds.yesPct}%` }}
        >
          <span className="whitespace-nowrap pl-3 font-mono text-sm font-bold text-yes">
            YES {fmtNum(odds.yesPct, 1)}%
          </span>
        </div>
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end bg-no/20 transition-[width] duration-700 ease-out ${
            steam === "no" ? "animate-steam" : ""
          }`}
          style={{ width: `${odds.noPct}%` }}
        >
          <span className="whitespace-nowrap pr-3 font-mono text-sm font-bold text-no">
            {fmtNum(odds.noPct, 1)}% NO
          </span>
        </div>

        {steam && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-flash rounded-full bg-black/70 px-3 py-1 text-sm font-black tracking-wider text-white">
              🔥 STEAM · {steam.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* decimal odds + pools */}
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
        <div className="rounded-lg border border-yes/30 bg-yes/5 p-3">
          <div className="text-[11px] uppercase tracking-widest text-yes/70">
            YES pays
          </div>
          <div className="text-xl font-bold text-yes">
            {odds.yesDecimal ? `${fmtNum(odds.yesDecimal, 2)}×` : "—"}
          </div>
          <div className="text-[11px] text-muted">
            {fmtXlm(poolYes)} XLM staked
          </div>
        </div>
        <div className="rounded-lg border border-no/30 bg-no/5 p-3 text-right">
          <div className="text-[11px] uppercase tracking-widest text-no/70">
            NO pays
          </div>
          <div className="text-xl font-bold text-no">
            {odds.noDecimal ? `${fmtNum(odds.noDecimal, 2)}×` : "—"}
          </div>
          <div className="text-[11px] text-muted">
            {fmtXlm(poolNo)} XLM staked
          </div>
        </div>
      </div>
    </div>
  );
}
