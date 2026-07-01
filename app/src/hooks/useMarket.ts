"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readMarket,
  readStake,
  readHasClaimed,
  getLatestLedger,
  MarketState,
} from "@/lib/stellar";

export interface MarketView {
  market: MarketState | null;
  ledger: number;
  yourYes: bigint;
  yourNo: bigint;
  claimed: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarket(address: string | null, pollMs = 5000): MarketView {
  const [market, setMarket] = useState<MarketState | null>(null);
  const [ledger, setLedger] = useState<number>(0);
  const [yourYes, setYourYes] = useState<bigint>(0n);
  const [yourNo, setYourNo] = useState<bigint>(0n);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [m, latest] = await Promise.all([readMarket(), getLatestLedger()]);
      setMarket(m);
      setLedger(latest);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market");
    } finally {
      setLoading(false);
    }

    if (address) {
      try {
        const [y, n, c] = await Promise.all([
          readStake(address, true),
          readStake(address, false),
          readHasClaimed(address),
        ]);
        setYourYes(y);
        setYourNo(n);
        setClaimed(c);
      } catch {
        /* keep last known position */
      }
    } else {
      setYourYes(0n);
      setYourNo(0n);
      setClaimed(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { market, ledger, yourYes, yourNo, claimed, loading, error, refresh };
}
