"use client";

import { useCallback, useState } from "react";
import { submitSignedTx, pollTx } from "@/lib/stellar";
import { decodeContractError } from "@/lib/errors";

export type TxPhase =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "pending"
  | "success"
  | "failed";

export interface TxStatus {
  phase: TxPhase;
  label?: string;
  hash?: string;
  error?: string;
}

function extractFailure(): string {
  return "Transaction failed on-chain — the market state may have changed. Refresh and retry.";
}

export function useTxFlow(sign: (xdr: string, address: string) => Promise<string>) {
  const [status, setStatus] = useState<TxStatus>({ phase: "idle" });
  const reset = useCallback(() => setStatus({ phase: "idle" }), []);

  const run = useCallback(
    async (
      label: string,
      address: string,
      build: () => Promise<string>,
      onSuccess?: (hash: string) => void,
    ): Promise<TxStatus> => {
      let hash: string | undefined;
      try {
        // IDLE -> BUILDING (simulate + assemble; contract errors throw here)
        setStatus({ phase: "building", label });
        const unsignedXdr = await build();

        // -> SIGNING (waiting on the wallet)
        setStatus({ phase: "signing", label });
        const signedXdr = await sign(unsignedXdr, address);

        // -> SUBMITTING
        setStatus({ phase: "submitting", label });
        hash = await submitSignedTx(signedXdr);

        // -> PENDING (poll getTransaction)
        setStatus({ phase: "pending", label, hash });
        const outcome = await pollTx(hash);

        const final: TxStatus =
          outcome.status === "SUCCESS"
            ? { phase: "success", label, hash }
            : { phase: "failed", label, hash, error: extractFailure() };
        setStatus(final);
        if (final.phase === "success") onSuccess?.(hash);
        return final;
      } catch (e) {
        const final: TxStatus = {
          phase: "failed",
          label,
          hash,
          error: decodeContractError(e),
        };
        setStatus(final);
        return final;
      }
    },
    [sign],
  );

  return { status, run, reset };
}
