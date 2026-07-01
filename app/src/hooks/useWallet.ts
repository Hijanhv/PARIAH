"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWallet, signTx } from "@/lib/wallet";
import { fetchXlmBalance } from "@/lib/stellar";
import { ADMIN_ADDRESS } from "@/lib/config";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  const refreshBalance = useCallback(
    async (addr?: string | null) => {
      const a = addr ?? address;
      if (!a) return;
      try {
        setBalance(await fetchXlmBalance(a));
      } catch {
        /* transient — keep last known */
      }
    },
    [address],
  );

  // Poll balance while connected so bets/claims reflect quickly.
  useEffect(() => {
    if (!address) return;
    refreshBalance(address);
    const id = setInterval(() => refreshBalance(address), 10000);
    return () => clearInterval(id);
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      await refreshBalance(addr);
      return addr;
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
  }, []);

  const isAdmin = !!address && address === ADMIN_ADDRESS;

  return {
    address,
    balance,
    connecting,
    connect,
    disconnect,
    refreshBalance,
    isAdmin,
    sign: signTx,
  };
}
