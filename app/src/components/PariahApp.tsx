"use client";

import { useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useMarket } from "@/hooks/useMarket";
import { useEvents } from "@/hooks/useEvents";
import { useTxFlow } from "@/hooks/useTxFlow";
import { ToastProvider, useToast } from "@/components/Toast";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import ToteBoard from "@/components/ToteBoard";
import BetPanel from "@/components/BetPanel";
import TxTracker from "@/components/TxTracker";
import Tape from "@/components/Tape";
import AdminPanel from "@/components/AdminPanel";
import ClaimPanel from "@/components/ClaimPanel";
import { buildBetTx, buildResolveTx, buildClaimTx } from "@/lib/stellar";
import { xlmToStroops } from "@/lib/format";
import { decodeContractError } from "@/lib/errors";
import { isConfigured, CONTRACT_ID, STELLAR_EXPERT } from "@/lib/config";

function Shell() {
  const toast = useToast();
  const { address, balance, connecting, connect, disconnect, isAdmin, refreshBalance, sign } =
    useWallet();
  const { market, ledger, yourYes, yourNo, claimed, loading, error, refresh } =
    useMarket(address);
  const { tape } = useEvents();
  const { status, run, reset } = useTxFlow(sign);

  const busy =
    status.phase === "building" ||
    status.phase === "signing" ||
    status.phase === "submitting" ||
    status.phase === "pending";

  const onConnect = useCallback(async () => {
    try {
      await connect();
      toast.push("success", "Wallet connected.");
    } catch (e) {
      toast.push("error", decodeContractError(e));
    }
  }, [connect, toast]);

  const afterWrite = useCallback(
    (verb: string) => (hash: string) => {
      toast.push("success", `${verb} confirmed.`);
      refresh();
      refreshBalance(address);
    },
    [toast, refresh, refreshBalance, address],
  );

  const onBet = useCallback(
    async (side: boolean, amountXlm: number) => {
      if (!address) return onConnect();
      const label = `Bet ${amountXlm} XLM on ${side ? "YES" : "NO"}`;
      const final = await run(
        label,
        address,
        () => buildBetTx(address, side, xlmToStroops(amountXlm)),
        afterWrite("Bet"),
      );
      if (final.phase === "failed") toast.push("error", final.error ?? "Bet failed.");
    },
    [address, run, afterWrite, onConnect, toast],
  );

  const onResolve = useCallback(
    async (outcome: boolean) => {
      if (!address) return;
      const final = await run(
        `Resolve ${outcome ? "YES" : "NO"}`,
        address,
        () => buildResolveTx(address, outcome),
        afterWrite("Resolution"),
      );
      if (final.phase === "failed") toast.push("error", final.error ?? "Resolve failed.");
    },
    [address, run, afterWrite, toast],
  );

  const onClaim = useCallback(async () => {
    if (!address) return;
    const final = await run(
      "Claim winnings",
      address,
      () => buildClaimTx(address),
      afterWrite("Claim"),
    );
    if (final.phase === "failed") toast.push("error", final.error ?? "Claim failed.");
  }, [address, run, afterWrite, toast]);

  if (!isConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-white">PARIAH</h1>
        <p className="mt-3 text-sm text-no">
          NEXT_PUBLIC_CONTRACT_ID is not set. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and fill in the deployed contract id.
        </p>
      </div>
    );
  }

  const isOpen = !!market && !market.resolved && market.closeLedger > ledger;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <Header
        address={address}
        balance={balance}
        connecting={connecting}
        isAdmin={isAdmin}
        onConnect={onConnect}
        onDisconnect={disconnect}
      />

      {error && !market && (
        <div className="mt-6 rounded-xl border border-no/40 bg-no/5 p-4 text-sm text-no">
          Couldn&apos;t reach the contract: {error}
          <button
            onClick={refresh}
            className="ml-2 underline decoration-dotted hover:text-white"
          >
            retry
          </button>
        </div>
      )}

      {loading && !market ? (
        <div className="mt-10 text-center font-mono text-sm text-muted">
          loading market…
        </div>
      ) : market ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <MarketCard
              market={market}
              ledger={ledger}
              yourYes={yourYes}
              yourNo={yourNo}
            />
            <ToteBoard poolYes={market.poolYes} poolNo={market.poolNo} />
            {!market.resolved && (
              <BetPanel
                connected={!!address}
                isOpen={isOpen}
                balance={balance}
                busy={busy}
                onConnect={onConnect}
                onBet={onBet}
              />
            )}
            {address && (
              <ClaimPanel
                market={market}
                yourYes={yourYes}
                yourNo={yourNo}
                claimed={claimed}
                busy={busy}
                onClaim={onClaim}
              />
            )}
            {isAdmin && (
              <AdminPanel
                market={market}
                ledger={ledger}
                busy={busy}
                onResolve={onResolve}
              />
            )}
          </div>

          <div className="flex flex-col gap-4">
            <TxTracker status={status} onReset={reset} />
            <Tape tape={tape} />
          </div>
        </div>
      ) : null}

      <footer className="mt-10 border-t border-edge pt-4 text-center font-mono text-[11px] text-muted">
        <a
          href={`${STELLAR_EXPERT}/contract/${CONTRACT_ID}`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted hover:text-white"
        >
          {CONTRACT_ID}
        </a>
        <div className="mt-1">pari-mutuel · soroban · stellar testnet</div>
      </footer>
    </div>
  );
}

export default function PariahApp() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
