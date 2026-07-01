"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEvents, getLatestLedger, PariahEvent } from "@/lib/stellar";

// Soroban has no websockets — the intended real-time pattern is to poll the RPC
// getEvents endpoint. We re-scan a rolling window every few seconds and dedupe
// by event id (ledger + index), so the TAPE stays live without duplicates.
export function useEvents(pollMs = 4000, windowLedgers = 5000) {
  const [tape, setTape] = useState<PariahEvent[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const latest = await getLatestLedger();
        const startLedger = Math.max(latest - windowLedgers, 1);
        const { events } = await fetchEvents(startLedger);
        if (cancelled) return;

        const fresh: PariahEvent[] = [];
        for (const ev of events) {
          if (seen.current.has(ev.id)) continue;
          seen.current.add(ev.id);
          fresh.push(ev);
        }
        if (fresh.length) {
          // events arrive oldest->newest; newest goes to the top of the tape.
          setTape((prev) => [...fresh.reverse(), ...prev].slice(0, 40));
        }
      } catch {
        /* transient RPC hiccup — try again next tick */
      } finally {
        if (!cancelled) timer = setTimeout(poll, pollMs);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs, windowLedgers]);

  return { tape };
}
