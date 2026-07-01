// Maps raw simulation / submission errors into user-facing copy. The four
// buckets the Yellow Belt rubric asks for are all represented here:
//   1. wallet not installed / not connected / rejected
//   2. insufficient balance
//   3. market closed / already resolved (contract errors)
//   4. RPC / simulation / network failure

const CONTRACT_ERRORS: Record<number, string> = {
  1: "Market already initialized.",
  2: "Market not initialized.",
  3: "This market is closed — betting has ended.",
  4: "This market has already been resolved.",
  5: "Market isn't resolved yet — no payouts available.",
  6: "Bet amount must be greater than zero.",
  7: "You've already claimed your winnings.",
  8: "Only the admin can do that.",
  9: "You have nothing to claim on the winning side.",
  10: "Too early — the market hasn't closed yet.",
};

export function decodeContractError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");

  // Contract-defined errors surface as `Error(Contract, #N)` in diagnostics.
  const contractMatch = msg.match(/Error\(Contract,\s*#(\d+)\)/) ?? msg.match(/#(\d+)\b/);
  if (contractMatch) {
    const code = Number(contractMatch[1]);
    if (CONTRACT_ERRORS[code]) return CONTRACT_ERRORS[code];
  }

  if (/no wallet|not installed|WalletNotInstalled|is not installed/i.test(msg))
    return "That wallet isn't installed. Try Freighter, xBull, Albedo or Lobstr.";
  if (/cancel|declined|rejected|denied|closed the modal|User rejected/i.test(msg))
    return "You cancelled / rejected the request in your wallet.";
  if (/insufficient|underflow|balance|txINSUFFICIENT/i.test(msg))
    return "Insufficient XLM balance for this transaction.";
  if (/Failed to fetch|NetworkError|SendRequest|ECONNREFUSED|timeout|timed out|fetch failed/i.test(msg))
    return "Network error talking to the Stellar RPC. Please retry.";

  return msg.length > 180 ? msg.slice(0, 180) + "…" : msg;
}

export class InsufficientBalanceError extends Error {
  constructor(need: number, have: number) {
    super(
      `Insufficient balance: you need ${need.toFixed(2)} XLM but only have ${have.toFixed(2)} XLM.`,
    );
    this.name = "InsufficientBalanceError";
  }
}

export class MarketClosedError extends Error {
  constructor() {
    super("This market is closed — betting has ended.");
    this.name = "MarketClosedError";
  }
}
