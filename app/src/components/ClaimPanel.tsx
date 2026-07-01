"use client";

import { MarketState } from "@/lib/stellar";
import { computeOdds, fmtNum, fmtXlm, stroopsToXlm } from "@/lib/format";

interface Props {
  market: MarketState;
  yourYes: bigint;
  yourNo: bigint;
  claimed: boolean;
  busy: boolean;
  onClaim: () => void;
}

export default function ClaimPanel({
  market,
  yourYes,
  yourNo,
  claimed,
  busy,
  onClaim,
}: Props) {
  if (!market.resolved) return null;

  const winningStake = market.outcome ? yourYes : yourNo;
  const won = winningStake > 0n;
  const odds = computeOdds(market.poolYes, market.poolNo);
  const winningPool = market.outcome ? market.poolYes : market.poolNo;
  const total = market.poolYes + market.poolNo;
  const payout =
    winningPool > 0n ? (winningStake * total) / winningPool : 0n;

  return (
    <div className="rounded-xl border border-yes/40 bg-yes/[0.04] p-4">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-yes/70">
        payout
      </div>

      {!won ? (
        <p className="text-sm text-muted">
          Market resolved{" "}
          <span className={market.outcome ? "text-yes" : "text-no"}>
            {market.outcome ? "YES" : "NO"}
          </span>
          . No winning position to claim.
        </p>
      ) : claimed ? (
        <p className="text-sm text-yes">✓ Winnings claimed. GG.</p>
      ) : (
        <>
          <div className="mb-3 flex items-end justify-between font-mono">
            <div>
              <div className="text-[11px] text-muted">your payout</div>
              <div className="text-2xl font-bold text-yes">
                {fmtXlm(payout)} XLM
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div>
                staked {fmtNum(stroopsToXlm(winningStake))} @{" "}
                {fmtNum(market.outcome ? odds.yesDecimal : odds.noDecimal, 2)}×
              </div>
            </div>
          </div>
          <button
            onClick={onClaim}
            disabled={busy}
            className="w-full rounded-lg bg-yes py-3 text-sm font-bold uppercase tracking-widest text-ink transition hover:bg-yes/90 disabled:opacity-40"
          >
            {busy ? "Claiming…" : "Claim Winnings"}
          </button>
        </>
      )}
    </div>
  );
}
